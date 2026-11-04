const fs = require('fs');
const path = require('path');

console.log('🚀 Building Al-Baari Modest Attire Web App for Hostinger...');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const distDir = path.join(__dirname, 'dist');
const rendererDir = path.join(__dirname, 'renderer');
const apiDir = path.join(__dirname, 'api');
const htaccessPath = path.join(__dirname, '.htaccess');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy renderer to dist
if (fs.existsSync(rendererDir)) {
  copyDir(rendererDir, distDir);
}

// Copy api to dist/api
if (fs.existsSync(apiDir)) {
  copyDir(apiDir, path.join(distDir, 'api'));
}

// Copy .htaccess to dist/.htaccess
if (fs.existsSync(htaccessPath)) {
  fs.copyFileSync(htaccessPath, path.join(distDir, '.htaccess'));
}

// Copy server scripts to dist in case Hostinger runs inside output dir
const serverFiles = ['server.js', 'app.js', 'index.js', 'database.js', 'package.json'];
for (const file of serverFiles) {
  const p = path.join(__dirname, file);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(distDir, file));
  }
}

console.log('✅ Web build completed! All assets packaged into dist/');
