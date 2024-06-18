import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const pattern = /(const\s+conf\s*=\s*\{\s*[\s\S]*?version\s*:\s*')(\d+\.\d+\.\d+)('\s*[,;]?[\s\S]*?\};)/;

const version = process.env.npm_package_version;
if (!version) {
    console.error('$npm_package_version environment variable required.');
    process.exit(1);
}

const filePath = join(__dirname, '..', 'src', 'Main.js');
const content = readFileSync(filePath, 'utf8');
const patched = content.replace(pattern, `$1${version}$3`);
writeFileSync(filePath, patched, 'utf8');
