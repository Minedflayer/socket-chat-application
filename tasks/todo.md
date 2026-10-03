# DM-only milestone task list

## 1. Establish the baseline

- [x] Check frontend build/lint and backend context test with a disposable JWT_SECRET.
- [x] Record existing failures; verify the DM flow with two independent browser sessions after implementation (see verification.md for baseline limits).

Acceptance: the current state and any blocking failures are documented.
Verification: npm run build, npm run lint, and the Maven wrapper test command; two-browser smoke check.
Dependencies: none.
Files: no application files planned; any required baseline repair must be scoped separately.

## 2. Simplify the frontend to DMs

- [x] Remove Global/Rooms views, state, subscriptions, and send actions.
- [x] Preserve opening, selecting, closing, and viewing a DM, with a clear empty state.

Acceptance: login opens a DM-only interface; both participants can select their conversation.
Verification: frontend build and a browser check of empty/open/selected/closed states.
Dependencies: task 1.
Likely files: frontend-chat-application/src/ChatApp.jsx (small).

## 3. Remove the public backend handler

- [x] Remove /app/message and its unused payload/dependencies.
- [x] Keep /api/dm/{conversationId}/messages and DM STOMP destinations unchanged; remove obsolete broker configuration where appropriate.

Acceptance: public chat has no application handler, and existing DM history/open/send contracts remain intact.
Verification: backend context test; inspect remaining destination references and exercise DM open/send/history.
Dependencies: task 2.
Likely files: backend/src/main/java/com/message_app/demo/chat/api/ChatController.java, chat/api/dto/ChatMessage.java, realtime/WebSocketConfig.java, chat/infrastructure/ws/WebSocketSecurityConfig.java (medium).

## Checkpoint: scope reduction

- [x] Review the UI/backend diff; confirm DM-only behavior and no loss of the DM history route.

## 4. Correct saved-login handling

- [x] Decode Base64URL JWT payloads correctly and use exp * 1000 for expiry.
- [x] Reuse valid saved tokens; reject expired/malformed tokens.

Acceptance: frontend reload preserves a valid login; invalid tokens show the login form.
Verification: focused checks with valid, expired, malformed, and Base64URL payloads, plus browser reload.
Dependencies: task 3.
Likely files: frontend-chat-application/src/App.jsx and src/auth/AuthService.js (small).

## 5. Make DM open/send actions reliable

- [x] Block open/send while disconnected or without a selected recipient; make connection callbacks update status.
- [x] Trim content and reject blank or more than 2,000-character messages on the client and backend.
- [x] Preserve the draft when publishing fails and show an actionable error.

Acceptance: valid messages reach both participants; invalid/disconnected actions are handled without silently discarding input.
Verification: boundary-input checks and two-browser send/disconnect checks.
Dependencies: task 4.
Likely files: frontend-chat-application/src/ChatApp.jsx, src/logging/stomplogger.js, backend/src/main/java/com/message_app/demo/chat/api/DmWebSocketController.java (medium).

## 6. Update documentation and verify the milestone

- [x] Describe only the implemented DM flow, setup, and prototype limitations in README.md.
- [x] Verify login, opening, sending, closing/reopening history, reload, invalid input, and disconnected behavior with two browser sessions.

Acceptance: the README matches the DM-only implementation and the acceptance checks in plan.md are satisfied.
Verification: frontend build/lint, backend context test, README command/route checks, and browser smoke checks; report any remaining failures explicitly.
Dependencies: tasks 2-5.
Likely files: README.md and these planning checklists (small).

## Checkpoint: first milestone complete

- [x] Prepare changes and verification results for user review; keep the account/privacy milestone as later work.
