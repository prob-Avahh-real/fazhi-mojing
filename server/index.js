#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PORT = process.env.PORT || 3010;
const HOST = process.env.HOST || '0.0.0.0';
const WWW = path.join(__dirname, '..', 'www');
function publicUrl() {
  if (process.env.FAZHI_API_URL) return process.env.FAZHI_API_URL.replace(/\/$/, '');
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return '';
}
const PUBLIC_URL = publicUrl();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function providers() {
  return {
    openai: !!process.env.OPENAI_API_KEY,
    stability: !!process.env.STABILITY_API_KEY,
    replicate: !!process.env.REPLICATE_API_TOKEN,
  };
}

async function generateOpenAI(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY 未配置');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1792',
      quality: 'standard',
      response_format: 'b64_json',
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `OpenAI ${res.status}`);
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI 未返回图片');
  return { image: `data:image/png;base64,${b64}`, provider: 'openai', revisedPrompt: data.data[0].revised_prompt };
}

async function generateStability(prompt) {
  const key = process.env.STABILITY_API_KEY;
  if (!key) throw new Error('STABILITY_API_KEY 未配置');

  const form = new FormData();
  form.append('prompt', prompt);
  form.append('output_format', 'png');
  form.append('aspect_ratio', '2:3');
  form.append('model', 'sd3');

  const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    body: form,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.[0] || data.message || `Stability ${res.status}`);
  const b64 = data.image;
  if (!b64) throw new Error('Stability 未返回图片');
  return { image: `data:image/png;base64,${b64}`, provider: 'stability' };
}

async function generateReplicate(prompt) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error('REPLICATE_API_TOKEN 未配置');

  const create = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait=60',
    },
    body: JSON.stringify({
      input: { prompt, aspect_ratio: '2:3', output_format: 'png', num_outputs: 1 },
    }),
  });

  const pred = await create.json();
  if (!create.ok) throw new Error(pred.detail || `Replicate ${create.status}`);

  let result = pred;
  let tries = 0;
  while (result.status !== 'succeeded' && result.status !== 'failed' && tries < 30) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    result = await poll.json();
    tries++;
  }

  if (result.status === 'failed') throw new Error(result.error || 'Replicate 生成失败');
  const url = result.output?.[0] || result.output;
  if (!url) throw new Error('Replicate 未返回图片');

  const imgRes = await fetch(url);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  return { image: `data:image/png;base64,${buf.toString('base64')}`, provider: 'replicate' };
}

async function handleGenerate(body) {
  const { prompt, provider = 'auto' } = JSON.parse(body);
  if (!prompt || typeof prompt !== 'string') throw new Error('缺少 prompt');

  const available = providers();
  const order = provider === 'auto'
    ? ['openai', 'stability', 'replicate'].filter(p => available[p])
    : [provider];

  if (!order.length) {
    throw new Error('未配置任何 AI API Key，请在 .env 中设置 OPENAI_API_KEY / STABILITY_API_KEY / REPLICATE_API_TOKEN');
  }

  let lastErr;
  for (const p of order) {
    try {
      if (p === 'openai') return await generateOpenAI(prompt);
      if (p === 'stability') return await generateStability(prompt);
      if (p === 'replicate') return await generateReplicate(prompt);
    } catch (e) {
      lastErr = e;
      if (provider !== 'auto') throw e;
    }
  }
  throw lastErr || new Error('所有 AI 提供商均失败');
}

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(WWW, urlPath);

  if (!filePath.startsWith(WWW)) {
    res.writeHead(403); res.end(); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.url === '/api/health' && req.method === 'GET') {
    json(res, 200, { ok: true, providers: providers(), url: PUBLIC_URL || undefined });
    return;
  }

  if (req.url === '/api/config' && req.method === 'GET') {
    json(res, 200, { ok: true, apiUrl: PUBLIC_URL || `http://localhost:${PORT}`, providers: providers() });
    return;
  }

  if (req.url === '/api/generate' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const result = await handleGenerate(body);
      json(res, 200, { ok: true, ...result });
    } catch (e) {
      json(res, 500, { ok: false, error: e.message });
    }
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405); res.end();
});

server.listen(PORT, HOST, () => {
  const p = providers();
  const local = `http://localhost:${PORT}`;
  console.log(`\n💇 发型魔镜 AI Server → ${PUBLIC_URL || local}`);
  if (PUBLIC_URL) console.log(`   公网地址: ${PUBLIC_URL}`);
  console.log(`   OpenAI:    ${p.openai ? '✅' : '—'}`);
  console.log(`   Stability: ${p.stability ? '✅' : '—'}`);
  console.log(`   Replicate: ${p.replicate ? '✅' : '—'}`);
  if (!p.openai && !p.stability && !p.replicate) {
    console.log('\n⚠️  未检测到 API Key，复制 .env.example → .env 并填入密钥');
    console.log('   无 Key 时将自动回退 Canvas 预览模式\n');
  }
});
