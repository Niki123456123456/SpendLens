import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server/index';
import { readConfig } from '../server/config';
import { ExpiringStore, pkce, same } from '../server/security';
import { readCompletedText } from '../server/inference';
test('PKCE matches RFC 7636 vector and constant-time comparison rejects mismatch', () => {
  assert.equal(pkce('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  assert.equal(same('abc', 'abcd'), false); assert.equal(same('abc', 'abd'), false); assert.equal(same('abc', 'abc'), true);
});
test('one-time stores reject expired and consumed state', async () => {
  const store = new ExpiringStore<string>(5); store.set('once', 'value');
  assert.equal(store.take('once'), 'value'); assert.equal(store.take('once'), undefined);
  store.set('expired', 'value'); await new Promise(resolve => setTimeout(resolve, 15)); assert.equal(store.get('expired'), undefined);
});
function stream(events: string[]) { const encoder = new TextEncoder(); return new ReadableStream<Uint8Array>({ start(controller) { for (const text of events) controller.enqueue(encoder.encode(text)); controller.close(); } }); }
test('SSE waits for completion and handles split chunks, failures and incomplete responses', async () => {
  const delta = 'data: {"type":"response.output_text.delta","delta":"hello"}\n\n';
  assert.equal(await readCompletedText(stream([delta.slice(0, 10), delta.slice(10), 'data: {"type":"response.completed"}\n\n'])), 'hello');
  assert.equal(await readCompletedText(stream(['data: {\"type\":\"response.output_text.delta\",\"delta\":\"hi\"}\r', '\n\r', '\ndata: {\"type\":\"response.completed\"}\r\n\r\n'])), 'hi');
  await assert.rejects(readCompletedText(stream([delta])), /unvollständig/);
  await assert.rejects(readCompletedText(stream([delta, 'data: {"type":"response.failed"}\n\n'])), /Nutzungslimit/);
  await assert.rejects(readCompletedText(stream([delta, 'data: {"type":"response.incomplete"}\n\n'])), /abgebrochen/);
});
test('API rejects unknown redirects, unauthenticated scans and unverified/replayed callbacks without contacting OpenAI', async () => {
  const app = await createApp({ ...readConfig(), mode: 'registered', clientId: 'test-client', apiKey: undefined });
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening'); const address = server.address(); assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    const post = (path: string, body: unknown) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await fetch(base + '/health')).status, 200);
    assert.equal((await post('/auth/prepare', { redirectUri: 'https://evil.example/auth', challenge: 'a'.repeat(64) })).status, 400);
    assert.equal((await post('/receipts/analyze', { image: 'fake' })).status, 401);
    assert.equal((await fetch(base + '/auth/openai/callback?state=forged&code=stolen', { redirect: 'manual' })).status, 400);
    assert.equal((await post('/auth/redeem', { ticket: 'unknown', verifier: 'x'.repeat(64) })).status, 400);
    assert.equal((await fetch(base + '/health', { headers: { Origin: 'https://evil.example' } })).status, 403);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
