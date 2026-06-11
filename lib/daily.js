export async function createRoom() {
  const res = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        max_participants: 2,
        enable_chat: true,
        enable_knocking: false,
        exp: Math.round(Date.now() / 1000) + 3600,
      },
    }),
  })
  return res.json()
}

export async function deleteRoom(roomName) {
  await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` },
  })
}