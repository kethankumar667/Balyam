# Measured local browser journeys

Status: FAIL

Two desktop contexts, local sign-in fallback and real guest-token endpoint, UI create/join/chat/tutorial/start/moves/results/refresh/leave. In-memory rooms with no paid economy. Not Supabase login, cloud persistence, physical Safari/iOS, mobile layout or real payments.

- chromium: PASS
- edge: FAIL; [identity] AudioContext closed before a pending resume() could complete.; [gameFinished] AudioContext closed before a pending resume() could complete.
- firefox: PASS
- safari: FAIL; [gameArena] TypeError: OffscreenCanvas is required but not supported by this browser; [gameFinished] TypeError: OffscreenCanvas is required but not supported by this browser
