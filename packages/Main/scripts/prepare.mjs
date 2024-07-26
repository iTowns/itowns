import fs from 'node:fs';
import copyfiles from 'copyfiles';
import threeExamples from './threeExamples.mjs';

let path = './node_modules/three/examples/jsm/';

if (!fs.existsSync(path)) {
    path = `../../${path}`;
}

// Copy THREE Examples Files
const paths = threeExamples.filesExamples.map(f => f.replace('./', path));

paths.push(threeExamples.patchedPath);

copyfiles(paths, { up: 6 }, () => {});
