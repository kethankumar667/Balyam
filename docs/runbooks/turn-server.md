# Runbook — Provisioning the TURN relay for voice

**Status:** client and server code are done. This document is the remaining
work, and all of it is configuration.

## Why this is needed

Voice uses a peer-to-peer mesh. STUN tells each browser its own public address,
which is enough when at least one side is reachable from the internet. It is
not enough when **both** players sit behind a symmetric NAT, which is routine on
mobile carrier data and on plenty of corporate and hotel wifi.

For those pairs there is no direct path at all, and no amount of correct
signalling creates one. Audio has to be relayed through a server that both
sides can reach. That server is TURN.

Without it, voice works for some players and silently never connects for
others, with no error that points at the cause. That was the symptom behind
the "voice chat is not working" reports.

## What to set

All variables go on the **server**, never in the client. Vite inlines any
`VITE_*` variable into the published JavaScript bundle, so a TURN password put
there is readable by anyone who opens devtools. TURN is billed per gigabyte
relayed, which makes a leaked credential somebody else's traffic on your
invoice. The server issues short-lived credentials instead and keeps the
secret; see `server/src/lib/iceServers.ts`.

### Option A — coturn, self-hosted (preferred)

```bash
TURN_URLS="turn:turn.yourdomain.com:3478?transport=udp,turn:turn.yourdomain.com:3478?transport=tcp,turns:turn.yourdomain.com:5349"
TURN_SECRET="<the same string as coturn's static-auth-secret>"
TURN_TTL_SECONDS=3600
```

Minimum `/etc/turnserver.conf`:

```
listening-port=3478
tls-listening-port=5349
fingerprint
use-auth-secret
static-auth-secret=<same value as TURN_SECRET>
realm=turn.yourdomain.com
# The public IP clients must reach. On a cloud VM behind a NAT, set both:
external-ip=<public-ip>/<private-ip>
cert=/etc/letsencrypt/live/turn.yourdomain.com/fullchain.pem
pkey=/etc/letsencrypt/live/turn.yourdomain.com/privkey.pem
# Do not relay to private ranges. Without these, your relay can be used to
# reach machines inside your own network.
no-multicast-peers
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
```

Firewall: open **3478 udp+tcp**, **5349 tcp**, and the relay range
(`min-port`/`max-port`, default `49152-65535` udp).

### Option B — a hosted provider

Metered, Twilio, Cloudflare Calls and others sell TURN by the gigabyte. Most
issue a fixed username and password rather than supporting the HMAC scheme:

```bash
TURN_URLS="turn:relay.provider.com:3478,turns:relay.provider.com:5349"
TURN_USERNAME="<from provider>"
TURN_PASSWORD="<from provider>"
```

If a provider does support a static auth secret, prefer `TURN_SECRET` — it is
short-lived, so a leak expires on its own.

## Why three URLs, not one

Listed in the order clients should try them:

| URL | Gets through |
|---|---|
| `turn:...?transport=udp` | Most networks. Lowest latency. |
| `turn:...?transport=tcp` | Networks that drop UDP entirely. |
| `turns:...:5349` | Restrictive firewalls; looks like ordinary HTTPS. |

Shipping only the UDP entry leaves out exactly the corporate and hotel
networks that most need a relay.

## Verifying it works

1. **Config is being served.** With the server running, open the client, join a
   room, connect the mic. In devtools the `webrtc:iceConfig` ack should carry a
   `turn:` entry with a username shaped `<digits>:<socketid>`.

2. **The relay actually allocates.** Paste your `TURN_URLS`, username and
   credential into the Trickle ICE tester
   (<https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/>).
   You want at least one candidate of type **`relay`**. Only `host` and `srflx`
   means the relay is unreachable or rejecting your credential.

3. **End to end.** Two phones, both on **mobile data**, different carriers if
   possible, same room. This is the case that fails without TURN. Same-wifi
   testing proves nothing here, because STUN already handles it.

## Operating notes

- **Cost is the thing to watch.** Relayed audio is roughly 50 kbps per
  direction per pair. A four-player mesh call is 12 streams. Only pairs that
  cannot connect directly consume relay bandwidth, typically a minority, but
  set a billing alert before launch rather than after.
- **The mesh is the real ceiling.** Every player uploads to every other player,
  so cost and CPU grow quadratically. Above roughly six people in one call, the
  fix is an SFU, not more TURN. That is already noted in ROADMAP Phase E.
- **Rotating `TURN_SECRET`** invalidates issued credentials as they expire.
  Restart the app server and coturn together; calls in flight survive until
  their existing allocation ends.
- **Credential TTL** of one hour outlives any single match. Shorten it only if
  you have a reason; each reconnect re-fetches anyway.

## When it is still broken

Check in this order:

1. `hasRelay` is `false` in the `webrtc:iceConfig` ack → the server sees no
   usable config. A `TURN_URLS` with no secret and no password deliberately
   reports `false`, because it cannot allocate.
2. No `relay` candidate in Trickle ICE → firewall or wrong `external-ip`.
3. `relay` candidates present but the call still fails → this is signalling,
   not TURN. See `client/src/lib/webrtc.ts`.
