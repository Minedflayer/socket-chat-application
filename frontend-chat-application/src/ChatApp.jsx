import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
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
export default function ChatApp() {
  // --- EXISTING LOGIC & STATE (Kept same as before) ---
  const DM_OPEN_REPLY_DESTS = ["/user/queue/dm/open", "/user/queue/replies"];
  const connectionIdRef = useRef(Math.random().toString(36).slice(2, 8));
  const log = createLogger("CHAT", connectionIdRef);
  const clientRef = useRef(null);

  const [status, setStatus] = useState("disconnected");
  const [latestError, setLatestError] = useState(null);

  // Refactored state names per previous discussion
  const [publicChatMessages, setPublicChatMessages] = useState([]);
  const [roomMessages, setRoomMessages] = useState(new Map());
  const [dmMessages, setDmMessages] = useState(new Map());

  const [notifications, setNotifications] = useState([]);

  // --- UI-only state for switching views ---
  const [currentViewMode, setCurrentViewMode] = useState("global");
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedDmId, setSelectedDmId] = useState(null);

  // Refs
  const roomSubsRef = useRef({});
  const dmSubsRef = useRef({});
  const messageScrollRef = useRef(null);
  const dmRecipientMap = useRef({});

  // Inputs
  const [inputMessage, setInputMessage] = useState("");
  const [newDmTargetInput, setNewDmTargetInput] = useState("");

  // --- NEW: RESIZABLE SIDEBAR STATE ---
  const [sidebarWidth, setSidebarWidth] = useState(260); // Default width
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);

  // --- RESIZE HANDLERS ---
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent) => {
      if (isResizing) {
        // Limit min and max width for sanity
        const newWidth = Math.max(200, Math.min(600, mouseMoveEvent.clientX));
        setSidebarWidth(newWidth);
      }
    },
    [isResizing]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // --- HELPERS (Append, Scroll, etc) ---
  const messagesForView = useMemo(() => {
    if (currentViewMode === "global") return publicChatMessages;
    if (currentViewMode === "room")
      return selectedRoomId != null
        ? roomMessages.get(selectedRoomId) || []
        : [];
    return selectedDmId != null ? dmMessages.get(selectedDmId) || [] : [];
  }, [
    currentViewMode,
    publicChatMessages,
    roomMessages,
    dmMessages,
    selectedRoomId,
    selectedDmId,
  ]);

  const appendGlobal = (msg) => setPublicChatMessages((prev) => [...prev, msg]);

  const appendDm = (conversationId, msg) => {
    setDmMessages((prev) => {
      const next = new Map(prev);
      const arr = next.get(conversationId) ?? [];
      next.set(conversationId, [...arr, msg]);
      return next;
    });
  };

  // Scroll effect
  useEffect(() => {
    if (!messageScrollRef.current) return;
    messageScrollRef.current.scrollTo?.({
      top: messageScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [
    publicChatMessages,
    roomMessages,
    dmMessages,
    currentViewMode,
    selectedDmId,
  ]);

  // --- STOMP SETUP (Same as before) ---
  useEffect(() => {
    setStatus("connecting");
    const token = getToken();
    if (!token) {
      setLatestError("No JWT found");
      setStatus("disconnected");
      return;
    }
    const socket = new SockJS("/chat");
    const client = new StompClient({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      connectHeaders: { Authorization: `Bearer ${token}` },
      onStompError: (f) => log.error("STOMP ERROR", f),
      onWebSocketClose: () => setStatus("disconnected"),
    });

    createStompLogger(client, log);

    client.onConnect = (frame) => {
      setStatus("connected");
      // Subscribe Public
      client.subscribe("/topic/public", (m) => {
        try {
          appendGlobal(JSON.parse(m.body));
        } catch {
          appendGlobal({ content: m.body });
        }
      });
      // Subscribe Notify
      client.subscribe("/user/queue/dm/notify", (m) => {
        // Fixed queue name
        try {
          const n = JSON.parse(m.body);
          setNotifications((prev) => [...prev, n]);
        } catch (e) {
          log.error("Notify parse fail", e);
        }
      });
    };
    client.activate();
    clientRef.current = client;

    return () => {
      clientRef.current?.deactivate();
      setStatus("disconnected");
    };
  }, []);

  // --- ACTION FUNCTIONS (Send, Open, Close) ---
  function sendGlobal() {
    const body = inputMessage.trim();
    if (!clientRef.current || !body) return;
    clientRef.current.publish({
      destination: "/app/message",
      body: JSON.stringify({ content: body }),
      headers: { "x-client-id": connectionIdRef.current },
    });
    setInputMessage("");
  }

  // Request/Reply helper
  function stompRequestReply({
    sendDest,
    replyDests,
    body,
    headers = {},
    timeoutMs = 10000,
  }) {
    // ... (Keep existing implementation)
    return new Promise((resolve, reject) => {
      const client = clientRef.current;
      if (!client) return reject("Not connected");
      const correlationId = headers["correlation-id"];

      let done = false;
      const subs = [];
      const cleanup = (e, d) => {
        if (done) return;
        done = true;
        subs.forEach((s) => s.unsubscribe());
        clearTimeout(timer);
        e ? reject(e) : resolve(d);
      };

      replyDests.forEach((d) => {
        subs.push(
          client.subscribe(d, (f) => {
            if (done) return;
            // rudimentary correlation check
            if (
              correlationId &&
              f.headers["correlation-id"] &&
              f.headers["correlation-id"] !== correlationId
            )
              return;
            cleanup(null, JSON.parse(f.body));
          })
        );
      });

      client.publish({
        destination: sendDest,
        body: JSON.stringify(body),
        headers,
      });
      const timer = setTimeout(() => cleanup("Timeout"), timeoutMs);
    });
  }

  async function openDm(username) {
    if (!clientRef.current) return;
    const cid = Math.random().toString(36).slice(2);
    try {
      const reply = await stompRequestReply({
        sendDest: `/app/dm/${username}/open`,
        replyDests: DM_OPEN_REPLY_DESTS,
        body: { username },
        headers: {
          "x-client-id": connectionIdRef.current,
          "correlation-id": cid,
        },
      });

      if (reply.errorCode) {
        alert(reply.message);
        return null;
      }

      const id = reply.conversationId;

      // Fetch History via REST
      try {
        const h = await fetch(`/api/dm/${id}/messages?limit=50`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }).then((r) => r.json());

        setDmMessages((prev) => {
          const next = new Map(prev);
          next.set(id, h);
          return next;
        });
      } catch (e) {
        console.error(e);
      }

      dmRecipientMap.current[id] = username;

      // Subscribe if not already
      if (!dmSubsRef.current[id]) {
        dmSubsRef.current[id] = clientRef.current.subscribe(
          `/user/queue/dm/${id}`,
          (f) => {
            appendDm(id, JSON.parse(f.body));
          }
        );
      }
      return id;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  function closeDm(id) {
    dmSubsRef.current[id]?.unsubscribe();
    delete dmSubsRef.current[id];
    setDmMessages((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    if (selectedDmId === id) setSelectedDmId(null);
  }

  function sendDm(username, content) {
    clientRef.current.publish({
      destination: `/app/dm/${username}/send`,
      body: JSON.stringify({ content }),
      headers: { "x-client-id": connectionIdRef.current },
    });
  }

  // --- RENDER ---
  const isConnected = status === "connected";

  return (
    // 1. FULL SCREEN LAYOUT (Flex Row)
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* 2. SIDEBAR (Fixed Width based on state, No Border) */}
      <aside
        style={{ width: sidebarWidth }}
        className="flex flex-col bg-slate-900 flex-shrink-0"
      >
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between">
          <h1 className="font-bold text-lg tracking-tight">ChatApp</h1>
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                : "bg-rose-500"
            }`}
          />
        </div>

        {/* View Tabs */}
        <div className="px-3 pb-4 flex gap-1">
          {[
            { id: "global", label: "Global" },
            { id: "room", label: "Rooms" },
            { id: "dm", label: "DMs" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setCurrentViewMode(t.id)}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                currentViewMode === t.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto px-3 space-y-4">
          {/* Global Stats */}
          {currentViewMode === "global" && (
            <div className="rounded-lg bg-slate-800/50 p-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Public Channel
              </p>
              <div className="text-sm text-slate-300">
                {publicChatMessages.length} messages loaded
              </div>
            </div>
          )}

          {/* DM List */}
          {/* New DM Input */}
          {currentViewMode === "dm" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-sm focus:border-blue-500 outline-none"
                  placeholder="username..."
                  value={newDmTargetInput}
                  onChange={(e) => setNewDmTargetInput(e.target.value)}
                />
                <button
                  onClick={async () => {
                    if (!newDmTargetInput.trim()) return;
                    const id = await openDm(newDmTargetInput.trim());
                    if (id) {
                      setSelectedDmId(id);
                      setNewDmTargetInput("");
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 rounded-md text-xs font-medium"
                >
                  Open
                </button>
              </div>

              <ul className="space-y-1">
                {[...dmMessages.keys()].map((cid) => (
                  <li key={cid} className="group flex items-center gap-1">
                    <button
                      onClick={() => setSelectedDmId(cid)}
                      className={`flex-1 text-left px-3 py-2 rounded-md text-sm truncate transition-colors ${
                        selectedDmId === cid
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                      }`}
                    >
                      @ {dmRecipientMap.current[cid] || cid}
                    </button>
                    {/* Close button only shows on hover or active */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeDm(cid);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 transition-opacity"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Connection Debug Footer */}
        <div className="p-3 bg-slate-950/30 text-[10px] text-slate-500 font-mono border-t border-slate-800/50">
          CID: {connectionIdRef.current} <br />
          {status.toUpperCase()}
        </div>
      </aside>

      {/* 3. RESIZE HANDLE */}
      <div
        onMouseDown={startResizing}
        className={`w-1 cursor-col-resize hover:bg-blue-500 transition-colors z-10 ${
          isResizing ? "bg-blue-500" : "bg-transparent"
        }`}
      />

      {/* 4. MAIN CHAT AREA (Fills rest of space) */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
        {/* Chat Header */}
        <header className="h-14 border-b border-slate-800/50 flex items-center px-6 justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-lg">#</span>
            <h2 className="font-semibold text-slate-100">
              {currentViewMode === "global"
                ? "Global Chat"
                : currentViewMode === "dm" && selectedDmId
                ? dmRecipientMap.current[selectedDmId] || "Unknown"
                : "Select a chat"}
            </h2>
          </div>
        </header>

        {/* Messages */}
        <div
          ref={messageScrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {messagesForView.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
              <p>No messages yet</p>
            </div>
          ) : (
            messagesForView.map((m, i) => (
              <div key={i} className="group bg-blue-600">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-medium text-slate-300 text-sm hover:underline cursor-pointer">
                    {m.sender || "Unknown"}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {m.sentAt ? new Date(m.sentAt).toLocaleTimeString() : ""}
                  </span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {m.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 pb-6">
          <div className="relative rounded-lg bg-slate-900 border border-slate-800 focus-within:border-slate-600 transition-colors">
            <input
              className="w-full bg-transparent p-3 text-sm text-slate-200 placeholder-slate-500 outline-none"
              placeholder={`Message #${
                currentViewMode === "global" ? "global" : "user"
              }`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (currentViewMode === "global") sendGlobal();
                  else if (currentViewMode === "dm" && selectedDmId) {
                    const user = dmRecipientMap.current[selectedDmId];
                    if (user) sendDm(user, inputMessage);
                    setInputMessage("");
                  }
                }
              }}
            />
          </div>
          <div className="text-[10px] text-slate-600 mt-2 text-right px-1">
            Return to send • Shift + Return for new line
          </div>
        </div>
      </main>

      {/* Keeping Diagnostics hidden or optional */}
      {/* <DiagnosticsPanel ... /> */}
    </div>
  );
}

// <DiagnosticsPanel
//   connId={clientInstance.current}
//   status={status}
//   messageCount={visibleMessageList.length}
//   latestError={latestError}
// />
