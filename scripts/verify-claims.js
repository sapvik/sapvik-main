import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');
const claimsPath = path.join(__dirname, '..', 'src', 'config', 'claims.json');

if (!fs.existsSync(distDir)) {
  console.error('Error: dist/ directory does not exist. Run "npm run build" first.');
  process.exit(1);
}

const claimsData = JSON.parse(fs.readFileSync(claimsPath, 'utf8'));
const unverifiedClaims = claimsData.claims.filter(c => c.verified === false);

const bannedPatterns = [
  { pattern: /9876543210/, label: 'Forbidden placeholder telephone 9876543210' },
  { pattern: /lorem\s+ipsum/i, label: 'Lorem ipsum placeholder text' },
  { pattern: /500\+\s*(?:clients|projects)/i, label: 'Unverified client count claim' },
  { pattern: /10x\s*roi/i, label: 'Fabricated ROI guarantee' }
];

// Add unverified claims statements & text to banned list
for (const unverified of unverifiedClaims) {
  if (unverified.statement) {
    bannedPatterns.push({
      pattern: new RegExp(escapeRegex(unverified.statement), 'i'),
      label: `Unverified claim statement: "${unverified.statement}" (${unverified.id})`
    });
  }
  if (unverified.claim_text) {
    bannedPatterns.push({
      pattern: new RegExp(escapeRegex(unverified.claim_text), 'i'),
      label: `Unverified claim text: "${unverified.claim_text}" (${unverified.id})`
    });
  }
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let violations = [];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  for (const { pattern, label } of bannedPatterns) {
    if (pattern.test(content)) {
      violations.push({
        file: path.relative(distDir, filePath),
        label
      });
    }
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      checkFile(fullPath);
    }
  }
}

walkDir(distDir);

if (violations.length > 0) {
  console.error('❌ Claims verification failed with violations:');
  for (const v of violations) {
    console.error(`  - In [${v.file}]: ${v.label}`);
  }
  process.exit(1);
} else {
  console.log('✅ Claims verification passed: 0 unverified claims or banned patterns found in dist/');
  process.exit(0);
}
