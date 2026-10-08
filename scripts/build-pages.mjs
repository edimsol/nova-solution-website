import { copyFile, lstat, mkdir, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('..', import.meta.url)));
const dist = resolve(root, 'dist');
const version = process.argv[2];
if (!/^[0-9a-f]{7}$/i.test(version ?? '')) throw new Error('Expected a 7-character hexadecimal commit SHA argument.');

// Never recursively remove a link, the checkout root, or a path outside it.
const normalize = (path) => process.platform === 'win32' ? path.toLowerCase() : path;
if (normalize(dirname(dist)) !== normalize(root) || relative(root, dist) !== 'dist') {
  throw new Error(`Unsafe deployment output directory: ${dist}`);
}
try {
  const existing = await lstat(dist);
  if (existing.isSymbolicLink() || !existing.isDirectory() || normalize(await realpath(dist)) !== normalize(dist)) {
    throw new Error(`Refusing to replace a linked or unexpected deployment directory: ${dist}`);
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }

const htmlFiles = (await readdir(root)).filter(file => file.endsWith('.html')).sort();
if (htmlFiles.length !== 11) throw new Error(`Expected 11 root HTML files, found ${htmlFiles.length}.`);
const rootAssetAllowlist = new Set([
  'styles.css', 'script.js',
  'prism.css', 'prism.js', 'prism-nav.css', 'prism-nav.js', 'prism-catalog.css',
  'prism-background.js', 'prism-detail.css',
  'novascroll.css', 'novascroll.js',
]);
const referencedAssets = new Set([
  'assets/recruitment-2026-web-developer.png',
  'assets/fonts/pretendard/PretendardVariable.woff2',
  'assets/fonts/pretendard/LICENSE.txt',
  'assets/fonts/pretendard/source.json',
]);
const usedRootAssets = new Set();
const externalUrlPattern = /https?:\/\/[^"'\s)<>]+/g;
const localReferencePattern = /\b(href|src)\s*=\s*(["'])(\.\/[^"']+)\2/gi;
const embeddedAssetPattern = /(?:\.\/|\/)?(assets\/[^"'`$}{?#)\s<>]+\.(?:avif|gif|jpe?g|png|svg|webp|mp4|webm|bin|glb|woff2?|ttf|otf))(?:[?#][^"'`)\s<>]*)?/gi;
const pendingPages = [];
for (const file of htmlFiles) {
  const source = await readFile(join(root, file), 'utf8');
  const output = source.replace(localReferencePattern, (whole, attribute, quote, reference) => {
    const name = reference.slice(2).split(/[?#]/, 1)[0];
    if (name.startsWith('assets/')) { referencedAssets.add(name); return whole; }
    if (!rootAssetAllowlist.has(name)) return whole;
    usedRootAssets.add(name);
    const hash = reference.includes('#') ? reference.slice(reference.indexOf('#')) : '';
    return `${attribute}=${quote}./${name}?v=${version}${hash}${quote}`;
  });
  if (JSON.stringify(source.match(externalUrlPattern) ?? []) !== JSON.stringify(output.match(externalUrlPattern) ?? [])) {
    throw new Error(`External URL changed while processing ${file}.`);
  }
  let styleCount = 0;
  for (const match of output.matchAll(localReferencePattern)) {
    const reference = match[3];
    const name = reference.slice(2).split(/[?#]/, 1)[0];
    if (rootAssetAllowlist.has(name)) {
      if (reference.split('#', 1)[0] !== `./${name}?v=${version}`) throw new Error(`Unversioned root asset ${name} in ${file}.`);
      if (name.endsWith('.css')) styleCount++;
    }
  }
  if (!styleCount) throw new Error(`No allowlisted stylesheet reference in ${file}.`);
  pendingPages.push([file, output]);
}

const pendingRootAssets = [];
for (const file of rootAssetAllowlist) {
  try {
    const source = await readFile(join(root, file), 'utf8');
    for (const match of source.matchAll(embeddedAssetPattern)) referencedAssets.add(match[1]);
    pendingRootAssets.push(file);
  } catch (error) {
    if (error.code !== 'ENOENT' || usedRootAssets.has(file) || file === 'styles.css' || file === 'script.js') throw error;
  }
}

// Validate every input before clearing a previous valid build.
const assetsRoot = await realpath(join(root, 'assets'));
const pendingAssets = [];
for (const asset of [...referencedAssets].sort()) {
  const sourcePath = resolve(root, asset);
  const within = path => { const r = relative(assetsRoot, path); return r !== '' && r !== '..' && !r.startsWith(`..${sep}`) && !isAbsolute(r); };
  if (!within(sourcePath) || !within(await realpath(sourcePath))) throw new Error(`Asset path escapes the assets directory: ${asset}`);
  if (!(await stat(sourcePath)).isFile()) throw new Error(`Referenced asset is not a file: ${asset}`);
  const destinationPath = resolve(dist, asset);
  if (!destinationPath.startsWith(dist + sep)) throw new Error(`Asset output escapes the deployment directory: ${asset}`);
  pendingAssets.push([sourcePath, destinationPath]);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const [file, output] of pendingPages) await writeFile(join(dist, file), output);
for (const file of pendingRootAssets) await copyFile(join(root, file), join(dist, file));
for (const [sourcePath, destinationPath] of pendingAssets) {
  await mkdir(dirname(destinationPath), { recursive: true });
  await copyFile(sourcePath, destinationPath);
}
for (const entry of ['README.md', 'build-site.mjs', 'partials', '.github', 'docs', 'tools', 'scripts']) {
  try { await stat(join(dist, entry)); throw new Error(`Deployment artifact contains forbidden entry: ${entry}`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
console.log(`Built and verified dist for ${htmlFiles.length} HTML files with asset version ${version}.`);
console.log(`Copied ${pendingRootAssets.length} allowlisted root assets and ${pendingAssets.length} referenced/public assets.`);
