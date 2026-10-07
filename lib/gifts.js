export const GIFTS = [
  { id: 'heart',     name: 'Heart',         cost: 5,     tier: 'affection', emoji: '❤️' },
  { id: 'rose',      name: 'Rose',          cost: 10,    tier: 'affection', emoji: '🌹' },
  { id: 'candy',     name: 'Candy',         cost: 15,    tier: 'affection', emoji: '🍬' },
  { id: 'kiss',      name: 'Kiss',          cost: 20,    tier: 'affection', emoji: '💋' },
  { id: 'cupcake',   name: 'Cupcake',       cost: 30,    tier: 'affection', emoji: '🧁' },
  { id: 'letter',    name: 'Love Letter',   cost: 50,    tier: 'affection', emoji: '💌' },
  { id: 'champagne', name: 'Champagne',     cost: 80,    tier: 'luxury',    emoji: '🍾' },
  { id: 'trophy',    name: 'Trophy',        cost: 100,   tier: 'luxury',    emoji: '🏆' },
  { id: 'crown',     name: 'Crown',         cost: 150,   tier: 'luxury',    emoji: '👑' },
  { id: 'ring',      name: 'Diamond Ring',  cost: 200,   tier: 'luxury',    emoji: '💍' },
  { id: 'car',       name: 'Sports Car',    cost: 250,   tier: 'luxury',    emoji: '🏎️' },
  { id: 'goldbar',   name: 'Gold Bar',      cost: 300,   tier: 'luxury',    emoji: '🪙' },
  { id: 'jet',       name: 'Private Jet',   cost: 500,   tier: 'status',    emoji: '🛩️' },
  { id: 'lion',      name: 'Lion',          cost: 600,   tier: 'status',    emoji: '🦁' },
  { id: 'dragon',    name: 'Dragon',        cost: 800,   tier: 'status',    emoji: '🐉' },
  { id: 'unicorn',   name: 'Unicorn',       cost: 1000,  tier: 'status',    emoji: '🦄' },
  { id: 'yacht',     name: 'Yacht',         cost: 1200,  tier: 'status',    emoji: '🛥️' },
  { id: 'castle',    name: 'Castle',        cost: 1500,  tier: 'status',    emoji: '🏰' },
  { id: 'rocket',    name: 'Space Rocket',  cost: 2000,  tier: 'ultimate',  emoji: '🚀' },
  { id: 'star',      name: 'Shooting Star', cost: 2500,  tier: 'ultimate',  emoji: '🌠' },
  { id: 'island',    name: 'Island',        cost: 3000,  tier: 'ultimate',  emoji: '🏝️' },
  { id: 'phoenix',   name: 'Phoenix',       cost: 4000,  tier: 'ultimate',  emoji: '🔥' },
  { id: 'galaxy',    name: 'Galaxy',        cost: 5000,  tier: 'ultimate',  emoji: '🌌' },
  { id: 'universe',  name: 'Universe',      cost: 10000, tier: 'ultimate',  emoji: '🪐' },
]

export const TIER_ORDER = ['affection', 'luxury', 'status', 'ultimate']
export const TIER_LABELS = { affection: 'Affection', luxury: 'Luxury', status: 'Status', ultimate: 'Ultimate' }

export function giftEmoji(id) {
  const g = GIFTS.find(x => x.id === id)
  return g ? g.emoji : '🎁'
}

export function parseGift(text) {
  try {
    const p = JSON.parse(text)
    return p && p.type === 'gift' ? p : null
  } catch { return null }
}

export function fmtCost(n) {
  return n >= 1000 ? `${n / 1000}K` : String(n)
}