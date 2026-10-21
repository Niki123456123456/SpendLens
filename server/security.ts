import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
export const random = () => randomBytes(32).toString('base64url');
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
export const pkce = (value: string) => createHash('sha256').update(value).digest('base64url');
export function same(a: string, b: string) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
export class ExpiringStore<T> {
  private entries = new Map<string, { value: T; until: number }>();
  constructor(private ttl: number, private limit = 1000) {}
  set(key: string, value: T) {
    this.sweep();
    if (this.entries.size >= this.limit) throw new Error('Zu viele Anfragen. Bitte später erneut versuchen.');
    this.entries.set(key, { value, until: Date.now() + this.ttl });
  }
  get(key: string): T | undefined { const entry = this.entries.get(key); if (!entry || entry.until <= Date.now()) { this.entries.delete(key); return undefined; } return entry.value; }
  take(key: string) { const value = this.get(key); this.entries.delete(key); return value; }
  delete(key: string) { this.entries.delete(key); }
  private sweep() { for (const [key, entry] of this.entries) if (entry.until <= Date.now()) this.entries.delete(key); }
}
