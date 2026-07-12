#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
node scripts/build-web.js
echo "🌐 启动 AI 服务器 http://localhost:${PORT:-3010}"
echo "   配置 API Key: cp .env.example .env"
node server/index.js
