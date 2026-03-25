const ENCODER_PROMPT = `You are a lossless text compressor. Compress the input into the shortest possible notation that preserves ALL facts, numbers, dates, percentages, names, and relationships.

RULES:
1. NO fixed templates. Invent your own shorthand freely.
2. PRESERVE every number, date, percentage, currency amount, metric, name, and quantitative fact exactly.
3. Use these conventions:
   - k=thousand M=million B=billion T=trillion
   - Dates: compact form (Q4'24, Mar2024, 250315=2025-03-15)
   - Drop filler words (the, a, an, is, was, were, that, which, etc.)
   - Abbreviate common words (mgmt=management, dev=development, infra=infrastructure, perf=performance, etc.)
   - Use symbols: ->=leads to, <=from, @=at, &=and, /=or/per, ^=increase, v=decrease
   - Use ; to separate facts, | to separate sections
4. Start with a 1-line KEY of any entity abbreviations you use (e.g. "K:NB=NovaBio,LH=Lighthouse")
5. Then "---" separator
6. Then the compressed content
7. Drop: greetings, transitions, filler sentences, discussion that adds no facts
8. Keep: every data point, every metric, every deadline, every financial figure, every percentage, every name of entity/product/place
9. For structured data (tables, lists), use compact notation: item1:val1,item2:val2
10. Target: maximum compression while losing ZERO factual information`;

const AI_GATEWAY_URL = 'https://ai-gateway.happycapy.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-haiku-4.5';

export function estimateTokens(text: string): number {
  let cjk = 0, ascii = 0;
  for (const ch of text) {
    if (ch.codePointAt(0)! > 0x2E7F) cjk++;
    else ascii++;
  }
  return Math.ceil(cjk * 1.5 + ascii * 0.25);
}

export interface CompressResult {
  compressed: string;
  stats: {
    input_tokens: number;
    output_tokens: number;
    ratio: string;
    saved: number;
  };
}

export async function compress(
  text: string,
  aiGatewayKey: string,
  maxTokens = 8192,
): Promise<CompressResult> {
  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${aiGatewayKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: ENCODER_PROMPT },
        { role: 'user', content: text },
      ],
      max_tokens: maxTokens,
      temperature: 0,
    }),
  });

  const data: any = await response.json();

  if (data.error) {
    const msg = typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error);
    throw new Error(msg);
  }

  const compressed = data.choices?.[0]?.message?.content || '';
  const inTok = estimateTokens(text);
  const outTok = estimateTokens(compressed);

  return {
    compressed,
    stats: {
      input_tokens: inTok,
      output_tokens: outTok,
      ratio: (inTok / outTok).toFixed(1) + 'x',
      saved: inTok - outTok,
    },
  };
}
