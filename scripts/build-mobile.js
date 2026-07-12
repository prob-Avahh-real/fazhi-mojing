#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const apiUrlFile = path.join(root, 'api-url.txt');

let apiUrl = process.env.FAZHI_API_URL || '';
if (!apiUrl && fs.existsSync(apiUrlFile)) {
  apiUrl = fs.readFileSync(apiUrlFile, 'utf8').trim();
}

if (!apiUrl) {
  console.error('❌ 缺少云端 API 地址');
  console.error('   方式 1: echo "https://xxx.onrender.com" > api-url.txt');
  console.error('   方式 2: FAZHI_API_URL=https://xxx.onrender.com npm run build:mobile');
  process.exit(1);
}

console.log(`📱 移动端构建 · API → ${apiUrl}`);
process.env.FAZHI_API_URL = apiUrl;

execSync('node scripts/build-web.js', { cwd: root, stdio: 'inherit', env: process.env });

if (fs.existsSync(path.join(root, 'android'))) {
  execSync('npx cap sync android', { cwd: root, stdio: 'inherit' });
  console.log('✅ Android 已 sync，运行: cd android && ./gradlew assembleDebug');
}
if (fs.existsSync(path.join(root, 'ios'))) {
  execSync('npx cap sync ios', { cwd: root, stdio: 'inherit' });
  console.log('✅ iOS 已 sync，运行: open ios/App/App.xcworkspace');
}

console.log(`\n✅ 手机 App 已指向 ${apiUrl}`);
