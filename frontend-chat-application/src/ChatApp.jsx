//ChatApp.jsx September-23-2025-kl-12-47

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Client as StompClient } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { createStompLogger } from "./logging/stomplogger";
import { createLogger } from "./logging/logger";
import DiagnosticsPanel from "./diagnostics/DiagnosticsPanel";
import { getToken } from "./auth/AuthService";

/**
 * Single STOMP connection that handles:
 * - Global chat (/topic/public)
 * - Rooms (/topic/room/{roomId})
 * - DMs via per-user queues (/user/queue/dm/{conversationId})
 *
 */
// ChatApp Component
export default function ChatApp() {
  // constants (top of file)
  const DM_OPEN_REPLY_DESTS = ["/user/queue/dm/open", "/user/queue/replies"];

  const connectionIdRef = useRef(Math.random().toString(36).slice(2, 8));
  const log = createLogger("CHAT", connectionIdRef);
  const clientRef = useRef(null);
  const [status, setStatus] = useState("disconnected");
  const [latestError, setLatestError] = useState(null);
  const [globalMessages, setGlobalMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [rooms, setRooms] = useState(new Map());
  const roomSubsRef = useRef({});
  const [dmConversations, setDmConversations] = useState(new Map());
  const dmSubsRef = useRef({});
  const listRef = useRef(null);

  const dmPeersRef = useRef({});

  // --- UI-only state for switching views ---
  const [activeTab, setActiveTab] = useState("global"); // "global" | "room" | "dm"
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedDmId, setSelectedDmId] = useState(null);

  // quick sidebar inputs
  const [roomInput, setRoomInput] = useState("");
  const [dmUserInput, setDmUserInput] = useState("");

  // Resolve which messages to show in the main list
  const messagesForView = useMemo(() => {
    if (activeTab === "global") return globalMessages;
    if (activeTab === "room")
      return selectedRoomId != null ? rooms.get(selectedRoomId) || [] : [];
    // dm
    return selectedDmId != null ? dmConversations.get(selectedDmId) || [] : [];
  }, [
    activeTab,
    globalMessages,
    rooms,
    dmConversations,
    selectedRoomId,
    selectedDmId,
  ]);

  const appendGlobal = (msg) => setGlobalMessages((prev) => [...prev, msg]);
  const appendRoom = (roomId, msg) => {
    setRooms((prev) => {
      const next = new Map(prev);
      const arr = next.get(roomId) ?? [];
      next.set(roomId, [...arr, msg]);
      return next;
    });
  };
  const appendDm = (conversationId, msg) => {
    setDmConversations((prev) => {
      const next = new Map(prev);
      const arr = next.get(conversationId) ?? [];
      next.set(conversationId, [...arr, msg]);
      return next;
    });
  };

  useEffect(() => {
    setStatus("connecting");
    log.info("init STOMP client");
    const token = getToken();
    if (!token) {
      const err = "No JWT found; abort connection.";
      log.error(err);
      setLatestError(err);
      setStatus("disconnected");
      return;
    }
    const socket = new SockJS("/chat");
    const client = new StompClient({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      heartbeatOutgoing: 10000,
      heartbeatIncoming: 10000,
      connectHeaders: {
        //"x-username": connectionIdRef.current,
        Authorization: `Bearer ${token}`
      },
      onStompError: (frame) => {
        log.error("STOMP ERROR", { headers: frame.headers, body: frame.body });
        setLatestError(frame.body || "STOMP error");
      },
      onWebSocketClose: (evt) => {
        log.warn("WebSocket closed", { code: evt.code, reason: evt.reason });
        setStatus("disconnected");
      },
      onWebSocketError: (evt) => {
        log.error("WebSocket error", { evt });
        setLatestError("WebSocket error");
      },
    });
    createStompLogger(client, log);
    const originalOnConnect = client.onConnect;
    client.onConnect = (frame) => {
      originalOnConnect?.(frame);
      setStatus("connected");
      log.info("STOMP connected", { headers: frame.headers });
      client.subscribe("/topic/public", (message) => {
        const fromClientId = message.headers["x-client-id"];
        log.info("RECV /topic/public", { fromClientId, body: message.body });
        try {
          const payload = JSON.parse(message.body);
          appendGlobal(payload);
        } catch {
          appendGlobal({ content: message.body });
        }
      });
      client.subscribe("/user/queue/whoami", (f) => {
        console.log("WHOAMI reply:", f.body);
      });

      // Send a ping to trigger the reply
      client.publish({
        destination: "/app/whoami",
        body: "{}",
        headers: { "x-client-id": connectionIdRef.current },
      });
    };
    client.activate();
    clientRef.current = client;
    return () => {
      Object.values(roomSubsRef.current).forEach((sub) => sub?.unsubscribe());
      roomSubsRef.current = {};
      Object.values(dmSubsRef.current).forEach((sub) => sub?.unsubscribe());
      dmSubsRef.current = {};
      clientRef.current?.deactivate();
      clientRef.current = null;
      setStatus("disconnected");
    };
  }, []);

  // Scroll-effect
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTo?.({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [globalMessages, rooms, dmConversations]);

  // Function for sending a message on the global "channel"
  function sendGlobal() {
    const body = inputMessage.trim();
    if (!clientRef.current || !body) return;
    clientRef.current.publish({
      destination: "/app/message",
      body: JSON.stringify({ content: body }),
      headers: { "x-client-id": connectionIdRef.current },
    });
    log.info("SEND /app/message", { content: body });
    setInputMessage("");
  }

  // function joinRoom(roomId) {
  //   if (!clientRef.current || roomSubsRef.current[roomId]) return;
  //   const dest = `/topic/room/${roomId}`;
  //   log.info("SUB room", { roomId, dest });
  //   roomSubsRef.current[roomId] = clientRef.current.subscribe(dest, (frame) => {
  //     const fromClientId = frame.headers["x-client-id"];
  //     log.info("RECV room", { roomId, fromClientId, body: frame.body });
  //     try {
  //       appendRoom(roomId, JSON.parse(frame.body));
  //     } catch {
  //       appendRoom(roomId, { content: frame.body });
  //     }
  //   });
  // }

  // function leaveRoom(roomId) {
  //   roomSubsRef.current[roomId]?.unsubscribe();
  //   delete roomSubsRef.current[roomId];
  //   log.info("UNSUB room", { roomId });
  // }

  // function sendToRoom(roomId, content) {
  //   if (!clientRef.current || !content.trim()) return;
  //   const body = { content, roomId };
  //   clientRef.current.publish({
  //     destination: `/app/room/${roomId}/send`,
  //     body: JSON.stringify(body),
  //     headers: { "x-client-id": connectionIdRef.current },
  //   });
  //   log.info("SEND room", { roomId, content });
  // }

  // replace openDm with a POST-first approach and env-based base URL

  // subscribe-first request/reply helper
  function stompRequestReply({
    sendDest,
    replyDests,
    body,
    headers = {},
    timeoutMs = 10000,
  }) {
    return new Promise((resolve, reject) => {
      const client = clientRef.current;
      if (!client) return reject(new Error("STOMP not connected"));

      let done = false;
      const subs = [];

      const cleanup = (err, data) => {
        if (done) return;
        done = true;
        subs.forEach((s) => s?.unsubscribe?.());
        clearTimeout(timer);
        err ? reject(err) : resolve(data);
      };

      // Subscribe FIRST
      for (const dest of replyDests) {
        const sub = client.subscribe(dest, (frame) => {
          if (done) return;
          try {
            // If server sets correlation-id, enforce it; otherwise accept first JSON reply
            const reqCid = frame.headers["correlation-id"];
            const gotCid = frame.headers["correlation-id"];
            if (reqCid && gotCid && gotCid !== reqCid) return;
            // if (headers["correlation-id"] && cid && cid !== headers["correlation-id"]) return;

            const data = JSON.parse(frame.body);
            // If we expected a correlation-id but server didn't send one, still allow the first JSON reply
            cleanup(null, data);
          } catch {
            // ignore non-JSON
          }
        });
        subs.push(sub);
      }

      // Then publish
      client.publish({
        destination: sendDest,
        body: typeof body === "string" ? body : JSON.stringify(body ?? {}),
        headers,
      });

      const timer = setTimeout(
        () => cleanup(new Error("Timed out waiting for STOMP reply")),
        timeoutMs
      );
    });
  }

  /**
   * STOMP request/reply helper
   * Sends a message to `destination` and waits for a reply on that same destination.
   * If `correlationId` is given, it is sent as a header and also used to filter the reply.
   * If no reply is received within `timeoutMs`, the promise rejects.
   * @param {*} destination
   * @param {*} correlationId
   * @param {*} timeoutMs
   * @returns
   *
   */
  function waitForStompReply(destination, correlationId, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      if (!clientRef.current)
        return reject(new Error("Reject: STOMP not connected"));

      let done = false;
      const sub = clientRef.current.subscribe(destination, (frame) => {
        const cid = frame.headers["correlation-id"];
        if (cid && cid !== correlationId) return;

        try {
          const data = JSON.parse(frame.body);
          if (!done) {
            done = true;
            sub.unsubscribe();
            resolve(data);
          }
        } catch (e) {
          if (!done) {
            sub.unsubscribe();
            reject(new Error("Invalid JSON on STOMP in reply"));
          }
        }
      });

      const t = setTimeout(() => {
        if (!done) {
          done = true;
          sub.unsubscribe();
          reject(new Error("Timed out waiting for STOMP reply"));
        }
      }, timeoutMs);
      // cleanup on resolve/reject
      const finish = (fn) => (v) => {
        clearTimeout(t);
        fn(v);
      };
      // // wrap resolve/reject to ensure cleanup
      // resolve = finish(resolve);
      // reject = finish(reject);
    });
  }

  // REPLACE openDm with this subscribe-first version
  async function openDm(otherUsername) {
    if (!clientRef.current) throw new Error("STOMP not connected");

    const correlationId = Math.random().toString(36).slice(2);
    const sendDest = `/app/dm/${encodeURIComponent(otherUsername)}/open`;

    const reply = await stompRequestReply({
      sendDest: `/app/dm/${encodeURIComponent(otherUsername)}/open`,
      replyDests: DM_OPEN_REPLY_DESTS, // listens on both common choices
      body: { username: otherUsername },
      headers: {
        "x-client-id": connectionIdRef.current,
        "correlation-id": correlationId, // server can echo this back; code tolerates if it doesn't
      },
      timeoutMs: 10000,
    });

    // Reply logging
    log.info("openDm reply parsed", reply);

    // === HERE is the check ===
    if (reply?.errorCode === "USER_NOT_FOUND") {
      setLatestError(`User "${reply.otherUsername}" was not found`);
      log.warn("DM open failed: user not found", reply);
      return null;
    }

    const conversationId = reply?.conversationId;
    if (!conversationId)
      throw new Error("Missing conversationId in STOMP reply");

    // remember peer mapping and subscribe to the conversation queue
    dmPeersRef.current[conversationId] = otherUsername;

    if (!dmSubsRef.current[conversationId]) {
      const dest = `/user/queue/dm/${conversationId}`;
      dmSubsRef.current[conversationId] = clientRef.current.subscribe(
        dest,
        (frame) => {
          try {
            const msg = JSON.parse(frame.body);
            appendDm(msg.conversationId ?? conversationId, msg);
          } catch {
            appendDm(conversationId, { content: frame.body });
          }
        }
      );
    }

    return conversationId;
  }

  function closeDm(conversationId) {
    dmSubsRef.current[conversationId]?.unsubscribe();
    delete dmSubsRef.current[conversationId];
    log.info("UNSUB dm", { conversationId });
  }

  function sendDm(otherUsername, content) {
    if (!clientRef.current || !content.trim()) return;
    clientRef.current.publish({
      destination: `/app/dm/${encodeURIComponent(otherUsername)}/send`,
      body: JSON.stringify({ content }),
      headers: { "x-client-id": connectionIdRef.current },
    });
    log.info("SEND dm", { otherUsername, content });
  }

  // helper: send by username in the sidebar input (creates/opens DM if needed)
  async function ensureDmAndSend(targetUsername, content) {
    if (!clientRef.current || !targetUsername?.trim() || !content.trim())
      return;

    // try to find existing conversation for this username
    let cid = Object.keys(dmPeersRef.current).find(
      (k) => dmPeersRef.current[k] === targetUsername
    );

    if (!cid) {
      cid = await openDm(targetUsername.trim());
      if (!cid) return;
      setActiveTab("dm");
      setSelectedDmId(cid);
    }

    sendDm(targetUsername.trim(), content.trim());
    setInputMessage("");
  }

  // Whether the chat is connected
  const isConnected = status === "connected";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl p-5 sm:p-6">
          {/* HEADER */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold">Chat</h1>
            <div className="flex items-center gap-2">
              <span
                className={[
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs capitalize",
                  status === "connected" &&
                    "border-emerald-600/40 bg-emerald-600/10 text-emerald-300",
                  status === "connecting" &&
                    "border-amber-600/40 bg-amber-600/10 text-amber-300",
                  status === "disconnected" &&
                    "border-slate-700 bg-slate-800 text-slate-300",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                {status}
              </span>
            </div>
          </div>

          {/* TABS */}
          <div className="mb-3 flex gap-2">
            {[
              { id: "global", label: "Global" },
              { id: "room", label: "Rooms" },
              { id: "dm", label: "DMs" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={[
                  "rounded-xl border px-3 py-1.5 text-sm",
                  activeTab === t.id
                    ? "border-blue-700 bg-blue-600 text-white"
                    : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700",
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* LAYOUT: sidebar (rooms/DMs) + main thread */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
            {/* SIDEBAR */}
            <aside className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-4">
              {/* Global quick info */}
              <div className="rounded-lg border border-slate-800 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Global</span>
                  <span className="text-xs text-slate-400">
                    {globalMessages.length} msgs
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab("global")}
                  className={[
                    "mt-2 w-full rounded-lg border px-2 py-1.5 text-sm",
                    activeTab === "global"
                      ? "border-blue-700 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-800 hover:bg-slate-700",
                  ].join(" ")}
                >
                  View global
                </button>
              </div>

              {/* DMs block */}
              <div className="rounded-lg border border-slate-800 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">DMs</span>
                  <span className="text-xs text-slate-400">
                    {dmConversations.size} open
                  </span>
                </div>

                {/* Open DM */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="username"
                    value={dmUserInput}
                    onChange={(e) => setDmUserInput(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button
                    className="rounded-lg border border-emerald-700 bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
                    onClick={async () => {
                      if (!dmUserInput.trim()) return;
                      const target = dmUserInput.trim();
                      log.info("Attempting to open DM", { target });

                      try {
                        const id = await openDm(target); // your STOMP request→reply function
                        if (id) {
                          setActiveTab("dm");
                          setSelectedDmId(id);
                          log.info("DM opened OK", {
                            target,
                            conversationId: id,
                          });
                        } else {
                          log.warn("DM open returned null/undefined", {
                            target,
                          });
                          setLatestError(
                            `Could not open DM with "${target}". No conversationId returned.`
                          );
                        }
                      } catch (e) {
                        log.error("openDm threw", {
                          target,
                          error: e?.message,
                        });
                        setLatestError(e?.message || "openDm failed");
                      }
                    }}
                    disabled={!isConnected}
                  >
                    Open
                  </button>
                </div>

                {/* List of open DMs */}
                <ul className="mt-3 space-y-2">
                  {[...dmConversations.keys()].map((cid) => (
                    <li
                      key={String(cid)}
                      className="flex items-center justify-between gap-2"
                    >
                      <button
                        className={[
                          "flex-1 truncate rounded-md border px-2 py-1.5 text-left text-sm",
                          selectedDmId === cid && activeTab === "dm"
                            ? "border-blue-700 bg-blue-600 text-white"
                            : "border-slate-700 bg-slate-800 hover:bg-slate-700",
                        ].join(" ")}
                        onClick={() => {
                          setActiveTab("dm");
                          setSelectedDmId(cid);
                        }}
                      >
                        DM #{String(cid)}
                      </button>
                      <button
                        className="rounded-md border border-rose-700 bg-rose-600 px-2 py-1.5 text-xs text-white hover:bg-rose-500"
                        onClick={() => {
                          closeDm(cid);
                          if (selectedDmId === cid) setSelectedDmId(null);
                        }}
                      >
                        Close
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            {/* MAIN THREAD */}
            <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:p-4">
              {/* Context header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm text-slate-300">
                  {activeTab === "global" && (
                    <span>
                      Viewing: <b>Global</b>
                    </span>
                  )}
                  {activeTab === "room" && (
                    <span>
                      Viewing: <b>Room {selectedRoomId ?? "—"}</b>
                    </span>
                  )}
                  {activeTab === "dm" && (
                    <span>
                      Viewing: <b>DM {selectedDmId ?? "—"}</b>
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  {messagesForView.length} messages
                </div>
              </div>

              {/* MESSAGE LIST */}

              <div
                ref={listRef}
                className="h-[50vh] min-h-[280px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:p-4"
              >
                {messagesForView.length === 0 ? (
                  <p className="text-sm italic text-slate-400">
                    Inga meddelanden ännu.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {messagesForView.map((m, i) => (
                      <li
                        key={i}
                        className="max-w-[85%] break-words rounded-xl border border-slate-800 bg-slate-800/40 px-3 py-2"
                      >
                        <div className="text-xs text-slate-400">
                          {m.sender ?? "unknown"}
                        </div>
                        <div className="text-sm">{m.content ?? String(m)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* INPUT */}
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder={
                    !isConnected
                      ? "Inte ansluten"
                      : activeTab === "global"
                      ? "Skriv meddelande till Global"
                      : activeTab === "room"
                      ? `Meddelande till Room ${selectedRoomId ?? "—"}`
                      : `Meddelande till DM ${selectedDmId ?? "—"}`
                  }
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={async (e) => {
                    if (
                      e.key !== "Enter" ||
                      !isConnected ||
                      !inputMessage.trim()
                    )
                      return;
                    if (activeTab === "global") {
                      sendGlobal();
                    } else if (activeTab === "room" && selectedRoomId != null) {
                      sendToRoom(selectedRoomId, inputMessage.trim());
                      setInputMessage("");
                    } else if (activeTab === "dm" && selectedDmId != null) {
                      const selectedUser =
                        (selectedDmId && dmPeersRef.current[selectedDmId]) ||
                        dmUserInput.trim();
                      if (!selectedUser) return;
                      await ensureDmAndSend(selectedUser, inputMessage);
                      // For DM sending, you may use otherUsername route,
                      // but since we subscribe by conversationId, keep a quick field for username in the sidebar.
                      // If you prefer to send by username, expose a small input near the send button.
                      // Here we assume you want to send by conversation peer’s username; adapt as needed:
                      // sendDm(peerUsername, inputMessage.trim());
                      // fallback: we can’t resolve peer username here, so just block Enter-send if unknown.
                    }
                  }}
                  disabled={!isConnected}
                  className={[
                    "flex-1 rounded-xl border bg-slate-900 px-3 py-2 outline-none transition",
                    "border-slate-800 placeholder:text-slate-500",
                    "focus:border-blue-600 focus:ring-2 focus:ring-blue-500/40",
                    !isConnected && "opacity-60 cursor-not-allowed",
                  ].join(" ")}
                />
                {/* Contextual send button */}
                {activeTab === "global" && (
                  <button
                    onClick={() =>
                      isConnected && inputMessage.trim() && sendGlobal()
                    }
                    disabled={!isConnected || !inputMessage.trim()}
                    className={[
                      "rounded-xl border px-4 py-2 font-semibold text-white transition active:translate-y-px",
                      "border-blue-700 bg-blue-600 hover:bg-blue-500",
                      (!isConnected || !inputMessage.trim()) &&
                        "opacity-60 cursor-not-allowed hover:bg-blue-600",
                    ].join(" ")}
                  >
                    Skicka
                  </button>
                )}
                {activeTab === "room" && (
                  <button
                    onClick={() => {
                      if (
                        !isConnected ||
                        !inputMessage.trim() ||
                        selectedRoomId == null
                      )
                        return;
                      sendToRoom(selectedRoomId, inputMessage.trim());
                      setInputMessage("");
                    }}
                    disabled={
                      !isConnected ||
                      !inputMessage.trim() ||
                      selectedRoomId == null
                    }
                    className={[
                      "rounded-xl border px-4 py-2 font-semibold text-white transition active:translate-y-px",
                      "border-indigo-700 bg-indigo-600 hover:bg-indigo-500",
                      (!isConnected ||
                        !inputMessage.trim() ||
                        selectedRoomId == null) &&
                        "opacity-60 cursor-not-allowed hover:bg-indigo-600",
                    ].join(" ")}
                  >
                    Skicka till Room
                  </button>
                )}
                {activeTab === "dm" && (
                  <button
                    onClick={async () => {
                      if (!isConnected || !inputMessage.trim()) return;
                      // For DMs we publish by username per your server API.
                      // Provide a quick prompt to target username:
                      //const uname = dmPeersRef.current[selectedDmId];
                      const uname = dmPeersRef.current[selectedDmId];
                      if (uname) {
                        sendDm(uname, inputMessage.trim());
                        setInputMessage("");
                      }
                    }}
                    disabled={
                      !isConnected ||
                      !inputMessage.trim() ||
                      selectedDmId == null ||
                      !dmPeersRef.current[selectedDmId]
                    }
                    className={[
                      "rounded-xl border px-4 py-2 font-semibold text-white transition active:translate-y-px",
                      "border-emerald-700 bg-emerald-600 hover:bg-emerald-500",
                      //(!isConnected || !inputMessage.trim() || selectedDmId == null || !dmPeersRef.current[selectedDmId]) &&
                      (!isConnected || !inputMessage.trim()) &&
                        "opacity-60 cursor-not-allowed hover:bg-emerald-600",
                    ].join(" ")}
                  >
                    Skicka DM
                  </button>
                )}
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Tips: Tryck Enter för att skicka. Knappen/inmatningen
                inaktiveras när chatten inte är ansluten.
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Diagnostics panel for development/debugging */}
      <DiagnosticsPanel
        connId={connectionIdRef.current}
        status={status}
        messageCount={messagesForView.length}
        latestError={latestError}
      />
    </div>
  );
}
