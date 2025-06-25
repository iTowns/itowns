import chalk from 'chalk';
import { replaceInFile } from 'replace-in-file';
import path from 'path';
import threeExamples from './threeExamples.mjs';

const fileGLTFLoader = path.resolve(path.dirname('./').replace('config', ''), threeExamples.patchedPath, './loaders/GLTFLoader.js');
const files = fileGLTFLoader.replaceAll('\\', '/');

// Patch _BATCHID in GLTFLoader
const patchBatchID = /JOINTS_0: +'skinIndex',/g;
const patchGLTFLoader = 'JOINTS_0: \'skinIndex\',\n\t\t_BATCHID: \'_BATCHID\',';
const patchBatchID2 = /..\/utils\//g;
const patchGLTFLoader2 = 'three/addons/utils/';

replaceInFile({
    files,
    from: patchBatchID2,
    to: patchGLTFLoader2,
}).then((t) => {
    replaceInFile({
        files,
        from: patchBatchID,
        to: patchGLTFLoader,
    });
    // eslint-disable-next-line no-console
    console.log(chalk.green(`Patched Files: ${t.map(f => path.basename(f.file)).join('\n\t')}`));
});
