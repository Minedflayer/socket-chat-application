# Socket Chat Application

A learning project for **one-to-one direct messages**, built with React and Spring Boot. Two connected users can open a conversation, exchange messages in real time, and reopen recent history while the backend stays running.

This is a **local development prototype**. It uses development usernames and in-memory H2 storage. Real accounts, private-data authorization, durable storage, and automatic connection recovery are later milestones.

## What works

- A DM-only interface: open, select, and close conversations using a resizable sidebar.
- Messages delivered to both participants over STOMP/SockJS, with sender and timestamp.
- The latest 50 saved messages loaded when reopening a conversation. Closing a conversation does not delete it.
- Saved login survives a frontend reload until the token expires. The conversation list and drafts are local component state and reset on reload.
- Blank messages are rejected; content is trimmed and limited to 2,000 characters on the client and backend.
- Enter sends; Shift + Enter inserts a newline. A Send button is also available.
- Open/send controls are disabled while disconnected. A publishing failure keeps the draft and displays an error.

There is no global chat or room flow. Both users must open the conversation to subscribe to live messages; the app does not automatically populate an inbox or open incoming conversations.

## Requirements

- JDK **17 or newer**; the Maven project targets Java 17.
- Node.js **20.19+ on the 20.x line, or 22.12+**, as required by the locked Vite dependency; npm and Git.
- Internet access for initial dependency installation. Maven 3.9.9 is downloaded by the included wrapper; a separate Maven installation is optional.

The backend uses Spring Boot 3.5.4, Spring WebSocket, Spring Security, Spring Data JPA, Jakarta Validation, H2, and JJWT 0.11.5. The frontend uses React 19, Vite 7, Tailwind CSS 3, `@stomp/stompjs`, and `sockjs-client`.

## Run locally

### 1. Clone

```sh
git clone https://github.com/Minedflayer/socket-chat-application.git
cd socket-chat-application
```

### 2. Start the backend

Set `JWT_SECRET` to a Base64-encoded signing key containing at least **32 random bytes**. The configured fallback `change-me-in-dev` is not a usable key.

**Windows PowerShell**, from the repository root:

```powershell
cd backend
$jwtBytes = New-Object byte[] 32
$jwtRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$jwtRng.GetBytes($jwtBytes)
$env:JWT_SECRET = [Convert]::ToBase64String($jwtBytes)
$jwtRng.Dispose()
.\mvnw.cmd spring-boot:run
```

**Bash**, from the repository root (requires OpenSSL):

```bash
cd backend
export JWT_SECRET="$(openssl rand -base64 32)"
bash ./mvnw spring-boot:run
```

The wrapper is invoked through `bash` because its Git executable bit is not set. For a reusable local key, `spring-dotenv` also supports `backend/.env` containing `JWT_SECRET=<your-generated-base64-key>`. Run from `backend/`; this file is ignored by Git. Changing the key invalidates existing token signatures.

The backend listens on **8080**. `GET http://localhost:8080/healthz` should return `ok`.

### 3. Start the frontend

In a second terminal, from the repository root:

```sh
cd frontend-chat-application
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Vite forwards `/auth`, `/api`, and `/chat` to the backend, including WebSocket traffic. Keep both servers running.

### 4. Try a DM

1. Choose the development username `alice` and select **Login**. No password is required by the endpoint used by the UI.
2. Open a separate browser profile or private window and log in as `bob`. Ordinary tabs on the same origin share the stored token.
3. Wait for both sidebars to show **connected**.
4. Alice enters `bob` under **Direct messages** and selects **Open**. Bob opens `alice` too.
5. Send messages with **Send** or Enter. Close and reopen the conversation to retrieve its recent history.

Use exact username spelling. A target must be online or already appear as a conversation member or message sender. There is no registration or user directory. Self-DMs and usernames containing `/`, `#`, or `?` are rejected by the UI.

## Development commands

Run inside `frontend-chat-application/`:

| Command | Purpose |
| --- | --- |
| `npm ci` | Install locked dependencies |
| `npm run dev` | Start the development server with backend proxies |
| `npm test` | Run Node's built-in regression tests for tokens, DM helpers, and connection callbacks |
| `npm run lint` | Run ESLint |
| `npm run build` | Build the frontend into `dist/` |
| `npm run preview` | Preview `dist/`; the development backend proxies are not provided |

