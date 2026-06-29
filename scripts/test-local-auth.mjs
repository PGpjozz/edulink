const base = 'http://localhost:3000';

const csrfRes = await fetch(`${base}/api/auth/csrf`);
const { csrfToken } = await csrfRes.json();
const cookies = csrfRes.headers.getSetCookie?.() ?? [];

const body = new URLSearchParams({
  csrfToken,
  identifier: process.argv[2] ?? 'provider@edulink.com',
  password: process.argv[3] ?? 'provider123',
  redirect: 'false',
  json: 'true',
});

const res = await fetch(`${base}/api/auth/callback/credentials`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Cookie: cookies.map((c) => c.split(';')[0]).join('; '),
  },
  body,
});

console.log('Status:', res.status);
console.log('Body:', await res.text());
