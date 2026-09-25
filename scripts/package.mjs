import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

console.log('Building LinguaFlix MV3 production bundle...');
const binPath = path.resolve('node_modules', '.bin');
const env = { ...process.env, NODE_ENV: 'production', PATH: `${binPath}:${process.env.PATH || ''}` };
execSync('npx vite build', { stdio: 'inherit', env });

// Ensure dist exists
const distDir = path.resolve('dist');
if (!fs.existsSync(distDir)) {
  console.error('dist directory does not exist!');
  process.exit(1);
}

// Remove any lingering zip files inside dist
const distFiles = fs.readdirSync(distDir);
for (const file of distFiles) {
  if (file.endsWith('.zip')) {
    fs.unlinkSync(path.join(distDir, file));
  }
}

// Make clean zip of dist/
const zipOut = path.resolve('linguaflix.zip');
if (fs.existsSync(zipOut)) {
  fs.unlinkSync(zipOut);
}

execSync('python3 -c "import shutil; shutil.make_archive(\'linguaflix\', \'zip\', \'dist\')"', { stdio: 'inherit' });

// Also copy to public/ so it can be downloaded directly from the web app preview
fs.copyFileSync(zipOut, path.resolve('public', 'linguaflix.zip'));

console.log('✓ Successfully created linguaflix.zip and public/linguaflix.zip');
