import { mkdir, access, copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const publicRoot = path.join(projectRoot, 'public');
const pyodidePublicRoot = path.join(publicRoot, 'pyodide');
const tesseractPublicRoot = path.join(publicRoot, 'tesseract');

const ensureDir = async (dir) => {
  await mkdir(dir, { recursive: true });
};

const pathExists = async (targetPath) => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const resolveOptional = (moduleId) => {
  try {
    return require.resolve(moduleId);
  } catch {
    return null;
  }
};

const ensureFilesPresent = async (root, fileNames) => {
  const missingFiles = [];

  for (const fileName of fileNames) {
    if (!(await pathExists(path.join(root, fileName)))) {
      missingFiles.push(fileName);
    }
  }

  return {
    ok: missingFiles.length === 0,
    missingFiles,
  };
};

const stripSourceMapComment = (content) => content.replace(/\n?\/\/# sourceMappingURL=.*$/gm, '');

const copyIfNeeded = async (source, destination) => {
  await ensureDir(path.dirname(destination));

  if (await pathExists(destination)) {
    return;
  }

  await copyFile(source, destination);
};

const syncTextFile = async (source, destination, transform = (value) => value) => {
  await ensureDir(path.dirname(destination));

  const nextContent = transform(await readFile(source, 'utf8'));
  const previousContent = (await pathExists(destination))
    ? await readFile(destination, 'utf8')
    : null;
  if (previousContent === nextContent) {
    return;
  }

  await writeFile(destination, nextContent);
};

const downloadIfNeeded = async (url, destination) => {
  await ensureDir(path.dirname(destination));

  if (await pathExists(destination)) {
    return;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destination, buffer);
};

const syncPyodide = async () => {
  await ensureDir(pyodidePublicRoot);

  const baseFiles = [
    'pyodide.mjs',
    'pyodide.asm.js',
    'pyodide.asm.wasm',
    'python_stdlib.zip',
    'pyodide-lock.json',
  ];
  const pyodidePackageJson = resolveOptional('pyodide/package.json');

  if (!pyodidePackageJson) {
    const existingFiles = await ensureFilesPresent(pyodidePublicRoot, [
      ...baseFiles,
      'pymupdf-1.26.3-cp313-none-pyodide_2025_0_wasm32.whl',
    ]);
    if (existingFiles.ok) {
      return;
    }

    throw new Error(
      `Missing pyodide package and required runtime assets in public/pyodide. Missing: ${existingFiles.missingFiles.join(', ')}`,
    );
  }

  const pyodideRoot = path.dirname(pyodidePackageJson);
  const pyodidePackage = require(pyodidePackageJson);
  const pyodideLock = require(path.join(pyodideRoot, 'pyodide-lock.json'));
  await Promise.all(
    baseFiles.map((fileName) => {
      const source = path.join(pyodideRoot, fileName);
      const destination = path.join(pyodidePublicRoot, fileName);

      if (fileName.endsWith('.js') || fileName.endsWith('.mjs')) {
        return syncTextFile(source, destination, stripSourceMapComment);
      }

      return copyIfNeeded(source, destination);
    }),
  );

  const pymupdfWheel = pyodideLock.packages.pymupdf.file_name;
  const wheelSource = path.join(pyodideRoot, pymupdfWheel);
  const wheelDestination = path.join(pyodidePublicRoot, pymupdfWheel);

  try {
    await access(wheelSource);
    await copyIfNeeded(wheelSource, wheelDestination);
  } catch {
    const wheelUrl = `https://cdn.jsdelivr.net/pyodide/v${pyodidePackage.version}/full/${pymupdfWheel}`;
    await downloadIfNeeded(wheelUrl, wheelDestination);
  }
};

const syncTesseract = async () => {
  await ensureDir(tesseractPublicRoot);

  const tesseractPackageJson = resolveOptional('tesseract.js/package.json');
  if (!tesseractPackageJson) {
    const requiredFiles = [
      'worker.min.js',
      'tesseract-core.wasm.js',
      'tesseract-core.wasm',
      'tesseract-core-relaxedsimd.wasm.js',
      'tesseract-core-relaxedsimd.wasm',
      'tesseract-core-simd.wasm.js',
      'tesseract-core-simd.wasm',
      'tesseract-core-lstm.wasm.js',
      'tesseract-core-lstm.wasm',
      'tesseract-core-relaxedsimd-lstm.wasm.js',
      'tesseract-core-relaxedsimd-lstm.wasm',
      'tesseract-core-simd-lstm.wasm.js',
      'tesseract-core-simd-lstm.wasm',
      'eng.traineddata.gz',
    ];
    const existingFiles = await ensureFilesPresent(tesseractPublicRoot, requiredFiles);
    if (existingFiles.ok) {
      return;
    }

    throw new Error(
      `Missing tesseract.js package and required runtime assets in public/tesseract. Missing: ${existingFiles.missingFiles.join(', ')}`,
    );
  }

  const tesseractRoot = path.dirname(tesseractPackageJson);
  const tesseractRequire = createRequire(tesseractPackageJson);
  const tesseractCorePackageJson = tesseractRequire.resolve('tesseract.js-core/package.json');
  const tesseractCoreRoot = path.dirname(tesseractCorePackageJson);
  const workerFiles = ['dist/worker.min.js'];
  await Promise.all(
    workerFiles.map((fileName) =>
      syncTextFile(
        path.join(tesseractRoot, fileName),
        path.join(tesseractPublicRoot, path.basename(fileName)),
        stripSourceMapComment,
      ),
    ),
  );

  const coreFiles = [
    'tesseract-core.wasm.js',
    'tesseract-core.wasm',
    'tesseract-core-relaxedsimd.wasm.js',
    'tesseract-core-relaxedsimd.wasm',
    'tesseract-core-simd.wasm.js',
    'tesseract-core-simd.wasm',
    'tesseract-core-lstm.wasm.js',
    'tesseract-core-lstm.wasm',
    'tesseract-core-relaxedsimd-lstm.wasm.js',
    'tesseract-core-relaxedsimd-lstm.wasm',
    'tesseract-core-simd-lstm.wasm.js',
    'tesseract-core-simd-lstm.wasm',
  ];

  await Promise.all(
    coreFiles.map((fileName) =>
      syncTextFile(
        path.join(tesseractCoreRoot, fileName),
        path.join(tesseractPublicRoot, fileName),
        stripSourceMapComment,
      ),
    ),
  );

  await downloadIfNeeded(
    'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz',
    path.join(tesseractPublicRoot, 'eng.traineddata.gz'),
  );
};

await syncPyodide();
await syncTesseract();
