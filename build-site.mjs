import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('.', import.meta.url);
const partials = new URL('./partials/', root);
const htmlFiles = (await readdir(root)).filter((file) => file.endsWith('.html'));
const header = await readFile(new URL('header.html', partials), 'utf8');
const footer = await readFile(new URL('footer.html', partials), 'utf8');
const currentPageByFile = {
  'company.html': 'company',
  'solutions.html': 'solutions',
  'technology.html': 'technology',
  'resources.html': 'resources',
  'contact.html': 'contact',
};

for (const file of htmlFiles) {
  const path = join(root.pathname, file);
  const source = await readFile(path, 'utf8');
  const currentPage = currentPageByFile[file] ?? '';
  const pageHeader = header.replaceAll(' data-nav-page="' + currentPage + '"', ' data-nav-page="' + currentPage + '" aria-current="page"');
  const output = source
    .replace(/<header\b[\s\S]*?<\/header>/i, pageHeader.trim())
    .replace(/<footer\b[\s\S]*?<\/footer>/i, footer.trim());

  if (output === source) {
    throw new Error(`Shared header or footer not found in ${file}`);
  }

  await writeFile(path, output);
}

console.log(`Generated shared header/footer for ${htmlFiles.length} HTML pages.`);