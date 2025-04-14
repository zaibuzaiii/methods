#!/bin/bash

# Pastikan npm sudah terinstal
if ! command -v npm &> /dev/null
then
    echo "npm tidak ditemukan! Silakan instal Node.js terlebih dahulu."
    exit 1
fi

echo "Memulai instalasi paket npm..."

# Instal paket-paket npm
npm i axios
npm install undici
npm install puppeteer-extra
npm install puppeteer-extra-plugin-stealth
npm install puppeteer
npm install async
npm install puppeteer-extra-plugin-anonymize-ua
npm install resemblejs
npm install http-proxy-agent
npm i canvas
npm i socks
npm i user-agents
npm i node-fetch
npm i hpack
npm i header-generator
npm i colors
npm i node-bash-title

echo "Semua paket telah berhasil diinstal!"
