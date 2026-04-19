import { mkdir, access, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const pyodidePackageJson = require.resolve('pyodide/package.json');
const pyodideRoot = path.dirname(pyodidePackageJson);
const pyodidePackage = require(pyodidePackageJson);
const pyodideLock = require(path.join(pyodideRoot, 'pyodide-lock.json'));
const tesseractPackageJson = require.resolve('tesseract.js/package.json');
const tesseractRoot = path.dirname(tesseractPackageJson);
const tesseractRequire = createRequire(tesseractPackageJson);
const tesseractCorePackageJson = tesseractRequire.resolve('tesseract.js-core/package.json');
const tesseractCoreRoot = path.dirname(tesseractCorePackageJson);

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const publicRoot = path.join(projectRoot, 'public');
const pyodidePublicRoot = path.join(publicRoot, 'pyodide');
const tesseractPublicRoot = path.join(publicRoot, 'tesseract');

const ensureDir = async (dir) => {
  await mkdir(dir, { recursive: true });
};

const copyIfNeeded = async (source, destination) => {
  await ensureDir(path.dirname(destination));

  try {
    await access(destination);
    return;
  } catch {
    await copyFile(source, destination);
  }
};

const downloadIfNeeded = async (url, destination) => {
  await ensureDir(path.dirname(destination));

  try {
    await access(destination);
    return;
  } catch {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(destination, buffer);
  }
};

const syncPyodide = async () => {
  await ensureDir(pyodidePublicRoot);

  const baseFiles = ['pyodide.mjs', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
  await Promise.all(
    baseFiles.map((fileName) => copyIfNeeded(path.join(pyodideRoot, fileName), path.join(pyodidePublicRoot, fileName))),
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

  const workerFiles = ['dist/worker.min.js'];
  await Promise.all(
    workerFiles.map((fileName) =>
      copyIfNeeded(path.join(tesseractRoot, fileName), path.join(tesseractPublicRoot, path.basename(fileName))),
    ),
  );

  const coreFiles = [
    'tesseract-core.wasm.js',
    'tesseract-core.wasm',
    'tesseract-core-simd.wasm.js',
    'tesseract-core-simd.wasm',
    'tesseract-core-lstm.wasm.js',
    'tesseract-core-lstm.wasm',
    'tesseract-core-simd-lstm.wasm.js',
    'tesseract-core-simd-lstm.wasm',
  ];

  await Promise.all(
    coreFiles.map((fileName) =>
      copyIfNeeded(path.join(tesseractCoreRoot, fileName), path.join(tesseractPublicRoot, fileName)),
    ),
  );

  await downloadIfNeeded(
    'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz',
    path.join(tesseractPublicRoot, 'eng.traineddata.gz'),
  );
};

await syncPyodide();
await syncTesseract();
