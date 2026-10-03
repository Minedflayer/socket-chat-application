/** Add logging without replacing application connection callbacks. */
export function createStompLogger(client, log, ui) {
  // Keep frame headers (including the token) and message bodies out of debug logs.
  client.debug = (text) => log.debug('STOMP', text.split('\n')[0]);
  const wrap = (name, report, uiHandler) => {
    const original = client[name];
    client[name] = (event) => {
      report(event);
      original?.call(client, event);
      uiHandler?.(event);
    };
  };
  wrap('onConnect', (frame) => log.info('STOMP Connected', frame?.headers), ui?.onConnected);
  wrap('onDisconnect', () => log.info('STOMP Disconnected'), ui?.onDisconnected);
  wrap('onStompError', (frame) => log.error('STOMP Error', frame?.headers), ui?.onError);
  wrap('onWebSocketError', () => log.error('WS ERROR'), ui?.onError);
  wrap('onWebSocketClose', (event) => log.warn('WS CLOSED', { code: event?.code }), ui?.onWsClosed);
  for (const name of ['onUnhandledMessage', 'onUnhandledFrame', 'onUnhandledReceipt']) {
    wrap(name, (frame) => log.warn(name, frame?.headers));
  }
}
