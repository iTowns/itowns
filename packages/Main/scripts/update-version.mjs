import fs from 'fs';

// This script is used to keep the version in sync between package.json and
// Main.js, it is called by the npm postversion script.

const version = JSON.parse(fs.readFileSync('./package.json', 'utf8')).version;
const mainPath = './src/Main.js';

try {
    const content = fs.readFileSync(mainPath, 'utf8');
    const updatedContent = content.replace(
        /const conf = \{\s*version: ['"`][^'"`]+['"`],\s*\};/,
        `const conf = {\n    version: '${version}',\n};`
    );
    fs.writeFileSync(mainPath, updatedContent, 'utf8');
} catch (error) {
    console.error('Error updating version:', error.message);
    process.exit(1);
}