/**
 * TOON — Token-Oriented Object Notation
 *
 * A compact, LLM-friendly serialization format that reduces token consumption
 * vs JSON by hoisting repeated object keys into a header row.
 *
 * ## Rules
 *
 * 1. Scalar key-value:       `key: value`
 * 2. Nested object:          `key:\n  child: value`
 * 3. Empty array:            `key[0]:`
 * 4. Scalar array:           `key[N]: v1,v2,v3`
 * 5. Uniform object array:   `key[N]{f1,f2,f3}:\n  v1,v2,v3\n  v4,v5,v6`
 *    (field names written once; each row is comma-separated values)
 * 6. Mixed object array:     `key[N]:\n  -\n    child: val`
 *
 * ## Quoting
 * Values are bare unless they contain `,`, `:`, `"`, leading/trailing space,
 * or newline — then double-quoted with `\` and `"` escaped.
 *
 * ## Token savings (typical)
 * - vs JSON: ~40–60% fewer tokens on structured log output
 * - vs raw logs: ~70–90% fewer tokens after noise removal
 */

import type { Json } from './types.js';

function scalar(v: Json): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  let s = String(v);
  if (/[,:\n"]|^\s|\s$/.test(s))
    s = '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
  return s;
}

function encArr(k: string, arr: Json[], ind: number): string[] {
  const pad = '  '.repeat(ind);
  if (arr.length === 0) return [`${pad}${k}[0]:`];

  const allObj = arr.every((x) => x !== null && typeof x === 'object' && !Array.isArray(x));
  if (allObj) {
    const fields = Object.keys(arr[0] as object);
    const uniform = arr.every((x) => {
      const ks = Object.keys(x as object);
      return ks.length === fields.length && ks.every((f) => f in (x as object));
    });
    if (uniform) {
      const out = [`${pad}${k}[${arr.length}]{${fields.join(',')}}:`];
      for (const row of arr)
        out.push(`${pad}  ` + fields.map((f) => scalar((row as Record<string, Json>)[f])).join(','));
      return out;
    }
  }

  if (arr.every((x) => x === null || typeof x !== 'object'))
    return [`${pad}${k}[${arr.length}]: ${arr.map(scalar).join(',')}`];

  const out = [`${pad}${k}[${arr.length}]:`];
  for (const x of arr) {
    if (x !== null && typeof x === 'object') {
      out.push(`${pad}  -`);
      out.push(...enc(x as Record<string, Json>, ind + 2));
    } else {
      out.push(`${pad}  - ${scalar(x)}`);
    }
  }
  return out;
}

export function enc(obj: Record<string, Json>, ind = 0): string[] {
  const pad = '  '.repeat(ind);
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) out.push(`${pad}${k}: null`);
    else if (Array.isArray(v)) out.push(...encArr(k, v, ind));
    else if (typeof v === 'object') {
      out.push(`${pad}${k}:`);
      out.push(...enc(v as Record<string, Json>, ind + 1));
    } else {
      out.push(`${pad}${k}: ${scalar(v)}`);
    }
  }
  return out;
}

export function encodeToon(data: Record<string, Json>): string {
  return enc(data, 0).join('\n') + '\n';
}
