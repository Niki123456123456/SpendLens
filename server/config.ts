import 'dotenv/config';
export function readConfig() {
  const mode = process.env.AUTH_MODE || 'local-plan';
  if (!['local-plan', 'registered'].includes(mode)) throw new Error('AUTH_MODE muss local-plan oder registered sein.');
  const port = Number(process.env.PORT || 3001);
  const baseUrl = process.env.SERVER_URL || `http://127.0.0.1:${port}`;
  const url = new URL(baseUrl);
  if (mode === 'local-plan' && (url.hostname !== '127.0.0.1' || url.protocol !== 'http:')) throw new Error('Der lokale Abo-Flow benötigt http://127.0.0.1:<port>.');
  if (mode === 'registered' && !process.env.OPENAI_CLIENT_ID) throw new Error('Für AUTH_MODE=registered bitte OPENAI_CLIENT_ID setzen.');
  if (url.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('Ein entfernter OAuth-Server benötigt HTTPS.');
  return { mode, port, baseUrl: url.origin, host: process.env.HOST || '127.0.0.1',
    callback: url.origin + '/auth/openai/callback', clientId: process.env.OPENAI_CLIENT_ID,
    clientSecret: process.env.OPENAI_CLIENT_SECRET,
    clientAuth: process.env.OPENAI_TOKEN_AUTH_METHOD || 'none',
    origins: (process.env.APP_ORIGINS || 'http://localhost:8081,http://127.0.0.1:8081').split(',').map((s: string) => s.trim()),
    redirects: (process.env.APP_REDIRECT_URIS || 'http://localhost:8081/auth-return,http://127.0.0.1:8081/auth-return,spendlens://auth-return').split(',').map((s: string) => s.trim()),
    model: process.env.OPENAI_MODEL,
    apiKey: process.env.OPENAI_API_KEY,
  };
}
export type Config = ReturnType<typeof readConfig>;
