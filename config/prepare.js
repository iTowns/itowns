const chalk = require('chalk');
const { execSync } = require('child_process');

// Verify Puppeteer configuration
const pupSkip = process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD;

if (!pupSkip) {
    console.log(chalk.yellow(`Warning PUPPETEER_SKIP_CHROMIUM_DOWNLOAD is undefined,
the installation'll be longer because Puppeteer'll download Chromium,
only needed for testing. Read CODING.md for more information.\n`));
}

// Check node version to prevent error in THREE examples installation
const nodeMajorVersion = process.versions.node.split('.')[0];
const minNodeMajorVersion = 10;

if (nodeMajorVersion < minNodeMajorVersion) {
    console.log(chalk.red('Node.js version :', process.versions.node));
    console.error(chalk.red(`Error:\tYour installed Node version is inferior to ${minNodeMajorVersion},
\tyou must have Node.js ${minNodeMajorVersion} or superior to develop in iTowns core`));
} else {
    console.log(chalk.green('Node.js version :', process.versions.node));
}

const npmVersion = execSync('npm --version', {
    encoding: 'utf8',
});
if (npmVersion) {
    console.log(chalk.green('Npm version :', npmVersion), '\n');
}

// Copy and patch THREE Examples Files
const copyfiles = require('copyfiles');
const { filesExamples, patchedPath } = require('./threeExamples.js');

const paths = filesExamples.map(f => f.replace('./', './node_modules/three/examples/jsm/'));

paths.push(patchedPath);

copyfiles(paths, { up: 4 }, () => {});
