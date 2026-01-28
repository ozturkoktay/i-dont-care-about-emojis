
/**
 * Build Script
 * Prepares the extension for distribution
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD_DIR = path.join(__dirname, '..', 'dist');
const SRC_DIR = path.join(__dirname, '..', 'src');
const ROOT_DIR = path.join(__dirname, '..');

function setupBuildDir() {
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true });
  }
  fs.mkdirSync(BUILD_DIR, { recursive: true });
}

function copyDirectory(src, dest, processFiles = false) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath, processFiles);
    } else if (processFiles && entry.name.endsWith('.js')) {

      let content = fs.readFileSync(srcPath, 'utf8');

      content = content.replace(/^export\s+\{[^}]*\};?\s*$/gm, '');
      fs.writeFileSync(destPath, content);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyFile(src, dest) {
  fs.copyFileSync(src, dest);
}

function build() {
  console.log('Building I don\'t care about emojis Extension...');

  setupBuildDir();

  console.log('Copying source files...');
  copyDirectory(SRC_DIR, path.join(BUILD_DIR, 'src'), true);

  console.log('Copying manifest...');
  copyFile(
    path.join(ROOT_DIR, 'manifest.json'),
    path.join(BUILD_DIR, 'manifest.json')
  );

  const iconsDir = path.join(ROOT_DIR, 'icons');
  if (fs.existsSync(iconsDir)) {
    console.log('Copying icons...');
    copyDirectory(iconsDir, path.join(BUILD_DIR, 'icons'));
  } else {
    console.log('⚠️  No icons directory found. Creating placeholder...');
    fs.mkdirSync(path.join(BUILD_DIR, 'icons'), { recursive: true });
    fs.writeFileSync(
      path.join(BUILD_DIR, 'icons', 'README.txt'),
      'Place your icon files (icon16.png, icon48.png, icon128.png) here.'
    );
  }

  const readmePath = path.join(ROOT_DIR, 'README.md');
  if (fs.existsSync(readmePath)) {
    console.log('Copying README...');
    copyFile(readmePath, path.join(BUILD_DIR, 'README.md'));
  }

  console.log('Build complete! Output in dist/ directory');
}

try {
  build();
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
