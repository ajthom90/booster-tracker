import { describe, it, expect, vi } from 'vitest';
import { Ll2Client } from '../../src/lib/server/ll2/client';
import { TokenBucket } from '../../src/lib/server/ll2/ratelimit';

const ok = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init });

describe('Ll2Client', () => {
  it('returns parsed JSON on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ count: 0, next: null, previous: null, results: [] }));
    const client = new Ll2Client({
      baseUrl: 'https://example/2.2.0',
      fetch: fetchMock,
      bucket: new TokenBucket({ capacity: 5, refillPerHour: 60 })
    });
    const r = await client.getJson('/pad/');
    expect(r).toEqual({ count: 0, next: null, previous: null, results: [] });
    expect(fetchMock).toHaveBeenCalledWith('https://example/2.2.0/pad/', expect.any(Object));
  });

  it('retries on 429 and succeeds eventually', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
      .mockResolvedValueOnce(ok({ ok: true }));
    const client = new Ll2Client({
      baseUrl: 'https://example/2.2.0',
      fetch: fetchMock,
      bucket: new TokenBucket({ capacity: 5, refillPerHour: 60 }),
      retryDelayMs: 1
    });
    const r = await client.getJson<{ ok: boolean }>('/pad/');
    expect(r.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws after exceeding max retries', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));
    const client = new Ll2Client({
      baseUrl: 'https://example/2.2.0',
      fetch: fetchMock,
      bucket: new TokenBucket({ capacity: 5, refillPerHour: 60 }),
      retryDelayMs: 1,
      maxRetries: 2
    });
    await expect(client.getJson('/pad/')).rejects.toThrow(/HTTP 500/);
    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('sets Authorization header when api token is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({}));
    const client = new Ll2Client({
      baseUrl: 'https://example/2.2.0',
      fetch: fetchMock,
      bucket: new TokenBucket({ capacity: 5, refillPerHour: 60 }),
      apiToken: 'secret-token'
    });
    await client.getJson('/pad/');
    const init = fetchMock.mock.calls[0][1];
    expect(init.headers).toMatchObject({ Authorization: 'Token secret-token' });
  });
});
