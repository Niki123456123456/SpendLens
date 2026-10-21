import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import { Config, readConfig } from './config';
import { ExpiringStore, pkce, random, same, sha256 } from './security';
import { extractReceipt } from './inference';

const issuer = 'https://auth.openai.com';
const resource = 'https://api.openai.com/v1';
type Transaction = { state: string; nonce: string; verifier: string; browser?: string; redirectUri: string; challenge: string; clientId: string; expectedSub?: string };
type Connection = { clientId: string; access: string; refresh?: string; expires: number; scopes: string[]; user: { id: string; name: string; email?: string; sub: string }; model?: string; refreshing?: Promise<void>; analyzing?: boolean };
type Registration = { clientId: string; sub?: string };

async function protectedWrite(path: string, value: unknown) {
  const tmp = path + '.tmp';
  await writeFile(tmp, JSON.stringify(value), { mode: 0o600 });
  await rename(tmp, path);
}
export async function createApp(config: Config = readConfig()) {
  const app = express(); app.disable('x-powered-by');
  app.use((_req, res, next) => { res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }); next(); });
  app.use(cors({ origin: (origin, callback) => callback(null, !origin || config.origins.includes(origin)) }));
  app.use((req, res, next) => { if (req.headers.origin && !config.origins.includes(req.headers.origin)) { res.status(403).json({ error: 'Unbekannter App-Ursprung.' }); return; } next(); });
  app.use(express.json({ limit: '9mb' })); app.use(cookieParser());
  const launches = new ExpiringStore<Transaction>(120000);
  const transactions = new ExpiringStore<Transaction>(600000);
  const tickets = new ExpiringStore<{ connection: Connection; challenge: string }>(60000);
  const sessions = new ExpiringStore<Connection>(7 * 86400000);
  const rates = new ExpiringStore<number>(60000);
  const local = resolve('.local');
  let hostId = '', registration: Registration | undefined;
  if (config.mode === 'local-plan') {
    await mkdir(local, { recursive: true, mode: 0o700 });
    try { hostId = JSON.parse(await readFile(resolve(local, 'host.json'), 'utf8')).id; }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; hostId = `urn:uuid:${randomUUID()}`; await protectedWrite(resolve(local, 'host.json'), { id: hostId }); }
    try { registration = JSON.parse(await readFile(resolve(local, 'registration.json'), 'utf8')); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  }
  // OIDC discovery is fetched only when a user actually starts sign-in.
  let discovery: Promise<{ issuer: string; authorization_endpoint: string; token_endpoint: string; jwks_uri: string }> | undefined;
  function metadata() {
    discovery ??= fetch(issuer + '/.well-known/openid-configuration', { signal: AbortSignal.timeout(15000) }).then(async res => {
      if (!res.ok) throw new Error('OpenAI-Anmeldung nicht erreichbar.');
      const value = await res.json() as { issuer: string; authorization_endpoint: string; token_endpoint: string; jwks_uri: string };
      if (value.issuer !== issuer || [value.authorization_endpoint, value.token_endpoint, value.jwks_uri].some(url => new URL(url).origin !== issuer)) throw new Error('Ungültige OpenAI-Anmeldekonfiguration.');
      return value;
    }).catch(error => { discovery = undefined; throw error; });
    return discovery;
  }
  let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
  async function tokens(params: Record<string, string>) {
    const meta = await metadata();
    const body = new URLSearchParams(params);
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (config.mode === 'registered' && config.clientSecret) {
      if (config.clientAuth === 'client_secret_basic') headers.Authorization = 'Basic ' + Buffer.from(`${encodeURIComponent(params.client_id)}:${encodeURIComponent(config.clientSecret)}`).toString('base64');
      else if (config.clientAuth === 'client_secret_post') body.set('client_secret', config.clientSecret);
      else throw new Error('Token-Authentifizierung für diesen Client ist nicht konfiguriert.');
    }
    const res = await fetch(meta.token_endpoint, { method: 'POST', headers, body, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error('ChatGPT-Anmeldung oder Erneuerung fehlgeschlagen. Bitte erneut verbinden.');
    return z.object({ access_token: z.string().min(1), refresh_token: z.string().optional(), id_token: z.string().optional(), expires_in: z.number().positive(), scope: z.string().optional() }).parse(await res.json());
  }
  async function authenticate(req: Request): Promise<Connection> {
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    const session = token ? sessions.get(sha256(token)) : undefined;
    if (!session) throw Object.assign(new Error('Bitte erneut mit ChatGPT anmelden.'), { status: 401 });
    if (session.expires <= Date.now() + 60000 && config.mode === 'local-plan') {
      if (!session.refresh) throw Object.assign(new Error('Sitzung abgelaufen. Bitte erneut anmelden.'), { status: 401 });
      session.refreshing ??= (async () => {
        const next = await tokens({ grant_type: 'refresh_token', client_id: session.clientId, refresh_token: session.refresh!, resource });
        if (!next.refresh_token) throw new Error('OpenAI hat keine erneuerbare Sitzung geliefert. Bitte erneut verbinden.');
        session.access = next.access_token; session.refresh = next.refresh_token; session.expires = Date.now() + next.expires_in * 1000;
        if (next.scope !== undefined) session.scopes = next.scope.split(' ');
      })().finally(() => { session.refreshing = undefined; });
      await session.refreshing;
    }
    return session;
  }
  function publicSession(connection: Connection, token: string) {
    const { sub: _sub, ...user } = connection.user;
    return { token, user, planEnabled: connection.scopes.includes('chatgpt.tokens.use.direct') };
  }
  app.get('/health', (_req, res) => res.json({ ok: true, mode: config.mode }));
  app.post('/auth/prepare', async (req, res) => {
    const ip = req.ip || 'local'; const count = rates.get(ip) || 0;
    if (count >= 15) { res.status(429).json({ error: 'Zu viele Anmeldeversuche. Bitte eine Minute warten.' }); return; }
    rates.set(ip, count + 1);
    const data = z.object({ redirectUri: z.string(), challenge: z.string().regex(/^[a-f0-9]{64}$/) }).parse(req.body);
    if (!config.redirects.includes(data.redirectUri)) { res.status(400).json({ error: 'Diese App-Rücksprungadresse ist am Server nicht freigegeben.' }); return; }
    if (config.mode === 'local-plan' && !/^http:\/\/(localhost|127\.0\.0\.1):\d+\/auth-return$/.test(data.redirectUri)) { res.status(400).json({ error: 'Der lokale Abo-Flow ist für den Browser auf demselben Computer vorgesehen.' }); return; }
    const state = random(), launch = random();
    launches.set(launch, { state, nonce: random(), verifier: random(), redirectUri: data.redirectUri, challenge: data.challenge, clientId: config.mode === 'local-plan' ? registration?.clientId || 'dynamic_agent_client' : config.clientId!, expectedSub: config.mode === 'local-plan' ? registration?.sub : undefined });
    res.json({ url: `${config.baseUrl}/auth/openai?launch=${launch}`, state });
  });
  app.get('/auth/openai', async (req, res) => {
    const tx = launches.take(String(req.query.launch || ''));
    if (!tx) { res.status(400).send('Anmeldung abgelaufen. Bitte in SpendLens erneut starten.'); return; }
    const meta = await metadata();
    tx.browser = random(); transactions.set(tx.state, tx);
    res.cookie('spendlens_oauth', tx.browser, { httpOnly: true, secure: config.baseUrl.startsWith('https:'), sameSite: 'lax', maxAge: 600000, path: '/auth/openai' });
    const url = new URL(meta.authorization_endpoint);
    const params: Record<string, string> = { client_id: tx.clientId, redirect_uri: config.callback, response_type: 'code', scope: config.mode === 'local-plan' ? 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct' : 'openid profile email', state: tx.state, nonce: tx.nonce, code_challenge: pkce(tx.verifier), code_challenge_method: 'S256' };
    if (config.mode === 'local-plan') { params.resource = resource; params.ext_agent_host_id = hostId; if (tx.clientId === 'dynamic_agent_client') params.agent_name_hint = 'SpendLens'; }
    url.search = new URLSearchParams(params).toString(); res.redirect(url.toString());
  });
  app.get('/auth/openai/callback', async (req, res) => {
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const tx = transactions.take(state);
    res.clearCookie('spendlens_oauth', { path: '/auth/openai' });
    if (!tx || !tx.browser || !same(req.cookies.spendlens_oauth || '', tx.browser)) { res.status(400).send('Anmeldung konnte nicht verifiziert werden. Bitte erneut in SpendLens starten.'); return; }
    const back = new URL(tx.redirectUri); back.searchParams.set('state', state);
    try {
      if (req.query.error) throw new Error('Anmeldung abgebrochen.');
      const code = z.string().min(1).parse(req.query.code);
      const returnedClient = typeof req.query.client_id === 'string' ? req.query.client_id : undefined;
      let clientId = tx.clientId;
      if (clientId === 'dynamic_agent_client') {
        if (!returnedClient || returnedClient === 'dynamic_agent_client') throw new Error('OpenAI-Registrierung unvollständig.');
        clientId = returnedClient;
        registration = { clientId }; await protectedWrite(resolve(local, 'registration.json'), registration);
      } else if (returnedClient && returnedClient !== clientId) throw new Error('Unerwarteter OAuth-Client.');
      const token = await tokens({ grant_type: 'authorization_code', code, client_id: clientId, redirect_uri: config.callback, code_verifier: tx.verifier, ...(config.mode === 'local-plan' ? { resource } : {}) });
      if (!token.id_token) throw new Error('OpenAI hat keine Identität geliefert.');
      const meta = await metadata(); jwks ??= createRemoteJWKSet(new URL(meta.jwks_uri));
      const { payload } = await jwtVerify(token.id_token, jwks, { issuer: meta.issuer, audience: clientId, requiredClaims: ['sub', 'exp', 'iat', 'nonce'] });
      if ((Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== clientId) || payload.nonce !== tx.nonce || !payload.sub || (tx.expectedSub && tx.expectedSub !== payload.sub)) throw new Error('Die OpenAI-Identität stimmt nicht mit dem verbundenen Konto überein.');
      const userId = createHash('sha256').update(`${meta.issuer}|${clientId}|${payload.sub}`).digest('hex');
      const connection: Connection = { clientId, access: token.access_token, refresh: token.refresh_token, expires: Date.now() + token.expires_in * 1000,
        scopes: token.scope?.split(' ') || [], user: { id: userId, sub: payload.sub, name: typeof payload.name === 'string' ? payload.name : 'Dein ChatGPT-Konto', ...(typeof payload.email === 'string' ? { email: payload.email } : {}) } };
      if (config.mode === 'local-plan') { registration = { clientId, sub: payload.sub }; await protectedWrite(resolve(local, 'registration.json'), registration); }
      const ticket = random(); tickets.set(sha256(ticket), { connection, challenge: tx.challenge });
      back.searchParams.set('ticket', ticket);
    } catch { back.searchParams.set('error', 'sign_in_failed'); }
    res.redirect(back.toString());
  });
  app.post('/auth/redeem', (req, res) => {
    const { ticket, verifier } = z.object({ ticket: z.string(), verifier: z.string().min(32) }).parse(req.body);
    const pending = tickets.get(sha256(ticket));
    if (!pending || !same(pending.challenge, sha256(verifier))) { res.status(400).json({ error: 'Anmeldung abgelaufen oder ungültig.' }); return; }
    tickets.delete(sha256(ticket)); const token = random(); sessions.set(sha256(token), pending.connection); res.json(publicSession(pending.connection, token));
  });
  app.get('/auth/me', async (req, res) => { const connection = await authenticate(req); res.json({ user: publicSession(connection, '').user, planEnabled: connection.scopes.includes('chatgpt.tokens.use.direct') }); });
  app.post('/auth/logout', (req, res) => { const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]; if (token) sessions.delete(sha256(token)); res.json({ ok: true }); });
  app.post('/receipts/analyze', async (req, res) => {
    const connection = await authenticate(req);
    const { image } = z.object({ image: z.string().max(8_000_050).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/) }).parse(req.body);
    if (connection.analyzing) { res.status(429).json({ error: 'Ein Bon wird bereits ausgelesen.' }); return; }
    connection.analyzing = true;
    try {
      let credential: string;
      if (config.mode === 'local-plan') {
        if (!connection.scopes.includes('chatgpt.tokens.use.direct')) { res.status(403).json({ error: 'ChatGPT-Abo-Nutzung wurde nicht freigegeben. Bitte Konto und Nutzungseinstellungen prüfen.' }); return; }
        credential = connection.access;
        if (!connection.model) {
          const response = await fetch(resource + '/models', { headers: { Authorization: `Bearer ${credential}` }, signal: AbortSignal.timeout(15000) });
          if (!response.ok) throw new Error('Modellkatalog konnte nicht geladen werden. Bitte erneut verbinden.');
          const catalog = z.object({ models: z.array(z.object({ slug: z.string(), visibility: z.string().optional(), input_modalities: z.array(z.string()).optional() }).passthrough()) }).parse(await response.json());
          const available = catalog.models.filter(m => m.visibility === 'list' && (!m.input_modalities || m.input_modalities.includes('image')));
          const selected = config.model ? available.find(m => m.slug === config.model) : available[0];
          if (!selected) throw new Error('Kein passendes Modell im Konto verfügbar. OPENAI_MODEL und Bildunterstützung prüfen.');
          connection.model = selected.slug;
        }
      } else {
        if (!config.apiKey || !config.model) { res.status(503).json({ error: 'KI-Auslesen ist am Server noch nicht eingerichtet (OPENAI_API_KEY und OPENAI_MODEL). Die ChatGPT-Anmeldung allein schaltet keine API-Nutzung frei.' }); return; }
        credential = config.apiKey;
      }
      res.json({ receipt: await extractReceipt(image, credential, connection.model || config.model!) });
    } finally { connection.analyzing = false; }
  });
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) { res.status(400).json({ error: 'Ungültige oder unvollständige Daten. Bitte Eingaben prüfen.' }); return; }
    const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 500;
    res.status(status >= 400 && status <= 599 ? status : 500).json({ error: error instanceof Error && !(error instanceof SyntaxError) ? error.message : 'Die Anfrage konnte nicht verarbeitet werden.' });
  });
  return app;
}
if (process.argv[1] && /server\/index\.(ts|js)$/.test(process.argv[1])) {
  const config = readConfig();
  createApp(config).then(app => app.listen(config.port, config.host, () => console.log(`SpendLens API: ${config.baseUrl} (${config.mode})`))).catch(() => { console.error('SpendLens-Server konnte nicht starten. Konfiguration und lokale Dateien prüfen.'); process.exitCode = 1; });
}
