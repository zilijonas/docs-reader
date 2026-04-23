import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const distRoot = path.resolve('dist');
const forbiddenFilePatterns = [/\.map$/i, /treemap/i, /visualizer/i];
const scriptExtensions = new Set(['.js', '.mjs']);
const violations = [];

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const resolvedPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await walk(resolvedPath);
      continue;
    }

    const relativePath = path.relative(distRoot, resolvedPath);
    if (forbiddenFilePatterns.some((pattern) => pattern.test(relativePath))) {
      violations.push(`forbidden artifact: ${relativePath}`);
    }

    if (scriptExtensions.has(path.extname(entry.name))) {
      const content = await readFile(resolvedPath, 'utf8');
      if (content.includes('sourceMappingURL=')) {
        violations.push(`source map reference in: ${relativePath}`);
      }
    }
  }
};

await walk(distRoot);

if (violations.length > 0) {
  console.error('Build output verification failed.');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Build output verification passed.');
