// ── AI ICON MATCHING MODULE ────────────────────────────────────────────────
// Calls the Claude API to extract the best Iconify search keyword from a
// calendar event title, then looks up a matching emoji icon.

async function getIconKeyword(eventTitle, apiKey) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 20,
      messages: [{
        role: 'user',
        content: `Calendar event: "${eventTitle}"\nRespond with 1-2 words to search for an emoji icon that best represents this event. Reply with only the search words, nothing else.`
      }]
    })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Claude API ${resp.status}: ${err.error?.message || resp.statusText}`);
  }

  const data = await resp.json();
  return data.content[0].text.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}
