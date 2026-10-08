// Focused deployment regression checks; no dependencies or live source mutation.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scratch = await mkdtemp(join(tmpdir(), 'nova-build-check-'));
const project = join(scratch, 'project');
const dist = join(project, 'dist');
const outside = join(scratch, 'outside');
const files = ['styles.css','script.js','prism.css','prism.js','prism-nav.css','prism-nav.js','prism-catalog.css','prism-detail.css','prism-background.js','novascroll.css','novascroll.js'];
// Binary fixtures deliberately include NUL and non-UTF-8 bytes to detect text transcoding.
const mediaFixtures = new Map([
  ['assets/backgrounds/prism/hero-desktop.mp4', Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 128, 255, 254])],
  ['assets/backgrounds/prism/hero-mobile.mp4', Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 97, 118, 99, 49, 0, 254, 128, 253])],
  ['assets/backgrounds/prism/hero.webm', Buffer.from([26, 69, 223, 163, 0, 255, 128, 254])],
]);
const mediaSource = [...mediaFixtures.keys()].map((asset, i) => `const media${i} = './${asset}?v=fixture';`).join('\n');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function put(file, content) { const target = join(project, file); await mkdir(dirname(target), { recursive: true }); await writeFile(target, content); }
function run() { return spawnSync(process.execPath, [join(project, 'scripts/build-pages.mjs'), 'abc1234'], { encoding: 'utf8' }); }
async function safeRemove(path) {
  const absolute = resolve(path);
  assert.ok(absolute === scratch || absolute.startsWith(scratch + sep), `Refusing cleanup outside fixture: ${absolute}`);
  if ((await lstat(absolute)).isSymbolicLink()) await rm(absolute);
  else { const physical = await realpath(absolute); assert.ok(physical === scratch || physical.startsWith(scratch + sep)); await rm(absolute, { recursive: true, force: true }); }
}
try {
  await mkdir(join(project, 'scripts'), { recursive: true });
  await copyFile(fileURLToPath(new URL('./build-pages.mjs', import.meta.url)), join(project, 'scripts/build-pages.mjs'));
  const html = files.map(file => file.endsWith('.css') ? `<link rel="stylesheet" href="./${file}?v=previous">` : `<script src="./${file}?v=previous" defer></script>`).join('\n') + '\n<a href="https://example.com/source?q=unchanged">External</a>';
  for (let i = 0; i < 11; i++) await put(`page-${i}.html`, html);
  for (const file of files) await put(file, file === 'prism.js' ? `const image = './assets/products/example.webp';` : file === 'prism-background.js' ? mediaSource : file === 'styles.css' ? `@font-face { src: url('./assets/fonts/pretendard/PretendardVariable.woff2'); }` : '/* fixture */');
  for (const asset of ['assets/products/example.webp','assets/recruitment-2026-web-developer.png','assets/fonts/pretendard/PretendardVariable.woff2','assets/fonts/pretendard/LICENSE.txt','assets/fonts/pretendard/source.json']) await put(asset, `fixture:${asset}`);
  for (const [asset, bytes] of mediaFixtures) await put(asset, bytes);
  let result = run();
  assert.equal(result.status, 0, result.stderr);
  const built = await readFile(join(dist, 'page-0.html'), 'utf8');
  for (const file of files) { assert.ok(built.includes(`./${file}?v=abc1234`)); assert.equal(await readFile(join(dist, file), 'utf8'), await readFile(join(project, file), 'utf8')); }
  assert.ok(built.includes('https://example.com/source?q=unchanged'));
  for (const asset of ['assets/products/example.webp','assets/fonts/pretendard/PretendardVariable.woff2','assets/fonts/pretendard/LICENSE.txt','assets/fonts/pretendard/source.json']) assert.equal(await readFile(join(dist, asset), 'utf8'), await readFile(join(project, asset), 'utf8'));
  for (const [asset, bytes] of mediaFixtures) {
    const copied = await readFile(join(dist, asset));
    assert.equal(copied.length, bytes.length, `Media byte length changed: ${asset}`);
    assert.equal(sha256(copied), sha256(bytes), `Media SHA-256 changed: ${asset}`);
  }

  // Invalid input must fail without deleting a previously valid build.
  await put('dist/keep.txt', 'existing build');
  await put('prism-background.js', mediaSource + "\nconst missing = './assets/backgrounds/prism/missing.mp4';");
  result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ENOENT/);
  assert.equal(await readFile(join(dist, 'keep.txt'), 'utf8'), 'existing build');
  await put('prism-background.js', mediaSource);
  await put('page-0.html', html + '<img src="./assets/../../outside.png">');
  result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /escapes the assets directory/);
  assert.equal(await readFile(join(dist, 'keep.txt'), 'utf8'), 'existing build');

  // A linked dist must never delete its target, including Windows junctions.
  await put('page-0.html', html);
  await safeRemove(dist);
  await mkdir(outside);
  await writeFile(join(outside, 'keep.txt'), 'external target');
  await symlink(outside, dist, process.platform === 'win32' ? 'junction' : 'dir');
  result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing to replace a linked/);
  assert.equal(await readFile(join(outside, 'keep.txt'), 'utf8'), 'external target');
  await safeRemove(dist);
  console.log('PASS: eleven root assets versioned/copied, JS images/fonts/MP4/WebM included, media SHA-256 retained, external URL retained, missing media/invalid input preserves dist, linked dist rejected.');
} finally {
  // Resolve the one named fixture root before recursive cleanup.
  assert.equal(relative(dirname(scratch), scratch), scratch.split(sep).at(-1));
  await safeRemove(scratch);
}
