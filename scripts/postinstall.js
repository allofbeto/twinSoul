#!/usr/bin/env node
// Runs after `npm install` at the repo root. On Cloudflare's build machines (which only run the
// root install before `wrangler deploy`), build the frontend here so frontend/build exists.
// Locally this does nothing, so a plain `npm install` stays fast.
const { execFileSync } = require('child_process');
const path = require('path');

const onCloudflare = process.env.WORKERS_CI || process.env.CF_PAGES;
if (!onCloudflare) process.exit(0);

console.log('[postinstall] Cloudflare build detected — building the frontend.');
execFileSync(process.execPath, [path.join(__dirname, 'build-frontend.js'), '--if-missing'], { stdio: 'inherit' });
