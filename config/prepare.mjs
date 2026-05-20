import { styleText } from 'node:util';
import { execSync } from 'node:child_process';

const yellow = text => styleText('yellow', text);

// Verify Puppeteer configuration
const pupSkip = process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD;

if (!pupSkip) {
    console.log(yellow(`Warning PUPPETEER_SKIP_CHROMIUM_DOWNLOAD is undefined,
the installation'll be longer because Puppeteer'll download Chromium,
only needed for testing. Read CODING.md for more information.\n`));
}

console.log(styleText('green', `Node.js version : ${process.versions.node}`));

const npmVersion = execSync('npm --version', {
    encoding: 'utf8',
});
if (npmVersion) {
    console.log(styleText('green', `Npm version : ${npmVersion}`));
}
