import { useMemo } from 'react'

export default function Avatar({ addr, size = 36, name = '' }) {
  const seed = useMemo(() => {
    const src = addr || name || 'x'
    let h = 0
    for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) | 0
    return Math.abs(h)
  }, [addr, name])

  const hue1 = seed % 360
  const hue2 = (hue1 + 60 + (seed % 80)) % 360
  const c1 = `oklch(0.78 0.18 ${hue1})`
  const c2 = `oklch(0.55 0.22 ${hue2})`
  const id = `g-${seed}`
  const initial = (name?.[0] || addr?.[2] || '?').toUpperCase()

  return (
    <span className="avatar" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        <rect width="36" height="36" rx="8" fill={`url(#${id})`} />
        <text
          x="18" y="22.5" textAnchor="middle"
          fontFamily="Space Grotesk, sans-serif"
          fontWeight="700" fontSize="14"
          fill="rgba(0,0,0,0.7)"
        >{initial}</text>
      </svg>
    </span>
  )
}
