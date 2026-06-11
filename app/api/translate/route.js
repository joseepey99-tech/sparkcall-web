import { NextResponse } from 'next/server'

export async function POST(request) {
  const { text, targetLanguage } = await request.json()

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Translate to ${targetLanguage}. Return ONLY the translation:\n\n${text}`,
        }],
      }),
    })
    const data = await response.json()
    return NextResponse.json({ translated: data.content?.[0]?.text || null })
  } catch {
    return NextResponse.json({ translated: null })
  }
}