Run inside `backend/`, with `JWT_SECRET` configured:

| Windows | Bash | Purpose |
| --- | --- | --- |
| `.\mvnw.cmd spring-boot:run` | `bash ./mvnw spring-boot:run` | Start the backend |
| `.\mvnw.cmd test` | `bash ./mvnw test` | Run context and DM input regression tests |
| `.\mvnw.cmd package` | `bash ./mvnw package` | Run tests and build the executable JAR |

The backend does not bundle `dist/`. Serving the frontend outside Vite development requires routing `/auth`, `/api`, and `/chat`, including SockJS/WebSocket traffic, to the backend.

## Code and communication

```text
backend/src/main/java/com/message_app/demo/
  auth/             Development login, JWT signing/parsing, HTTP security
  chat/api/         DM open/send handlers, HTTP history, outgoing DTOs
  chat/application/ Conversation lookup/creation and target existence
  chat/domain/      Conversation, ConversationMember, Message
  chat/infrastructure/ Persistence repositories and STOMP interceptors
  realtime/         WebSocket broker and online username tracking
frontend-chat-application/src/
  App.jsx           Saved-login selection
  ChatApp.jsx       DM layout, composer, local drafts
  auth/             Development login and token helpers
  chat/             Connection hook, DM helpers, sidebar and message list
  logging/          Console and STOMP callback logging
```

SockJS connects to `/chat`. The STOMP CONNECT header supplies `Authorization: Bearer <token>`; the backend validates the token's signature and expiry and uses its subject as the session principal. The browser's saved-token check only checks payload format and expiry.

| Route or destination | Behavior |
| --- | --- |
| `POST /auth/dev-login` | Accepts `{"username":"alice"}`; returns a JWT valid for 12 hours and the username |
| `POST /auth/login` | Legacy development endpoint: nonblank username and literal password `password`; one-hour token; unused by the UI |
| `GET /api/dm/{conversationId}/messages?limit=50` | Latest messages returned chronologically; positive `limit`, no cursor/page parameter |
| Send `/app/dm/{otherUserName}/open` | Resolve or create a DM; `{}` is sufficient |
| Subscribe `/user/queue/dm/open` | Requesting session receives `{conversationId, otherUsername}` or `{errorCode, message, otherUsername}` |
| Send `/app/dm/{otherUserName}/send` | `{"content":"Hello Bob"}`; trimmed, nonblank, maximum 2,000 characters |
| Subscribe `/user/queue/dm/{conversationId}` | Saved message: `{id, conversationId, sender, content, sentAt}` |

The UI subscribes before fetching history and merges overlapping messages by ID. The in-process simple broker handles `/queue`; there is no external or durable broker. The backend still emits previews on `/user/queue/dm/notify` with placeholder `unreadCount=1`; the UI does not consume these notifications or display unread counts.

## Storage and current limitations

- **History lasts only for the backend session.** H2 is embedded and in memory. There is no MySQL driver/configuration, persistent datasource, or migration tooling. Backend restart clears conversations and messages.
- **Development identity and access control.** Any nonempty development username can obtain a token. HTTP routes, including message history, are publicly permitted and have no participant checks. WebSocket origins are unrestricted, and `WebSocketSecurityConfig` is not registered as a Spring configuration. This prototype is intended for disposable local test messages.
- **Logging.** Each DM appends participants and content to `message_log.txt` in the backend working directory. The text file is a debug log with no restore mechanism. `LIVE` means the recipient appeared online, not that they read the message. SQL/STOMP logs are enabled in development; the backend currently prints its signing secret at startup.
- **Connection recovery.** Automatic reconnect is disabled until subscriptions and missed-message recovery are implemented. On connection loss, copy any draft before reloading to reconnect. If the backend key changed, clear the site's stored token and sign in again.
- **Conversation discovery.** Reload clears the browser's conversation list; reopen a username to load history. Online tracking is a set of usernames rather than a full account/session directory, so multiple sessions per username are not reliably tracked.

The next priorities are real accounts and participant authorization (including removing signing-secret logging), durable storage and conversation discovery, then reconnect/subscription recovery. Notifications and other chat features follow those foundations.
