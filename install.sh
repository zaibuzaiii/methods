#!/bin/bash

# Hentikan eksekusi jika terjadi error
set -e

echo "Menginstal Node.js 20 dari NodeSource..."

# Menambahkan repository NodeSource dan menginstalnya
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Menginstal Node.js
sudo apt install -y nodejs

# Menampilkan versi Node.js yang terinstal
echo "Node.js berhasil diinstal! Versi:"
node -v

# Menginstal npm dependencies
echo "Menginstal module npm..."
npm install axios
npm install socks
npm install user-agents
npm install node-fetch
npm install hpack
npm install header-generator
npm install colors
npm install node-bash-title

echo "Semua module npm berhasil diinstal!"