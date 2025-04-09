const { exec } = require("child_process");

const packages = [
    "axios",
    "socks",
    "user-agents",
    "node-fetch",
    "hpack",
    "header-generator",
    "colors",
    "node-bash-title"
];

console.log("📦 Menginstal paket-paket npm...");

packages.forEach(pkg => {
    exec(`npm install ${pkg}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Gagal menginstal ${pkg}:`, stderr);
        } else {
            console.log(`✅ Berhasil menginstal ${pkg}`);
        }
    });
});