# Plan: a focused DM application

## Goal

Make the current application a dependable prototype for direct messages between two users. The first milestone is: sign in, open a conversation, exchange messages, and reopen that conversation during the same backend session.

Starting point: GitHub origin/main at fb423fb84b26ebd9c92a99d923d13f772ce119fb, fetched on 3 October 2026. Worktree: dm-only. Branch: codex/dm-only.

The user approved this plan before implementation. The completed milestone and verification are recorded in todo.md and verification.md.

## First milestone

1. Establish the baseline: check existing builds, lint, backend context test, and two-browser DM behavior. Record existing failures separately so they are not mistaken for regressions.
2. Simplify the interface: remove Global and Rooms controls, state, subscriptions, and send paths. Show the DM list and a clear empty state immediately after login.
3. Remove public chat from the backend: delete the public message handler and its unused DTO/dependencies; keep the DM open/send destinations and history route unchanged. Review broker configuration for destinations made obsolete by the removal.
4. Fix saved-login handling: correctly decode the JWT payload and compare its expiry in milliseconds. Valid saved tokens should reopen chat; expired or malformed tokens should return to login.
5. Make DM sending predictable: trim and validate content, enforce the existing 2,000-character storage limit, disable open/send actions while disconnected, and retain the draft when publishing fails. Ensure connection callbacks update UI state reliably.
6. Document and verify the result: update the README to describe the implemented DM-only prototype and exercise the main flow with two separate browser sessions.

Detailed acceptance criteria, dependencies, and verification are in todo.md. Each step should be a small, separately reviewable change.

## Acceptance for this milestone

- Only direct-message conversations appear in the UI; the public message handler is removed.
- Two connected users can open the same conversation, exchange valid messages, and reopen its history without restarting the backend.
- Saved valid login survives a frontend reload; expired or malformed tokens do not.
- Empty/overlong messages are rejected, and disconnected actions do not silently discard a draft.
- Documentation describes the actual behavior and limitations.

## Boundaries

Retain React/Vite, Spring Boot, STOMP/SockJS, the existing DM routes, and the current data model. Keep the current development login and in-memory H2 for this first milestone, clearly labelled in the README.

The separately prepared README update is in another worktree and has not been published. Reconcile its verified documentation with this branch when updating the README, then adjust it for DM-only behavior.

## Later milestones

1. Identity and privacy: real accounts and authentication for HTTP requests; participant checks on message history and conversation access; remove signing-secret logging. Complete this before using real personal messages.
2. Durable conversations: messages survive backend restarts, and the UI lists existing conversations after login.
3. Connection recovery: create a fresh transport for reconnects, restore DM subscriptions, and fetch missed messages without duplicates.

Notifications and unread counts come after those foundations. Read receipts, typing indicators, attachments, and group chats remain future decisions.

## Risks and verification

- Main's current HTTP history route allows public access, and development login permits choosing any username. The first milestone remains a development prototype.
- Main uses H2 without a persistent datasource; backend restart clears history. Reopening history in milestone one means within the same backend session.
- Existing build/lint failures may affect the baseline. Resolve a blocker as its own bounded task before dependent work; do not fold unrelated cleanup into feature removal.
- Run frontend build and lint plus the backend context test with a disposable JWT_SECRET. Review logs without exposing the signing key or tokens.
- Use separate browser profiles/private sessions for alice and bob. Verify opening, sending, closing/reopening, frontend reload, invalid input, and disconnected behavior.

## Review checkpoints

Review after the UI/backend scope reduction, and again after the reliability fixes and documentation. The first milestone was implemented after user approval; later milestones require a new task decision.
