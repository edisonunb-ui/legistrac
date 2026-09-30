import crypto from 'node:crypto';

export function verifyTicket(token, secret, now = Date.now()) {
  if (!secret || secret.length < 32) throw new Error('SSO não configurado');
  const [body, signature, extra] = String(token || '').split('.');
  if (!body || !signature || extra || body.length > 8192) return null;
  const expected = crypto.createHmac('sha256', secret).update(body).digest();
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (p.target !== 'gabinetes' || !p.email || !p.nonce ||
        !Number.isFinite(p.iat) || !Number.isFinite(p.exp) || p.iat > now + 5000 ||
        p.exp <= now || p.exp - p.iat > 60000 || p.role === 'SEM_ACESSO') return null;
    return p;
  } catch { return null; }
}

export function sessionToken(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${crypto.createHmac('sha256',secret).update(body).digest('base64url')}`;
}

export function verifySession(token, secret, now = Date.now()) {
  const [body, signature, extra] = String(token || '').split('.');
  if (!body || !signature || extra || body.length > 8192) return null;
  const expected = crypto.createHmac('sha256',secret).update(body).digest();
  const actual = Buffer.from(signature,'base64url');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try { const p = JSON.parse(Buffer.from(body,'base64url')); return p.exp > now && p.email && (p.gabineteId || p.admin === true) ? p : null; } catch { return null; }
}