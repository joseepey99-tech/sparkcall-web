export default function Flag({ code, size = 16 }) {
  if (!code || code.length !== 2) return null
  const c = code.toLowerCase()
  return (
    <img
      src={`https://flagcdn.com/w40/${c}.png`}
      srcSet={`https://flagcdn.com/w80/${c}.png 2x`}
      alt={code.toUpperCase()}
      width={size}
      height={Math.round(size * 0.75)}
      style={{ borderRadius: 2, verticalAlign: 'middle', objectFit: 'cover' }}
    />
  )
}