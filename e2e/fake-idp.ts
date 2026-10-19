import { createHash, generateKeyPairSync, createSign, randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * A tiny OpenID Connect provider for browser tests: the browser is sent to /authorize, which
 * signs in whoever the test chose and redirects straight back with a code, as a real IdP would
 * after its login page.
 */
export class FakeIdp {
  issuer = '';
  clientId = 'dreamlab-web-e2e';
  clientSecret = `secret-${randomUUID()}`;
  /** Who /authorize signs in next. */
  user = { sub: 'u1', email: 'someone@example.org', name: 'Someone' };
  private server: Server | null = null;
  private readonly codes = new Map<string, { user: FakeIdp['user']; nonce: string; challenge: string }>();
  private readonly keys = generateKeyPairSync('rsa', { modulusLength: 2048 });

  async start(): Promise<void> {
    const jwk = { ...this.keys.publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
    this.server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', this.issuer);
      const json = (status: number, body: unknown) => res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
      if (url.pathname === '/.well-known/openid-configuration') {
        return json(200, {
          issuer: this.issuer,
          authorization_endpoint: `${this.issuer}/authorize`,
          token_endpoint: `${this.issuer}/token`,
          jwks_uri: `${this.issuer}/jwks`,
          token_endpoint_auth_methods_supported: ['client_secret_basic'],
        });
      }
      if (url.pathname === '/jwks') return json(200, { keys: [jwk] });
      if (url.pathname === '/authorize') {
        const code = randomUUID();
        this.codes.set(code, { user: { ...this.user }, nonce: url.searchParams.get('nonce') ?? '', challenge: url.searchParams.get('code_challenge') ?? '' });
        const back = new URL(url.searchParams.get('redirect_uri')!);
        back.searchParams.set('code', code);
        back.searchParams.set('state', url.searchParams.get('state') ?? '');
        res.writeHead(302, { location: back.toString() }).end();
        return;
      }
      if (url.pathname === '/token' && req.method === 'POST') {
        let raw = '';
        req.on('data', (c: Buffer) => (raw += c.toString()));
        req.on('end', () => {
          const expected = `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`;
          if (req.headers.authorization !== expected) return json(401, { error: 'invalid_client' });
          const body = new URLSearchParams(raw);
          const grant = this.codes.get(body.get('code') ?? '');
          const verifier = body.get('code_verifier') ?? '';
          if (!grant || createHash('sha256').update(verifier).digest('base64url') !== grant.challenge) return json(400, { error: 'invalid_grant' });
          this.codes.delete(body.get('code')!);
          json(200, { id_token: this.idToken(grant.user, grant.nonce), access_token: 'x', token_type: 'Bearer' });
        });
        return;
      }
      json(404, {});
    });
    await new Promise<void>((r) => this.server!.listen(0, '127.0.0.1', r));
    this.issuer = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  stop(): void {
    this.server?.close();
  }

  private idToken(user: FakeIdp['user'], nonce: string): string {
    const now = Math.floor(Date.now() / 1000);
    const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const head = enc({ alg: 'RS256', kid: 'k1', typ: 'JWT' });
    const body = enc({ iss: this.issuer, aud: this.clientId, sub: user.sub, email: user.email, name: user.name, nonce, iat: now, exp: now + 300 });
    const sig = createSign('RSA-SHA256').update(`${head}.${body}`).sign(this.keys.privateKey).toString('base64url');
    return `${head}.${body}.${sig}`;
  }
}
