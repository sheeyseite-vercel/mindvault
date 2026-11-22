// Shared helpers for the Vercel serverless functions.
// Set GROQ_API_KEY (required) and GROQ_MODEL (optional) in Vercel > Settings > Environment Variables.

function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

async function groq(messages, { json = false } = {}) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not set');
  const body = {
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.2,
    max_tokens: 400,
  };
  if (json) body.response_format = { type: 'json_object' };
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('Groq error ' + r.status);
  const data = await r.json();
  return data.choices[0].message.content;
}

module.exports = { cors, groq };
