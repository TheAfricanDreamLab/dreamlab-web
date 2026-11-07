// Writes out/lines.json (each chapter's narration) for narrate.py. Run: node --experimental-strip-types scripts/guide/dump.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAPTERS } from './chapters.ts';

const out = join(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'lines.json'), JSON.stringify(CHAPTERS.map((c) => ({ id: c.id, title: c.title, lines: c.steps.map((s) => s.say) })), null, 2));
console.log(`${CHAPTERS.length} chapters`);
