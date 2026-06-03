# prefilther

Deterministic Docker log compressor for LLMs. Strips noise, deduplicates, extracts errors/events, and emits compact **TOON** output — cutting 70–90% of tokens before logs reach an AI model.

```
docker compose logs 2>&1 | npx tsx prefilter.ts
docker logs my-svc 2>&1  | npx tsx prefilter.ts --window 10
```

Node 24+: `node prefilter.ts` (native TS type-stripping). Older: `npx tsx prefilter.ts`.

## What it does

| Step | Action |
|------|--------|
| Strip | ANSI codes, OSC sequences, spinner chars |
| Drop | Progress bars, duplicate consecutive lines, lines older than `--window` minutes (errors exempt) |
| Shorten | Long paths (`/home/app/src/...` → `/src/...`), relative timestamps |
| Extract | Errors/warnings (with collapsed stack traces), lifecycle events (up/down), last success |
| Encode | TOON — ~40% smaller than JSON |

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--window N` | `5` | Keep lines within N minutes of the newest timestamp |
| `--json` | off | Emit JSON instead of TOON (debug) |

## Output

TOON-encoded `Result`:

```
summary: "1 fatal, 2 error across 1 container(s): api."
stats:
  in: 340
  kept: 18
  dropped: 322
errors[3]{container,level,message,context,when,repeat}:
  api,ERROR,"relation \"users\" does not exist","at Query.run /src/db.js:88",2s ago,1
  api,ERROR,"ECONNREFUSED 127.0.0.1:6379 redis",conn,1s ago,1
  api,FATAL,"unable to boot, exiting",,0s ago,1
events[2]{container,type,msg}:
  db,up,database system is ready to accept connections
  api,down,received signal SIGTERM shutting down
last_success:
  container: db
  msg: migrations completed successfully
  when: 5s ago
```

## TOON — Token-Oriented Object Notation

Custom format optimized for LLM token efficiency. Key rules:

- **Scalars:** `key: value`
- **Nested objects:** `key:\n  child: value`
- **Uniform object arrays:** `key[N]{f1,f2}:\n  v1,v2\n  v3,v4` ← field names written **once**
- **Scalar arrays:** `key[N]: v1,v2,v3`
- Values quoted only when containing `,` `:` `"` or leading/trailing whitespace

~40–60% fewer tokens vs JSON on structured output.

## Project layout

```
prefilther/
├── src/
│   ├── types.ts    ← shared interfaces + Json type
│   ├── regex.ts    ← all regex constants
│   ├── filter.ts   ← deterministic pipeline
│   └── toon.ts     ← TOON encoder
└── prefilter.ts    ← CLI entry (stdin → stdout)
```

## Use with Claude Code

Add to your project's `CLAUDE.md` or a hook:

```
docker compose logs 2>&1 | npx tsx /path/to/prefilter.ts
```

Or pipe inline in a prompt:
```
!docker compose logs 2>&1 | npx tsx prefilter.ts
```
