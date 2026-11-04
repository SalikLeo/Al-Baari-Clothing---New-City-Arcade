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

// Copy renderer to dist
copyDir(rendererDir, distDir);

// Copy api to dist/api
if (fs.existsSync(apiDir)) {
  copyDir(apiDir, path.join(distDir, 'api'));
}

// Copy .htaccess to dist/.htaccess
if (fs.existsSync(htaccessPath)) {
  fs.copyFileSync(htaccessPath, path.join(distDir, '.htaccess'));
}

console.log('✅ Web build completed! All assets packaged into dist/');
