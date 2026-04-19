import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(new URL('..', import.meta.url).pathname);
const sourceRoot = path.join(projectRoot, 'src');
const allowedInlineStyleMatches = [
  {
    file: 'src/components/app/PdfViewer.tsx',
    pattern: /style=\{\{/,
    reason: 'runtime geometry CSS variables for viewer overlays',
  },
  {
    file: 'src/features/redactor/components/AppShell.tsx',
    pattern: /--viewer-zoom/,
    reason: 'runtime zoom CSS variable',
  },
  {
    file: 'src/components/ui/ProgressBar.tsx',
    pattern: /--progress-value/,
    reason: 'runtime progress CSS variable',
  },
  {
    file: 'src/assets/background.svg',
    pattern: /style="/,
    reason: 'intrinsic SVG asset styling',
  },
];

const scannedExtensions = new Set(['.astro', '.svg', '.ts', '.tsx']);
const violations = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }

    if (!scannedExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const relativePath = path.relative(projectRoot, fullPath).replaceAll(path.sep, '/');
    const contents = await readFile(fullPath, 'utf8');
    const lines = contents.split('\n');

    lines.forEach((line, index) => {
      if (!line.includes('style={{') && !line.includes('style="')) {
        return;
      }

      const allowlistEntry = allowedInlineStyleMatches.find(
        (entryRule) => entryRule.file === relativePath && entryRule.pattern.test(line),
      );

      if (!allowlistEntry) {
        violations.push(`${relativePath}:${index + 1}: ${line.trim()}`);
      }
    });
  }
}

await walk(sourceRoot);

if (violations.length > 0) {
  console.error('Disallowed inline style usage found:\n');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log(
  `Inline style check passed. Allowed exceptions: ${allowedInlineStyleMatches
    .map((entry) => `${entry.file} (${entry.reason})`)
    .join(', ')}`,
);
