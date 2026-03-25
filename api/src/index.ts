import { compress } from './compress';

interface Env {
  AI_GATEWAY_KEY: string;
  API_KEYS: string;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function validateAuth(request: Request, env: Env): boolean {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  const validKeys = env.API_KEYS.split(',').map(k => k.trim());
  return validKeys.includes(token);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ status: 'ok' });
    }

    // Compress endpoint
    if (url.pathname === '/compress' && request.method === 'POST') {
      // Auth check
      if (!validateAuth(request, env)) {
        return json({ error: 'Invalid or missing API key' }, 401);
      }

      let body: any;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Invalid JSON body' }, 400);
      }

      const text = body?.text;
      if (!text || typeof text !== 'string' || !text.trim()) {
        return json({ error: 'Missing or empty "text" field' }, 400);
      }

      const maxTokens = body?.max_tokens ?? 8192;

      try {
        const result = await compress(text.trim(), env.AI_GATEWAY_KEY, maxTokens);
        return json(result);
      } catch (e: any) {
        return json({ error: 'Compression failed: ' + e.message }, 500);
      }
    }

    return json({ error: 'Not found' }, 404);
  },
};
