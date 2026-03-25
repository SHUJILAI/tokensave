const API_URL = 'https://ai-gateway.happycapy.ai/api/v1/chat/completions';
const API_KEY = '005cbe34ac934822854f1420b86fb83b';
const MODEL = 'anthropic/claude-sonnet-4.6';

export async function llm(
  messages: { role: string; content: string }[],
  maxTokens = 4096
): Promise<string> {
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0,
    }),
  });
  const d = await r.json();
  if (d.error) {
    throw new Error(
      typeof d.error === 'string' ? d.error : d.error.message || JSON.stringify(d.error)
    );
  }
  const m = d.choices?.[0]?.message;
  return m?.content || m?.reasoning || '';
}
