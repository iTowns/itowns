import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// This script is used to "augment" the default behavior of npm version by
// updating the version of the Main.js file.
//
// It also add the Main.js file to the git index if the --no-git-tag-version
// flag is not set. This will be committed at the end of the npm version
// command.

const {
    npm_config_git_tag_version = 'false', // no arg <=> --no-git-tag-version false
    npm_package_version, // not undefined by npm version command
} = process.env;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mainPath = path.join(__dirname, '../src/Main.js');

try {
    const content = fs.readFileSync(mainPath, 'utf8');
    const updatedContent = content.replace(
        /const conf = \{\s*version: ['"`][^'"`]+['"`],\s*\};/,
        `const conf = {\n    version: '${npm_package_version}',\n};`
    );
    fs.writeFileSync(mainPath, updatedContent, 'utf8');
} catch (error) {
    console.error('Error updating version:', error.message);
    process.exit(1);
}

if (npm_config_git_tag_version === 'false') {
    try {
        execSync(`git add ${mainPath}`, {
            stdio: 'inherit'
        });
    } catch (error) {
        process.exit(1);
    }
}