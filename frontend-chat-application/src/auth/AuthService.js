export async function login(username, password) {
  const res = await fetch('/auth/dev-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  const { token } = await res.json();
  localStorage.setItem('token', token);
  return token;
}

export function getToken() {
  return localStorage.getItem('token');
}

export function logout() {
  localStorage.removeItem('token');
}

function parseToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}

// This checks saved-login expiry only; the backend verifies the JWT signature.
export function isTokenValid(token, now = Date.now()) {
  const payload = parseToken(token);
  return typeof payload?.sub === 'string' && payload.sub.trim().length > 0 &&
    typeof payload.exp === 'number' && Number.isFinite(payload.exp) &&
    now < payload.exp * 1000;
}

export function getCurrentUser() {
  return parseToken(getToken())?.sub ?? null;
}
