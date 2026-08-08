# Group Pet Replies And Mobile Header Design

## Scope

- In pair rooms, Xiaoduoli batches user messages received within 1.5 seconds and replies once with the latest room context.
- If another batch arrives while a reply is being generated, it waits for the current reply and then receives its own 1.5-second batching window.
- The existing proactive toggle controls automatic pair-room replies and proactive pair-room chatter. Direct messages keep their immediate reply behavior.
- An active pair room gets a proactive Xiaoduoli message every randomized 10-20 minutes. A room becomes inactive after 45 minutes without a user message, so Xiaoduoli does not talk to itself indefinitely.
- Mobile headers fully cover the top safe area while content scrolls underneath.
- Transparent Xiaoduoli PNGs render without multiply blending or colored avatar backgrounds.

## Architecture

`petBrain` owns per-room reply debounce timers, in-flight reply state, last user activity, and proactive chatter timers. Existing message persistence and Socket events remain the only delivery path. Timers are process-local and intentionally reset by a server restart.

The frontend fix is CSS-led: headers use opaque surfaces, top-level panels paint the safe-area background, and pet avatar containers use transparent backgrounds with `object-fit: contain`.

## Error Handling

AI failures continue through the existing logged `speak` failure path. Timer callbacks re-read the room and its proactive setting before generating anything. A failed reply does not block later batches.

## Verification

- Fake-timer service tests cover batching, proactive-toggle suppression, messages received during an in-flight reply, and active-room chatter.
- Existing frontend and server tests remain green.
- Frontend and server production builds succeed.
- Mobile viewport inspection confirms solid top safe areas and untinted pet avatars.
