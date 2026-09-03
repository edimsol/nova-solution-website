import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const version = process.argv[2];

if (!/^[0-9a-f]{7}$/i.test(version ?? '')) {
  throw new Error('Expected a 7-character hexadecimal commit SHA argument.');
}

const htmlFiles = (await readdir(root)).filter((file) => file.endsWith('.html')).sort();
if (htmlFiles.length !== 11) {
  throw new Error(`Expected 11 root HTML files, found ${htmlFiles.length}.`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const referencedAssets = new Set();
const externalUrlPattern = /https?:\/\/[^"'\s)<>]+/g;
const localAssetPattern = /(?:href|src)\s*=\s*["']\.\/(assets\/[^"'?#]+)(?:[?#][^"']*)?["']/gi;

for (const file of htmlFiles) {
  const source = await readFile(join(root, file), 'utf8');
  const sourceExternalUrls = source.match(externalUrlPattern) ?? [];

  const output = source
    .replace(
      /(href\s*=\s*["'])\.\/styles\.css(?:\?v=[^"'#\s]*)?(["'])/gi,
      `$1./styles.css?v=${version}$2`,
    )
    .replace(
      /(src\s*=\s*["'])\.\/script\.js(?:\?v=[^"'#\s]*)?(["'])/gi,
      `$1./script.js?v=${version}$2`,
    );

  const outputExternalUrls = output.match(externalUrlPattern) ?? [];
  if (JSON.stringify(outputExternalUrls) !== JSON.stringify(sourceExternalUrls)) {
    throw new Error(`External URL changed while processing ${file}.`);
  }

  const versionedStyles = output.match(new RegExp(`href\\s*=\\s*["']\\.\\/styles\\.css\\?v=${version}["']`, 'gi')) ?? [];
  const versionedScripts = output.match(new RegExp(`src\\s*=\\s*["']\\.\\/script\\.js\\?v=${version}["']`, 'gi')) ?? [];
  const unversionedStyles = output.match(/href\s*=\s*["']\.\/styles\.css["']/gi) ?? [];
  const unversionedScripts = output.match(/src\s*=\s*["']\.\/script\.js["']/gi) ?? [];

  if (versionedStyles.length === 0 || versionedScripts.length === 0) {
    throw new Error(`Missing versioned CSS or JavaScript reference in ${file}.`);
  }
  if (unversionedStyles.length > 0 || unversionedScripts.length > 0) {
    throw new Error(`Unversioned CSS or JavaScript reference remains in ${file}.`);
  }

  for (const match of output.matchAll(localAssetPattern)) {
    referencedAssets.add(match[1]);
  }

  await writeFile(join(dist, file), output);
}

for (const file of ['styles.css', 'script.js']) {
  await copyFile(join(root, file), join(dist, file));
}

const assetsRoot = join(root, 'assets');
for (const asset of [...referencedAssets].sort()) {
  const sourcePath = resolve(root, asset);
  const relativeToAssets = relative(assetsRoot, sourcePath);
  if (relativeToAssets.startsWith(`..${sep}`) || relativeToAssets === '..') {
    throw new Error(`Asset path escapes the assets directory: ${asset}`);
  }

  const sourceStat = await stat(sourcePath);
  if (!sourceStat.isFile()) {
    throw new Error(`Referenced asset is not a file: ${asset}`);
  }

  const destinationPath = join(dist, asset);
  await mkdir(dirname(destinationPath), { recursive: true });
  await copyFile(sourcePath, destinationPath);
}

const forbiddenEntries = ['README.md', 'build-site.mjs', 'partials', '.github'];
for (const entry of forbiddenEntries) {
  try {
    await stat(join(dist, entry));
    throw new Error(`Deployment artifact contains forbidden entry: ${entry}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

console.log(`Built and verified dist for ${htmlFiles.length} HTML files with asset version ${version}.`);
console.log(`Copied ${referencedAssets.size} referenced image assets.`);
