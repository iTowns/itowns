const copyfiles = require('copyfiles');
const { filesExamples, patchedPath } = require('./threeExamples.js');

const paths = filesExamples.map(f => f.replace('./', './node_modules/three/examples/js/'));

paths.push(patchedPath);

copyfiles(paths, { up: 4 }, () => {});
