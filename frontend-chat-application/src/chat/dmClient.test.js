import test from 'node:test';
import assert from 'node:assert/strict';
import { publishMessage, mergeMessages, requestOpen } from './dmClient.js';

test('publishes trimmed content to the selected DM', () => {
  const frames = [];
  const client = { connected: true, publish: (frame) => frames.push(frame) };
  publishMessage(client, 'bob', '  hello\n');
  assert.equal(frames[0].destination, '/app/dm/bob/send');
  assert.deepEqual(JSON.parse(frames[0].body), { content: 'hello' });
  publishMessage(client, 'bob', 'x'.repeat(2000));
  assert.equal(frames.length, 2);
});

test('blank, overlong, disconnected and unselected sends never publish', () => {
  const client = { connected: true, publish() { assert.fail('must not publish'); } };
  assert.throws(() => publishMessage(client, 'bob', ' \n '), /Enter a message/);
  assert.throws(() => publishMessage(client, 'bob', 'x'.repeat(2001)), /2,000/);
  assert.throws(() => publishMessage(client, null, 'hello'), /Select a conversation/);
  assert.throws(() => publishMessage({ ...client, connected: false }, 'bob', 'hello'), /draft has been kept/);
});

test('a transport publishing failure propagates so the caller keeps its draft', () => {
  const client = { connected: true, publish() { throw new Error('transport closed'); } };
  assert.throws(() => publishMessage(client, 'bob', 'hello'), /transport closed/);
});

test('history and live messages merge chronologically without duplicates', () => {
  const a = { id: 1, sentAt: '2026-10-03T10:00:00Z' };
  const b = { id: 2, sentAt: '2026-10-03T10:00:01Z' };
  assert.deepEqual(mergeMessages([b], [a, b]), [a, b]);
});

test('open requests clean up subscriptions when publishing fails', async () => {
  let unsubscribed = false;
  const client = { connected: true,
    subscribe: () => ({ unsubscribe() { unsubscribed = true; } }),
    publish() { throw new Error('publish failed'); } };
  await assert.rejects(requestOpen(client, 'bob').promise, /publish failed/);
  assert.equal(unsubscribed, true);
});

test('open requests resolve a reply and can be cancelled on disconnect', async () => {
  let receive;
  let unsubscribeCount = 0;
  const client = { connected: true, publish() {},
    subscribe: (destination, callback) => {
      assert.equal(destination, '/user/queue/dm/open');
      receive = callback;
      return { unsubscribe() { unsubscribeCount++; } };
    } };
  const opened = requestOpen(client, 'bob');
  receive({ body: '{"conversationId":1}' });
  assert.deepEqual(await opened.promise, { conversationId: 1 });
  const cancelled = requestOpen(client, 'bob');
  cancelled.cancel();
  await assert.rejects(cancelled.promise, /Connection lost/);
  assert.equal(unsubscribeCount, 2);
});

test('a reply still settles when transport cleanup throws', async () => {
  let receive;
  const client = { connected: true, publish() {},
    subscribe: (_, callback) => {
      receive = callback;
      return { unsubscribe() { throw new Error('socket closed during cleanup'); } };
    } };
  const opened = requestOpen(client, 'bob');
  receive({ body: '{"conversationId":1}' });
  let timeout;
  try {
    const reply = await Promise.race([opened.promise,
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('reply never settled')), 100); })]);
    assert.equal(reply.conversationId, 1);
  } finally {
    clearTimeout(timeout);
  }
});
