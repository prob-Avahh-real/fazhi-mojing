#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ☁️  发型魔镜 · 云端部署"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. 检查 .env ──
if [[ ! -f .env ]]; then
  echo "⚠️  未找到 .env，从模板复制..."
  cp .env.example .env
  echo "   请编辑 .env 填入 AI API Key 后重新运行"
  exit 1
fi

# ── 2. 本地 Docker 验证 ──
if command -v docker &>/dev/null; then
  echo ""
  echo "🐳 构建 Docker 镜像..."
  docker build -t fazhi-mojing:latest . -q
  echo "✅ Docker 镜像构建成功"
else
  echo "⚠️  未安装 Docker，跳过镜像验证"
fi

echo ""
echo "选择部署平台："
echo "  1) Render  (推荐，免费 Starter + 新加坡节点)"
echo "  2) Railway (Docker 一键部署)"
echo "  3) 仅输出手动部署说明"
read -rp "请输入 [1/2/3] (默认 1): " choice
choice="${choice:-1}"

case "$choice" in
  1)
    echo ""
    echo "📋 Render 部署步骤："
    echo ""
    echo "  1. 将项目推送到 GitHub："
    echo "     git init && git add . && git commit -m 'deploy fazhi-mojing'"
    echo "     gh repo create fazhi-mojing --public --source=. --push"
    echo ""
    echo "  2. 打开 https://dashboard.render.com/select-repo?type=blueprint"
    echo "     连接 GitHub 仓库，Render 会自动读取 render.yaml"
    echo ""
    echo "  3. 在 Render Dashboard 设置环境变量："
    echo "     OPENAI_API_KEY / STABILITY_API_KEY / REPLICATE_API_TOKEN"
    echo ""
    echo "  4. 部署完成后复制公网 URL，例如："
    echo "     https://fazhi-mojing.onrender.com"
    echo ""
    echo "  5. 构建手机 App："
    echo "     echo 'https://fazhi-mojing.onrender.com' > api-url.txt"
    echo "     npm run build:mobile"
    echo ""

    if command -v gh &>/dev/null; then
      read -rp "是否现在创建 GitHub 仓库并推送? [y/N] " push
      if [[ "${push,,}" == "y" ]]; then
        if [[ ! -d .git ]]; then git init; fi
        git add -A
        git commit -m "feat: fazhi-mojing AI server cloud deploy" --allow-empty 2>/dev/null || git commit -m "feat: fazhi-mojing AI server cloud deploy"
        gh repo create fazhi-mojing --public --source=. --push 2>/dev/null || {
          echo "仓库可能已存在，尝试 push..."
          git remote add origin "https://github.com/$(gh api user -q .login)/fazhi-mojing.git" 2>/dev/null || true
          git push -u origin HEAD
        }
        echo ""
        echo "✅ 已推送到 GitHub"
        echo "👉 下一步: https://dashboard.render.com/select-repo?type=blueprint"
      fi
    fi
    ;;

  2)
    echo ""
    echo "🚂 Railway 部署..."
    if ! command -v npx &>/dev/null; then
      echo "❌ 需要 Node.js"; exit 1
    fi
    echo "   将启动 Railway CLI，按提示登录并部署"
    echo ""
    npx @railway/cli@latest init --name fazhi-mojing 2>/dev/null || true
    npx @railway/cli@latest up --detach
    echo ""
    echo "   设置环境变量："
    npx @railway/cli@latest variables set OPENAI_API_KEY="$(grep OPENAI_API_KEY .env | cut -d= -f2-)" 2>/dev/null || true
    DOMAIN=$(npx @railway/cli@latest domain 2>/dev/null | tail -1 || echo "")
    if [[ -n "$DOMAIN" ]]; then
      echo "✅ 公网地址: https://${DOMAIN}"
      echo "https://${DOMAIN}" > api-url.txt
      echo "   已写入 api-url.txt"
    fi
    ;;

  3)
    echo ""
    echo "手动部署："
    echo "  docker build -t fazhi-mojing ."
    echo "  docker run -p 3010:3010 --env-file .env fazhi-mojing"
    echo ""
    echo "  或使用任何支持 Docker 的平台 (Fly.io, Azure Container Apps, GCP Cloud Run)"
    ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  部署后构建手机 App："
echo "    echo 'https://YOUR-URL' > api-url.txt"
echo "    npm run build:mobile"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
