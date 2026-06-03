export const ANSI = /\x1B\[[0-9;?]*[ -/]*[@-~]|\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)/g;
export const SPINNER = /[⠀-⣿─-╿]|[|/\\-](?=\s)/;
export const PROGRESS = /\b\d{1,3}%|\b\d+(?:\.\d+)?\s?[KMGT]i?B\/s|\[=*>?\s*\]/;
export const PREFIX = /^(\S[^|]*?)\s+\|\s?(.*)$/;  // compose "svc-1 | msg"
export const TS = /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/;
export const LEVEL = /\b(FATAL|PANIC|ERROR|ERR|WARN(?:ING)?|INFO|DEBUG|TRACE)\b/i;
export const STACK = /^(at\s|File\s"|#\d+\s|\.\.\.|Caused by|from\s)/; // tested post ts/level strip
export const SQLERR = /(syntax error|relation\s+\S+\s+does not exist|column\s+\S+\s+does not exist|duplicate key|deadlock|SQLSTATE|near\s+"[^"]*":\s*syntax)/i;
export const CONNERR = /(connection refused|ECONNREFUSED|ETIMEDOUT|timeout|timed out|could not connect|authentication failed|password authentication|EHOSTUNREACH|no route to host|certificate)/i;
export const STARTSTOP = /\b(started|starting|listening|now accepting|ready to accept|bound to|shutdown|shutting down|stopped|exited|exit code|received signal|terminating)\b/i;
export const SUCCESS = /\b(success(?:ful(?:ly)?)?|completed?|done|migrated|seeded|ready|healthy|connected|HTTP\/[\d.]+"?\s*2\d\d)\b/i;
