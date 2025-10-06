// @ts-check

/**
 * Callback hooks you can optionally provide to reflect STOMP/WebSocket events
 * in your React UI.
 *
 * @typedef {Object} UiHandlers
 * @property {(frame:any)=>void} [onConnected]    - Called when STOMP connects
 * @property {(frame?:any)=>void} [onDisconnected] - Called when STOMP disconnects
 * @property {(err:any)=>void} [onError]          - Called when an error occurs
 * @property {(ev:CloseEvent)=>void} [onWsClosed] - Called when the WebSocket closes
 */

/**
 * Attach logging and optional UI handlers to a STOMP client.
 *
 * @param {any} client STOMP client instance
 * @param {{info:Function, warn:Function, error:Function, debug:Function}} log Logger API
 * @param {UiHandlers} [ui] Optional UI callbacks
 */
export function createStompLogger(client, log, ui) {
  client.debug = (str) => log.debug("STOMP", str);

  client.onConnect = (frame) => {
    log.info("STOMP Connected", frame?.headers);
    ui?.onConnected?.(frame);
  };

  client.onDisconnect = (frame) => {
    log.info("STOMP Disconnected", frame?.headers ?? {});
    ui?.onDisconnected?.(frame);
  };

  client.onStompError = (frame) => {
    log.error("STOMP Error", { headers: frame?.headers, body: frame?.body });
    ui?.onError?.(frame);
  };

  client.webSocketError = (event) => {
    log.error("WS ERROR", event?.message || event);
    ui?.onError?.(event);
  };

  client.onWebSocketClose = (event) => {
    log.warn("WS CLOSED", { code: event?.code, reason: event?.reason, wasClean: event?.wasClean });
    ui?.onWsClosed?.(event);
  };

  
  client.onUnhandledMessage = (message) => log.warn("WS UNHANDLED MESSAGE", message);
  client.onUnhandledFrame   = (frame)   => log.warn("WS UNHANDLED FRAME", frame);
  client.onUnhandledReceipt = (receipt) => log.warn("WS UNHANDLED RECEIPT", receipt);
}
