#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  💇 发型魔镜 · Native App Builder"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ ! -d "node_modules" ]]; then
  echo "📦 安装依赖..."
  npm install
fi

node scripts/build-web.js

if [[ ! -d "ios" ]]; then
  echo "🍎 初始化 iOS 平台..."
  npx cap add ios
fi
if [[ ! -d "android" ]]; then
  echo "🤖 初始化 Android 平台..."
  npx cap add android
fi

npx cap sync

echo ""
echo "✅ 构建完成！"
echo "  🍎 iOS:  open ios/App/App.xcworkspace"
echo "  🤖 APK:  cd android && ./gradlew assembleDebug"
