const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const extDir = path.join(__dirname, 'extension');
const tmpDir = path.join(__dirname, 'extension-prod');
const outZip = path.join(__dirname, 'frontend', 'public', 'lasminai-extension.zip');

console.log('Packaging extension for production...');

// 1. Copy to tmp
if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
fs.cpSync(extDir, tmpDir, { recursive: true });

// 2. Replace URLs in background.js
const bgPath = path.join(tmpDir, 'background.js');
let bg = fs.readFileSync(bgPath, 'utf8');
bg = bg.replace(/'http:\/\/localhost:5050'/g, "'https://lasminai.onrender.com'");
bg = bg.replace(/'http:\/\/localhost:5174'/g, "'https://lasminai.vercel.app'");
fs.writeFileSync(bgPath, bg);

// 3. Replace URLs in popup.js
const popupPath = path.join(tmpDir, 'popup', 'popup.js');
let popup = fs.readFileSync(popupPath, 'utf8');
popup = popup.replace(/'http:\/\/localhost:5174'/g, "'https://lasminai.vercel.app'");
popup = popup.replace(/'http:\/\/localhost:5050'/g, "'https://lasminai.onrender.com'");
fs.writeFileSync(popupPath, popup);

// 4. Zip the contents
if (fs.existsSync(outZip)) fs.unlinkSync(outZip);
try {
  execSync(`cd "${tmpDir}" && zip -r "${outZip}" . -x "*.DS_Store"`);
  console.log('Extension successfully packed to ' + outZip);
} catch (e) {
  console.error('Failed to zip:', e);
}

// 5. Cleanup
fs.rmSync(tmpDir, { recursive: true, force: true });
