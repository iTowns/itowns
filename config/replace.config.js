const replace = require('replace-in-file');
const path = require('path');
const chalk = require('chalk');
const { patchedPath } = require('./threeExamples');

const fileGLTFLoader = path.resolve(__dirname.replace('config', ''), patchedPath, './loaders/GLTFLoader.js');

// Patch _BATCHID in GLTFLoader
const patchBatchID = /JOINTS_0: +'skinIndex',/g;
const patchGLTFLoader = 'JOINTS_0: \'skinIndex\',\n\t\t_BATCHID: \'_BATCHID\',';

replace({
    files: fileGLTFLoader,
    from: patchBatchID,
    to: patchGLTFLoader,
}).then((t) => {
    // eslint-disable-next-line no-console
    console.log(chalk.green(`Patched Files: ${t.map(f => path.basename(f.file)).join('\n\t')}`));
});
