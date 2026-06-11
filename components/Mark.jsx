'use client'

const T = {
  rose: '#D63F6E',
  plat: '#B8CCE4',
  gold: '#C9A46A',
}

export default function Mark({ size = 64, glow = true }) {
  const s = size / 80
  const sw = 1.6 * s
  const id = `mk${Math.round(size)}`
  return (
    <svg width={56 * s} height={80 * s} viewBox="0 0 56 80"
      overflow="visible" style={{ flexShrink: 0, display: 'block' }}>
      <defs>
        <radialGradient id={`rg-${id}`} cx="35%" cy="30%" r="70%">
          <stop offset="0%"   stopColor={T.rose} stopOpacity=".28" />
          <stop offset="100%" stopColor={T.rose} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`pg-${id}`} cx="65%" cy="30%" r="70%">
          <stop offset="0%"   stopColor={T.plat} stopOpacity=".2" />
          <stop offset="100%" stopColor={T.plat} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`gg-${id}`} cx="50%" cy="50%" r="60%">
          <stop offset="0%"   stopColor={T.gold} stopOpacity=".2" />
          <stop offset="100%" stopColor={T.gold} stopOpacity="0" />
        </radialGradient>
      </defs>
      {glow && <>
        <ellipse cx="17" cy="38" rx="20" ry="36" fill={`url(#rg-${id})`} />
        <ellipse cx="39" cy="38" rx="20" ry="36" fill={`url(#pg-${id})`} />
        <ellipse cx="28" cy="50" rx="14" ry="18" fill={`url(#gg-${id})`} />
      </>}
      <path d="M17,14 C9,26 8,42 11,56 C13,64 15,70 17,74"
        fill="none" stroke={T.rose} strokeWidth={sw * 1.1} strokeLinecap="round" />
      <circle cx="17" cy="9" r={sw * 2.6}
        fill="none" stroke={T.rose} strokeWidth={sw * .9} />
      <line x1="39" y1="14" x2="39" y2="74"
        stroke={T.plat} strokeWidth={sw * 1.25} strokeLinecap="round" />
      <circle cx="39" cy="9" r={sw * 2.9}
        fill="none" stroke={T.plat} strokeWidth={sw * .9} />
      <g transform="translate(28,44)">
        <circle r={sw * 4} fill={T.gold} opacity=".12" />
        <path d={`M0,${-sw*3.5} L${sw*.9},${-sw*.9} L${sw*3.5},0 L${sw*.9},${sw*.9} L0,${sw*3.5} L${-sw*.9},${sw*.9} L${-sw*3.5},0 L${-sw*.9},${-sw*.9}Z`}
          fill={T.gold} opacity=".95" />
      </g>
    </svg>
  )
}