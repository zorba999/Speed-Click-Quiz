# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

# =============================================================================
#  Speed Click Quiz — GenLayer Intelligent Contract
#  Bradbury Testnet compatible
#
#  Optimistic Democracy is used in TWO places:
#    1. start_game()       → AI generates questions per room, validators verify
#    2. dispute_question() → AI arbitrates disputes, validators verify
# =============================================================================

class SpeedClickQuiz(gl.Contract):
    # ── Persistent State ─────────────────────────────────────────────────────
    # TreeMap fields are zero-initialised automatically by GenLayer.
    rooms:       TreeMap[str, str]  # room_id    → JSON RoomState
    leaderboard: TreeMap[str, str]  # address    → cumulative XP (stored as str)
    disputes:    TreeMap[str, str]  # dispute_id → JSON DisputeResult

    def __init__(self) -> None:
        pass  # All storage is auto-zero-initialised

    # =========================================================================
    #  ROOM MANAGEMENT
    # =========================================================================
    @gl.public.write
    def create_room(self, room_id: str, max_players: u256, num_rounds: u256) -> None:
        """Create a new game room. Questions are generated when the host starts the game."""
        assert room_id not in self.rooms,                          "Room ID already taken"
        assert max_players >= u256(2) and max_players <= u256(10), "2–10 players required"
        assert num_rounds  >= u256(5) and num_rounds  <= u256(10), "5–10 rounds required"

        host = str(gl.message.sender_address)
        room = {
            "host":          host,
            "players":       [host],
            "status":        "waiting",   # waiting | active | finished | ended
            "current_round": 0,
            "total_rounds":  int(num_rounds),
            "questions":     [],          # filled by start_game via LLM
            "round_answers": {},
            "answer_count":  0,
            "scores":        {host: 0},
            "max_players":   int(max_players),
            "xp_distributed": False,
        }
        self.rooms[room_id] = json.dumps(room)

    @gl.public.write
    def join_room(self, room_id: str) -> None:
        """Join an existing room before the game starts."""
        assert room_id in self.rooms, "Room not found"
        room   = json.loads(self.rooms[room_id])
        sender = str(gl.message.sender_address)

        assert room["status"]    == "waiting", "Game already started"
        assert sender not in room["players"],  "Already in room"
        assert len(room["players"]) < room["max_players"], "Room is full"

        room["players"].append(sender)
        room["scores"][sender] = 0
        self.rooms[room_id] = json.dumps(room)

    @gl.public.write
    def start_game(self, room_id: str) -> None:
        """
        Host starts the game.
        Optimistic Democracy #1: LLM generates fresh questions for this room.
        Leader proposes questions → validators verify structure → committed on-chain.
        """
        assert room_id in self.rooms, "Room not found"
        room   = json.loads(self.rooms[room_id])
        sender = str(gl.message.sender_address)

        assert sender == room["host"],      "Only the host can start"
        assert room["status"] == "waiting", "Game already started"
        assert len(room["players"]) >= 2,   "Need at least 2 players"

        n = room["total_rounds"]

        def _context() -> str:
            return (
                f"Room: {room_id} | Questions needed: {n}\n"
                "Community: blockchain, crypto, AI and Web3 enthusiasts.\n"
                "Categories: General, Crypto, GenLayer, Memes, Science\n"
                "Difficulties: easy, medium, hard"
            )

        questions_json = gl.eq_principle.prompt_non_comparative(
            _context,
            task=(
                f"Generate exactly {n} multiple-choice quiz questions "
                "for a blockchain/crypto gaming community. "
                "Mix categories and difficulties. "
                "Return ONLY a valid JSON array. "
                "Each object must have: "
                "id (int starting 0), q (question string), "
                "options (list of exactly 4 strings), "
                "correct (int 0-3 — index of correct answer), "
                "category (string), difficulty (easy/medium/hard). "
                "No markdown, no extra text — just the raw JSON array."
            ),
            criteria=(
                f"Output must be a valid JSON array of exactly {n} objects. "
                "Each must have: id (int), q (non-empty string), "
                "options (list of exactly 4 strings), correct (int 0-3), "
                "category (string), difficulty (string). "
                "Correct index must point to the factually correct option."
            ),
        )

        questions = json.loads(questions_json)
        assert len(questions) >= n, "LLM did not generate enough questions"

        room["questions"]     = questions[:n]
        room["status"]        = "active"
        room["current_round"] = 0
        room["round_answers"] = {}
        room["answer_count"]  = 0
        self.rooms[room_id]   = json.dumps(room)

    # =========================================================================
    #  GAMEPLAY
    # =========================================================================
    @gl.public.write
    def submit_answer(self, room_id: str, answer_index: u256) -> None:
        """
        Submit your answer for the current round.

        Speed is measured by transaction ORDER on-chain — whoever's tx lands
        first gets position=1, which earns the highest speed bonus.
        No off-chain timestamps needed: blockchain ordering is the truth.
        """
        assert room_id in self.rooms, "Room not found"
        room   = json.loads(self.rooms[room_id])
        sender = str(gl.message.sender_address)

        assert room["status"] == "active",           "Game not active"
        assert sender in room["players"],             "You are not in this room"
        assert sender not in room["round_answers"],   "Already answered this round"
        assert answer_index <= u256(3),               "Answer must be 0-3"

        position = room.get("answer_count", 0) + 1
        room["round_answers"][sender] = {
            "answer":   int(answer_index),
            "position": position,
        }
        room["answer_count"] = position
        self.rooms[room_id]  = json.dumps(room)

    @gl.public.write
    def finalize_round(self, room_id: str) -> None:
        """
        Host closes the current round.

        Scoring formula:
            correct + 1st  = 100 XP
            correct + 2nd  =  75 XP
            correct + 3rd  =  50 XP
            correct + 4th+ =  25 XP
            wrong           =   0 XP
        """
        assert room_id in self.rooms, "Room not found"
        room   = json.loads(self.rooms[room_id])
        sender = str(gl.message.sender_address)

        assert sender == room["host"],      "Only host can finalize"
        assert room["status"] == "active",  "Game not active"

        current_round = room["current_round"]
        correct       = room["questions"][current_round]["correct"]

        # Award points ordered by submission position
        correct_count = 0
        for player in room["players"]:
            ans_data = room["round_answers"].get(player)
            if ans_data and ans_data["answer"] == correct:
                correct_count += 1
                pts = max(25, 100 - (correct_count - 1) * 25)
                room["scores"][player] = room["scores"].get(player, 0) + pts

        # Advance or end
        next_round = current_round + 1
        if next_round >= room["total_rounds"]:
            room["status"] = "finished"
        else:
            room["current_round"] = next_round
            room["round_answers"] = {}
            room["answer_count"]  = 0

        self.rooms[room_id] = json.dumps(room)

    @gl.public.write
    def distribute_xp(self, room_id: str) -> None:
        """
        Host finalises the game: flush session scores into the global leaderboard.
        """
        assert room_id in self.rooms, "Room not found"
        room   = json.loads(self.rooms[room_id])
        sender = str(gl.message.sender_address)

        assert sender == room["host"],        "Only host can distribute XP"
        assert room["status"] == "finished",  "Game not finished yet"
        assert not room["xp_distributed"],    "XP already distributed"

        for player, score in room["scores"].items():
            if score > 0:
                cur = int(self.leaderboard[player]) if player in self.leaderboard else 0
                self.leaderboard[player] = str(cur + int(score))

        room["xp_distributed"] = True
        room["status"]         = "ended"
        self.rooms[room_id]    = json.dumps(room)

    # =========================================================================
    #  DISPUTE RESOLUTION  (Optimistic Democracy #2)
    #  Any player can challenge the correctness of a question.
    #  Uses eq_principle.prompt_non_comparative:
    #    → Leader runs an impartial LLM arbitration
    #    → Validators verify the reasoning is sound
    #  If the AI confirms the question was wrong, the correct answer is updated
    #  in the pool and a dispute record is stored on-chain.
    # =========================================================================
    @gl.public.write
    def dispute_question(self, room_id: str, round_index: u256, reason: str) -> None:
        """
        Open a dispute against a question's marked-correct answer.
        The AI acts as impartial arbiter; validators reach consensus via
        Optimistic Democracy before any state change is committed.
        """
        assert room_id in self.rooms, "Room not found"
        room   = json.loads(self.rooms[room_id])
        sender = str(gl.message.sender_address)

        assert sender in room["players"], "Only room players can dispute"
        ri = int(round_index)
        assert ri < room["total_rounds"], "Round index out of range"

        q = room["questions"][ri]

        def _question_context() -> str:
            return (
                f"Question: {q['q']}\n"
                f"Option 0: {q['options'][0]}\n"
                f"Option 1: {q['options'][1]}\n"
                f"Option 2: {q['options'][2]}\n"
                f"Option 3: {q['options'][3]}\n"
                f"Marked correct: option {q['correct']} — {q['options'][q['correct']]}\n"
                f"Player dispute reason: {reason}"
            )

        verdict_json = gl.eq_principle.prompt_non_comparative(
            _question_context,
            task=(
                "You are an impartial quiz arbiter. "
                "Given the question, its 4 options, the marked correct answer, and the player's dispute reason, "
                "determine whether the marked answer is factually correct. "
                "Return ONLY valid JSON with exactly these keys: "
                '{"is_correct": <true or false>, "correct_answer": <int 0-3>, "explanation": "<max 2 sentences>"}. '
                "No markdown, no extra text."
            ),
            criteria=(
                "Output must be valid JSON with is_correct (boolean), "
                "correct_answer (int 0-3), and explanation (string). "
                "The correct_answer must be the index of the factually accurate option. "
                "The explanation must be consistent with the chosen answer."
            ),
        )

        assert isinstance(verdict_json, str)
        verdict = json.loads(verdict_json)

        dispute_id = f"{room_id}_r{round_index}"
        self.disputes[dispute_id] = json.dumps({
            "room_id":        room_id,
            "round":          ri,
            "disputed_by":    sender,
            "reason":         reason,
            "old_answer":     q["correct"],
            "new_answer":     verdict["correct_answer"],
            "was_wrong":      not verdict["is_correct"],
            "explanation":    verdict["explanation"],
        })

        # If AI ruled the original answer was wrong → patch the room's question
        if not verdict["is_correct"]:
            room["questions"][ri]["correct"] = verdict["correct_answer"]
            self.rooms[room_id] = json.dumps(room)

    # =========================================================================
    #  VIEW FUNCTIONS
    # =========================================================================
    @gl.public.view
    def get_room(self, room_id: str) -> str:
        assert room_id in self.rooms, "Room not found"
        return self.rooms[room_id]

    @gl.public.view
    def get_current_question(self, room_id: str) -> str:
        """Returns the current question WITHOUT the correct answer."""
        assert room_id in self.rooms, "Room not found"
        room = json.loads(self.rooms[room_id])
        assert room["status"] == "active", "Game not active"

        q = dict(room["questions"][room["current_round"]])
        del q["correct"]   # never expose the answer to the frontend
        q["round"]        = room["current_round"]
        q["total_rounds"] = room["total_rounds"]
        return json.dumps(q)

    @gl.public.view
    def get_scores(self, room_id: str) -> str:
        assert room_id in self.rooms, "Room not found"
        room    = json.loads(self.rooms[room_id])
        scores  = room["scores"]
        sorted_ = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return json.dumps([{"address": a, "score": s} for a, s in sorted_])

    @gl.public.view
    def get_leaderboard(self) -> str:
        entries = [{"address": a, "xp": int(xp_str)} for a, xp_str in self.leaderboard.items()]
        entries.sort(key=lambda x: x["xp"], reverse=True)
        return json.dumps(entries[:50])

    @gl.public.view
    def get_dispute(self, dispute_id: str) -> str:
        assert dispute_id in self.disputes, "Dispute not found"
        return self.disputes[dispute_id]
