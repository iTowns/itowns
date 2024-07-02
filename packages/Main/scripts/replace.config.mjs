import chalk from 'chalk';
import replace from 'replace-in-file';
import path from 'path';
import threeExamples from './threeExamples.mjs';

const fileGLTFLoader = path.resolve(path.dirname('./').replace('config', ''), threeExamples.patchedPath, './loaders/GLTFLoader.js');

// Patch _BATCHID in GLTFLoader
const patchBatchID = /JOINTS_0: +'skinIndex',/g;
const patchGLTFLoader = 'JOINTS_0: \'skinIndex\',\n\t\t_BATCHID: \'_BATCHID\',';

replace({
    files: fileGLTFLoader.replaceAll('\\','/'),
    from: patchBatchID,
    to: patchGLTFLoader,
}).then((t) => {
    // eslint-disable-next-line no-console
    console.log(chalk.green(`Patched Files: ${t.map(f => path.basename(f.file)).join('\n\t')}`));
});
