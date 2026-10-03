import test from 'node:test';
import assert from 'node:assert/strict';
import { createStompLogger } from './stomplogger.js';

const log = { info() {}, warn() {}, error() {}, debug() {} };
for (const [callback, uiCallback] of [
  ['onConnect', 'onConnected'], ['onDisconnect', 'onDisconnected'],
  ['onStompError', 'onError'], ['onWebSocketClose', 'onWsClosed'],
  ['onWebSocketError', 'onError'],
]) {
  test(`logging preserves ${callback} and invokes the optional UI handler`, () => {
    const received = [];
    const client = { [callback]: (event) => received.push(['original', event]) };
    createStompLogger(client, log, { [uiCallback]: (event) => received.push(['ui', event]) });
    const event = { headers: {}, code: 1006 };
    client[callback](event);
    assert.deepEqual(received, [['original', event], ['ui', event]]);
  });
}
