/**
 * Copies kuromoji dictionary files from node_modules to public/dict/
 * so they can be served via chrome.runtime.getURL('dict/') in the extension.
 */
import { cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '../node_modules/kuromoji/dict');
const dest = join(__dirname, '../public/dict');

if (!existsSync(src)) {
  console.error('kuromoji dict not found at', src);
  console.error('Run: pnpm install');
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('✓ Kuromoji dict files copied to public/dict/');
