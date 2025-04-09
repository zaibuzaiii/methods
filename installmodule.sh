#!/bin/bash

# Pastikan npm sudah terinstal
if ! command -v npm &> /dev/null
then
    echo "npm tidak ditemukan! Silakan instal Node.js terlebih dahulu."
    exit 1
fi

echo "Memulai instalasi paket npm..."

# Instal paket-paket npm
npm install axios
npm install socks
npm install user-agents
npm install node-fetch
npm install hpack
npm install header-generator
npm install colors
npm install node-bash-title

echo "Semua paket telah berhasil diinstal!"
