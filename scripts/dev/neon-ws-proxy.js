// Local dev WebSocket -> TCP bridge for @neondatabase/serverless.
//
// The app uses the Neon serverless driver (lib/prisma.ts -> PrismaNeon), which
// reaches Postgres over a secure WebSocket tunnel rather than a raw TCP socket.
// Neon Cloud provides that tunnel in production; this proxy plays the same role
// locally, in front of a local PostgreSQL instance.
//
// Why this exact shape:
//   * Next.js (Turbopack) inlines @neondatabase/serverless into the server
//     bundle, so the driver's connection config CANNOT be overridden from the
//     app's process via NODE_OPTIONS. We therefore rely on the driver DEFAULTS:
//         useSecureWebSocket = true   -> wss:// (TLS), default port 443
//         wsProxy = (host) => host + '/v2'
//     With DATABASE_URL host = "localhost", the driver connects to
//     wss://localhost/v2 (port 443). This proxy listens there.
//   * forceDisablePgSSL defaults to true, so the tunneled Postgres connection is
//     plain (no nested SSL); we just pipe bytes to localhost:5432.
//   * pipelineConnect defaults to "password" (cleartext), which is why
//     pg_hba.conf must use the `password` auth method for local TCP.
//
// Run the dev server with NODE_TLS_REJECT_UNAUTHORIZED=0 so the self-signed
// cert below is accepted. See AGENTS.md.
const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');
const { WebSocketServer } = require('ws');

const TLS = process.env.NEON_WS_PROXY_TLS !== '0';
const PORT = parseInt(process.env.NEON_WS_PROXY_PORT || (TLS ? '443' : '5433'), 10);
const DEFAULT_HOST = process.env.LOCAL_PG_HOST || 'localhost';
const DEFAULT_PORT = parseInt(process.env.LOCAL_PG_PORT || '5432', 10);

const CERT_DIR = path.join(os.homedir(), '.edulink-dev');
const KEY_FILE = path.join(CERT_DIR, 'proxy-key.pem');
const CERT_FILE = path.join(CERT_DIR, 'proxy-cert.pem');

function ensureCert() {
    if (fs.existsSync(KEY_FILE) && fs.existsSync(CERT_FILE)) return;
    fs.mkdirSync(CERT_DIR, { recursive: true });
    execFileSync('openssl', [
        'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
        '-keyout', KEY_FILE, '-out', CERT_FILE, '-days', '3650',
        '-subj', '/CN=localhost',
        '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
    ], { stdio: 'ignore' });
    console.log(`[neon-ws-proxy] generated self-signed cert at ${CERT_FILE}`);
}

function bridge(ws, req) {
    let host = DEFAULT_HOST;
    let port = DEFAULT_PORT;
    try {
        const url = new URL(req.url, 'http://localhost');
        const address = url.searchParams.get('address');
        if (address) {
            const [h, p] = address.split(':');
            if (h) host = h;
            if (p) port = parseInt(p, 10);
        }
    } catch {
        // keep defaults
    }

    const socket = net.connect(port, host);
    const cleanup = () => {
        try { socket.destroy(); } catch { /* noop */ }
        try { ws.close(); } catch { /* noop */ }
    };

    ws.on('message', (data) => { if (!socket.destroyed) socket.write(data); });
    socket.on('data', (data) => { if (ws.readyState === ws.OPEN) ws.send(data); });
    ws.on('close', cleanup);
    ws.on('error', cleanup);
    socket.on('close', cleanup);
    socket.on('error', cleanup);
}

let wss;
if (TLS) {
    ensureCert();
    const server = https.createServer({
        key: fs.readFileSync(KEY_FILE),
        cert: fs.readFileSync(CERT_FILE),
    });
    wss = new WebSocketServer({ server });
    wss.on('connection', bridge);
    server.listen(PORT, () => {
        console.log(`[neon-ws-proxy] listening on wss://localhost:${PORT} -> ${DEFAULT_HOST}:${DEFAULT_PORT}`);
    });
    server.on('error', (err) => {
        console.error('[neon-ws-proxy] server error:', err);
        process.exit(1);
    });
} else {
    wss = new WebSocketServer({ port: PORT });
    wss.on('connection', bridge);
    wss.on('listening', () => {
        console.log(`[neon-ws-proxy] listening on ws://localhost:${PORT} -> ${DEFAULT_HOST}:${DEFAULT_PORT}`);
    });
    wss.on('error', (err) => {
        console.error('[neon-ws-proxy] server error:', err);
        process.exit(1);
    });
}
