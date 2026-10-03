import test from 'node:test';
import assert from 'node:assert/strict';
import * as auth from './AuthService.js';

const now = 1700000000000;
const token = (payload) => `e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.test-signature`;

test('a saved token remains valid until its expiry in seconds', () => {
  const saved = token({ sub: 'alice', exp: now / 1000 + 3600 });
  assert.equal(auth.isTokenValid(saved, now), true);
  assert.equal(auth.isTokenValid(saved, now + 3600000), false);
});

test('Base64URL and Unicode payloads are accepted', () => {
  const saved = [0, 1, 2].map((offset) => token({ sub: 'alice', exp: now / 1000 + 1,
    description: ' '.repeat(offset) + '\uffff😀' })).find((candidate) => /[_-]/.test(candidate.split('.')[1]));
  assert.match(saved.split('.')[1], /[_-]/);
  assert.equal(auth.isTokenValid(saved, now), true);
});

test('malformed, expired, anonymous and missing-expiry tokens are rejected', () => {
  for (const saved of [null, '', 'invalid', 'a.@@.c', 'a.W10.c',
    token({ sub: 'alice' }), token({ exp: now / 1000 + 1 }),
    token({ sub: 'alice', exp: '9999999999' }),
    token({ sub: 'alice', exp: now / 1000 - 1 }),
    token({ sub: 'alice', exp: now / 1000 + 1 }).slice(0, -14)]) {
    assert.equal(auth.isTokenValid(saved, now), false, String(saved));
  }
});
