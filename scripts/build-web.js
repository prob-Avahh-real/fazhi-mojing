const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'index.html');
const dest = path.join(root, 'www', 'index.html');
const apiUrl = process.env.FAZHI_API_URL || '';

let html = fs.readFileSync(src, 'utf8');

if (apiUrl) {
  const config = `<script>window.FAZHI_CONFIG=${JSON.stringify({ apiUrl })};</script>`;
  html = html.replace('</head>', `  ${config}\n</head>`);
  console.log(`✅ API URL → ${apiUrl}`);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, html);
console.log('✅ Built www/index.html');
