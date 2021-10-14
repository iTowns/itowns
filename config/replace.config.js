const replace = require('replace-in-file');
const path = require('path');
const chalk = require('chalk');
const { filesExamples, patchedPath } = require('./threeExamples.js');

const fileGLTFLoader = path.resolve(__dirname.replace('config', ''), patchedPath, './loaders/GLTFLoader.js');
const files = filesExamples.map(f => path.resolve(__dirname.replace('config', ''), patchedPath, f));

// Patch _BATCHID in GLTFLoader
const patchBatchID = /JOINTS_0: +'skinIndex',/g;
const patchGLTFLoader = 'JOINTS_0: \'skinIndex\',\n\t\t_BATCHID: \'_BATCHID\',';

replace({
    files: fileGLTFLoader,
    from: patchBatchID,
    to: patchGLTFLoader,
}).then(() => replace({
    files,
    from: /..\/..\/..\/build\/three.module.js/g,
    to: 'three',
}).then((t) => {
    // eslint-disable-next-line no-console
    console.log(chalk.green('Patched Files:'));
    // eslint-disable-next-line no-console
    console.log(chalk.green(`\t${t.map(f => path.basename(f.file)).join('\n\t')}`));
}));
