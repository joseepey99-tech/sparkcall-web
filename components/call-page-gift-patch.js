// ─────────────────────────────────────────────────────────────────────────────
// PATCH: Replace the GIFTS constant & gift panel in app/(main)/call/[id]/page.js
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. ADD THIS IMPORT at the top of the file (after existing imports) ──────
import { GiftIcon, GIFTS, TIER_LABELS } from '@/components/GiftIcons'


// ── 2. REMOVE the old GIFTS array (the 8-item emoji one) ────────────────────
// Delete everything from:
//   const GIFTS = [
//     { id: 'rose', emoji: ...
// to the closing ]


// ── 3. REPLACE the gift panel grid inside {giftOpen && ...} with this ────────
// Find:
//   {/* Gifts grid */}
//   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', ...
// Replace the entire inner div with:

{/* Tier labels + gifts grid */}
{Object.entries(
  GIFTS.reduce((acc, g) => {
    if (!acc[g.tier]) acc[g.tier] = []
    acc[g.tier].push(g)
    return acc
  }, {})
).map(([tier, tierGifts]) => (
  <div key={tier} style={{ marginBottom: 18 }}>
    {/* Tier label */}
    <div style={{
      fontSize: 9, fontWeight: 700, letterSpacing: 2,
      color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
      marginBottom: 10, fontFamily: "'Outfit', sans-serif"
    }}>
      {TIER_LABELS[tier]}
    </div>
    {/* 6-column gift grid for this tier */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
      {tierGifts.map(g => {
        const canAfford = credits >= g.cost
        return (
          <button key={g.id} onClick={() => canAfford && sendGift(g)}
            style={{
              padding: '10px 4px', borderRadius: 14,
              border: `1px solid ${canAfford ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
              background: canAfford ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
              cursor: canAfford ? 'pointer' : 'not-allowed',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 4,
              opacity: canAfford ? 1 : 0.35,
              transition: 'all 0.15s'
            }}>
            <GiftIcon id={g.id} size={36} />
            <span style={{ fontSize: 9, fontWeight: 600, color: '#fff', textAlign: 'center', lineHeight: 1.2 }}>
              {g.name}
            </span>
            <span style={{ fontSize: 9, color: '#C9A46A' }}>⚡{g.cost >= 1000 ? `${g.cost/1000}K` : g.cost}</span>
          </button>
        )
      })}
    </div>
  </div>
))}

// ── 4. ALSO update sendGift to remove the emoji from the floating message ───
// Change:
//   addFloatingMessage(`${gift.emoji} sent a ${gift.name}!`, true)
// To:
//   addFloatingMessage(`✨ sent a ${gift.name}!`, true)
