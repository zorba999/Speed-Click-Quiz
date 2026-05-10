export default function Stepper({ value, setValue, min, max }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => setValue(Math.max(min, value - 1))}>−</button>
      <span className="stepper-val">{value}</span>
      <button type="button" onClick={() => setValue(Math.min(max, value + 1))}>+</button>
    </div>
  )
}
