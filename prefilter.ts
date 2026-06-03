#!/usr/bin/env node
/**
 * prefilter — Docker log compressor for Claude Code.
 *
 * Strips noise, deduplicates, extracts errors/events, and emits compact
 * TOON output to reduce tokens before sending logs to an LLM.
 *
 *   docker compose logs 2>&1 | node prefilter.ts
 *   docker logs my-svc 2>&1  | node prefilter.ts --window 10
 *
 * Node 24+: runs .ts directly. Older: `npx tsx prefilter.ts`
 *
 * Flags:
 *   --window N   keep lines within N minutes of newest timestamp (default 5)
 *   --json       emit JSON instead of TOON
 */

import { run } from './src/filter.js';
import { encodeToon } from './src/toon.js';
import type { Result } from './src/types.js';

const argv = process.argv.slice(2);
const opt = { window: 5, json: false };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--window') opt.window = Number(argv[++i]) || 5;
  else if (argv[i] === '--json') opt.json = true;
}

function emit(data: Result): void {
  if (opt.json) process.stdout.write(JSON.stringify(data, null, 2) + '\n');
  else process.stdout.write(encodeToon(data as unknown as Record<string, import('./src/types.js').Json>));
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (buf += c));
process.stdin.on('end', () => emit(run(buf, opt.window)));
