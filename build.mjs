/* Build de produção: minifica CSS/JS via esbuild e monta a pasta dist/
   Uso: node build.mjs  (requer npx/node; baixa o esbuild na primeira vez) */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const DIST = path.join(ROOT, 'dist');

const MINIFY = ['styles.css', 'fonts.css', 'script.js', 'motion.js', 'webgl-hero.js', 'analytics.js'];
const COPY = ['index.html', 'privacidade.html', 'robots.txt', 'sitemap.xml'];
const COPY_DIRS = ['imagens', 'fonts', 'js'];

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

for (const f of MINIFY) {
  execSync(`npx -y esbuild "${path.join(ROOT, f)}" --minify --outfile="${path.join(DIST, f)}"`, { stdio: 'pipe' });
  const kb = n => (fs.statSync(n).size / 1024).toFixed(1);
  console.log(`min  ${f}  ${kb(path.join(ROOT, f))}K -> ${kb(path.join(DIST, f))}K`);
}
for (const f of COPY) {
  fs.copyFileSync(path.join(ROOT, f), path.join(DIST, f));
  console.log(`copy ${f}`);
}
for (const d of COPY_DIRS) {
  fs.cpSync(path.join(ROOT, d), path.join(DIST, d), { recursive: true });
  console.log(`copy ${d}/`);
}
console.log('\ndist/ pronto para publicar.');
