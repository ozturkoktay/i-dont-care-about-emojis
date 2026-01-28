
/**
 * Manifest Validator
 * Validates manifest.json for Chrome and Firefox compatibility
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MANIFEST_PATH = path.join(__dirname, '..', 'manifest.json');

function validateManifest() {
  console.log('Validating manifest.json...');

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('manifest.json not found!');
    process.exit(1);
  }

  let manifest;
  try {
    const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
    manifest = JSON.parse(manifestContent);
  } catch (error) {
    console.error('Invalid JSON in manifest.json:', error.message);
    process.exit(1);
  }

  const requiredFields = [
    'manifest_version',
    'name',
    'version',
    'description'
  ];

  const missingFields = requiredFields.filter(field => !manifest[field]);
  
  if (missingFields.length > 0) {
    console.error('Missing required fields:', missingFields.join(', '));
    process.exit(1);
  }

  if (manifest.manifest_version !== 3) {
    console.warn('⚠️  Manifest version is not 3. This may cause compatibility issues.');
  }

  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(manifest.version)) {
    console.error('Invalid version format. Expected: X.Y.Z');
    process.exit(1);
  }

  if (!manifest.permissions || !Array.isArray(manifest.permissions)) {
    console.warn('⚠️  No permissions defined');
  }

  if (manifest.icons) {
    const iconSizes = Object.keys(manifest.icons);
    const requiredSizes = ['16', '48', '128'];
    const missingSizes = requiredSizes.filter(size => !iconSizes.includes(size));
    
    if (missingSizes.length > 0) {
      console.warn('⚠️  Missing recommended icon sizes:', missingSizes.join(', '));
    }
  } else {
    console.warn('⚠️  No icons defined');
  }

  if (manifest.content_scripts) {
    manifest.content_scripts.forEach((script, index) => {
      if (!script.matches || !Array.isArray(script.matches)) {
        console.error(`Content script ${index} missing 'matches' field`);
        process.exit(1);
      }
      if (!script.js || !Array.isArray(script.js)) {
        console.error(`Content script ${index} missing 'js' field`);
        process.exit(1);
      }
    });
  }

  if (manifest.background) {
    if (!manifest.background.service_worker) {
      console.warn('⚠️  No service_worker defined in background');
    }
  }

  console.log('Manifest validation passed!');
  console.log(`   Name: ${manifest.name}`);
  console.log(`   Version: ${manifest.version}`);
  console.log(`   Manifest Version: ${manifest.manifest_version}`);
}

try {
  validateManifest();
} catch (error) {
  console.error('Validation failed:', error);
  process.exit(1);
}
