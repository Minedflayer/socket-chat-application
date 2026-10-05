# DM-only milestone verification

Branch: `codex/dm-only`, based on `origin/main` at `fb423fb84b26ebd9c92a99d923d13f772ce119fb`.

## Baseline

- Frontend build passed; lint had nine errors and one warning in the files replaced by this milestone.
- Backend context test passed with a disposable signing key.
- `npm ci` installed the existing lockfile and reported 22 vulnerabilities (2 low, 3 moderate, 16 high, 1 critical). Dependency upgrades remain a separate task; the lockfile and dependency versions are unchanged.
- The initial browser showed the existing login form. The original interface connected to the public topic before the replacement. Two-user behavior was verified after implementation rather than as a separate pre-change browser test.
- Starting Java through this Codex Windows environment initially failed with `Unable to establish loopback connection`. A runtime-only `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:/Windows/Temp` allowed the preview backend to start. This option is not committed as application configuration. A similar runner issue is reported at https://github.com/openai/codex/issues/40902.

## Automated checks

- Frontend: 15 Node tests cover valid/expired/malformed/Base64URL tokens, callback preservation, content boundaries, disconnected sends, transport publish failure, history/live deduplication, request cancellation, and cleanup failure.
- Backend: three new DM input tests plus the existing context test pass. They cover trimming, blank/null/2,001-character rejection, 2,000-character acceptance, and activation of payload validation on the STOMP send method.
- Frontend production build and ESLint pass.
- Regression tests failed before the relevant fixes: backend input/validation tests, logger callback tests, and the transport cleanup race test. A mutation of the client length condition also causes the DM helper suite to fail.
- No remaining public-topic/global/room references in application source. `git diff --check` passes.

## Browser checks

Two independent origins (`127.0.0.1:15173` and `localhost:15173`) isolate local storage for disposable Alice and Bob sessions while using the same backend.

- Both users sign in and see a DM-only empty state with connected status.
- Alice opens Bob; Bob opens Alice. Both receive the same saved messages in both directions.
- Leading/trailing whitespace is removed. Blank Enter submission shows an error and sends nothing; the composer declares `maxlength=2000`.
- Shift+Enter creates a newline, and the multiline message reaches the other user.
- Closing/reopening reloads recent history without duplicate messages and retains that conversation's local draft.
- Frontend reload preserves Alice's valid login. Reopening Bob loads the existing history from the same backend session.
- Bob's 320-pixel viewport has no horizontal page overflow (`clientWidth=scrollWidth=320`). Temporary viewport overrides were reset.
- Stopping the owned preview backend changes status to disconnected, disables Open/Send, and retains the draft in a read-only textarea that can be focused for copying.

The preview backend and Vite process were stopped after verification. Generated test message-log changes were restored only in this new worktree; the original checkout's README and message-log edits were preserved.

## Review and remaining scope

The implementation was reviewed across correctness, readability, architecture, security, and performance. An independent read-only review reported no high-confidence introduced defects. A separate final error-path check identified and fixed a request-cleanup race, with a failing/passing regression test.

This remains a local development prototype. Development identity, public HTTP history, unregistered WebSocket authorization configuration, signing-secret logging, in-memory H2, incomplete multi-session online tracking, conversation discovery, and automatic reconnect are documented limitations retained from the approved plan. Accounts/privacy, durable storage, and connection recovery are later milestones.
