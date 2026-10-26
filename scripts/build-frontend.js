#!/usr/bin/env node
// Builds the React app in frontend/ so Wrangler can serve frontend/build.
//
//   node scripts/build-frontend.js              install + build
//   node scripts/build-frontend.js --if-missing skip when frontend/build already exists
//   node scripts/build-frontend.js --no-install build only (deps already installed)
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const args = process.argv.slice(2);

if (args.includes('--if-missing') && fs.existsSync(path.join(frontend, 'build', 'index.html'))) {
  console.log('[build-frontend] frontend/build already exists — skipping.');
  process.exit(0);
}

const run = (cmd) => {
  console.log(`[build-frontend] ${cmd}`);
  execSync(cmd, { cwd: frontend, stdio: 'inherit', env: process.env });
};

if (!args.includes('--no-install')) run('npm ci --no-audit --no-fund');
run('npm run build');
