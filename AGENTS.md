# 发型魔镜 (Fazhi Mojing)

依据文字或口述描述，通过 **AI 生图**（DALL·E 3 / Stable Diffusion 3 / Replicate Flux）创造和定制发型。支持保存、分享、导出。

## 目标平台

| 平台 | 方式 | 产出 |
|------|------|------|
| 🍎 iOS | Capacitor → Xcode | IPA |
| 🤖 Android | Capacitor → Gradle | APK |
| ⌚ 手表 | 触屏自适应 | 同 APK |
| ☁️ 云端 | Docker → Render/Railway | AI API 服务器 |

## 云端部署（供手机 App 使用）

### 架构

```
手机 App (Capacitor)  ──HTTPS──▶  云端 AI 服务器  ──▶  DALL·E / SD3 / Flux
     本地 www/                        Docker
     Canvas 离线回退
```

### 一键部署

```bash
# 1. 配置 AI Key
cp .env.example .env   # 填入 OPENAI_API_KEY 等

# 2. 部署到 Render（推荐）
./deploy.sh            # 选 1，按提示推 GitHub + 连接 Render Blueprint

# 或 Railway
./deploy.sh            # 选 2

# 或本地 Docker 验证
npm run docker:run
```

### Render 手动步骤

1. 推送代码到 GitHub
2. [Render Blueprint](https://dashboard.render.com/select-repo?type=blueprint) 连接仓库
3. 自动读取 `render.yaml`，设置 `OPENAI_API_KEY` 等环境变量
4. 部署完成后获得 URL，如 `https://fazhi-mojing.onrender.com`

### 构建手机 App

```bash
echo "https://fazhi-mojing.onrender.com" > api-url.txt
npm run build:mobile
cd android && ./gradlew assembleDebug
```

App 内也可在 ⚙️ 设置 → **云端 API 地址** 手动填入。

## 本地开发

```bash
npm install
npm start              # http://localhost:3010
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `OPENAI_API_KEY` | DALL·E 3 |
| `STABILITY_API_KEY` | SD3 |
| `REPLICATE_API_TOKEN` | Flux |
| `FAZHI_API_URL` | 公网 URL（Render/Railway 自动注入） |
| `PORT` | 端口，默认 3010 |

## API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 + 可用提供商 |
| `/api/config` | GET | 公网配置 |
| `/api/generate` | POST | `{ prompt, provider }` 生图 |

## 命令

```bash
npm start              # 本地 AI 服务器
npm run build:mobile   # 构建 App 并注入云端 API
npm run deploy         # 交互式云端部署
npm run docker:build   # 构建 Docker 镜像
./build.sh             # Capacitor 原生 sync
```

## Harness / Loop（助手）

- 遵循根 `/Users/skat/AGENTS.md`：**Harness Engineering** + **Loop Engineering**
- Guide = 本文件；Sensor = 下方验证命令；同类失误第二次须沉淀规则或测试（棘轮）
- 开干前写清 **Done**；每切片过验证环；显式停止（成功 / 上限 / 无进展 / 人审）
- 详解：`docs/HARNESS_ENGINEERING.md`、`docs/LOOP_ENGINEERING.md`

## 验证环 / Done

```bash
npm install
npm test          # 若有
npm run build     # 或 build:web
npx cap sync android   # 若有 android/
# 可选：JAVA_HOME=…/openjdk@17 npm run apk:debug
```

**Done 示例**：测试通过（若有）+ web 产物进 `www/`/`dist/` + `cap sync` 无报错。可选穿戴未做可搁置，不纳入强制 Done。
