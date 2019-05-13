const replace = require('replace-in-file');
const path = require('path');
const { filesExamples, patchedPath } = require('./threeExamples.js');

const baseNames = filesExamples.map(file => path.basename(file, '.js'));
const files = filesExamples.map(f => path.resolve(__dirname.replace('config', ''), patchedPath, f));

const threeSpaceName = 'THREE';
const spaceName = 'threeExamples';
const patchs = [];

// Start patching
// change THREE namespace to new namespace
// and search build import from three examples and set in importTables
const from = files.map(file => new RegExp(`${threeSpaceName}.${path.basename(file, '.js')}`, 'g'));
const from2Pass = [];
from.push(new RegExp(`(?<=\\b${threeSpaceName}.)\\b\\w+(?=\\s=)`, 'g'));

const importTables = {};
const exportTables = {};
baseNames.forEach((n) => {
    importTables[n] = new Set();
    exportTables[n] = new Set();
});
const to = (match, n, pat, file) => {
    const basename = path.basename(file, '.js');
    if (match.startsWith(threeSpaceName)) {
        if (match.endsWith(basename)) {
            return match.replace(threeSpaceName, spaceName);
        } else {
            const to = match.replace(`${threeSpaceName}.`, '');
            importTables[basename].add(to);
            return to;
        }
    } else {
        from2Pass.push(new RegExp(`${threeSpaceName}.${match}`, 'g'));
        from2Pass.push(new RegExp(`${match}\\s=`, 'g'));
        exportTables[basename].add(match);
        return match;
    }
};

const starting_promise = replace({
    files,
    from,
    to,
}).then((t) => {
    // eslint-disable-next-line no-console
    console.log('Patched Files:');
    // eslint-disable-next-line no-console
    console.log(`\t${t.map(f => path.basename(f.file)).join('\n\t')}`);
});

patchs.push(() => replace({
    files,
    from: from2Pass,
    to: (match) => {
        if (match.endsWith('=')) {
            return `const ${match}`;
        }
        return match.replace(`${threeSpaceName}.`, '');
    },
}));

// New header file:
// Message Header
// import * as THREE from 'three';
// Declare New SpaceName
const modifiedFile = '// This file has been added and patched after installing the NPM modules (via NPM script \'prepare\')\n';
const importTHREE = 'import * as THREE from \'three\';\n';
const declareNewSpaceName = `const ${spaceName} = {};\n`;
patchs.push(() => replace({
    files,
    from: /^(.*)$/m,
    to: match => `${modifiedFile}${importTHREE}${declareNewSpaceName}${match}`,
}));

// Export default function in ending file
patchs.push(() => replace({
    files,
    from: /.*$/i,
    to: (match, n, pat, file) => {
        const basename = path.basename(file, '.js');
        return `\nexport default ${spaceName}.${basename};\n`;
    },
}));

// Export alls other functions in ending file
patchs.push(() => replace({
    files,
    from: /.*$/i,
    to: (match, n, pat, file) => {
        const basename = path.basename(file, '.js');
        if (exportTables[basename] && exportTables[basename].size) {
            exportTables[basename].toString();
            return `export {${[...exportTables[basename]].join()}};\n`;
        }
        return match;
    },
}));

// Add import from threeExtented
patchs.push(() => replace({
    files,
    from: declareNewSpaceName,
    to: (match, n, pat, file) => {
        const basename = path.basename(file, '.js');
        if (match == declareNewSpaceName && importTables[basename].size) {
            return match + [...importTables[basename]].map((n) => {
                const from = path.dirname(filesExamples.find(f => path.basename(f, '.js') === basename)).replace('.', '');
                const to = path.dirname(filesExamples.find(f => path.basename(f, '.js') === n)).replace('.', '');
                const relative = path.relative(`_/${from}`, `_/${to}`).replace('\\', '\/');
                if (relative == '') {
                    return `import ${n} from './${n}';`;
                } else {
                    return `import ${n} from '${relative}/${n}';`;
                }
            }).join('\n');
        } else {
            return match;
        }
    },
}));

// Patch _BATCHID in GLTFLoader
const fileGLTFLoader = files.filter(f => path.basename(f, '.js') === 'GLTFLoader');
const patchBatchID = /JOINTS_0: +'skinIndex',/g;
const patchGLTFLoader = 'JOINTS_0: \'skinIndex\',\n\t\t_BATCHID: \'_BATCHID\',';

patchs.push(() => replace({
    files: fileGLTFLoader,
    from: patchBatchID,
    to: patchGLTFLoader,
}));

// Patch _BATCHID in LegacyGLTFLoader
const fileLegacyGLTFLoader = files.filter(f => path.basename(f, '.js') === 'LegacyGLTFLoader');
const fromBatchIDLegacy = /case +'JOINT':\s+geometry\.addAttribute\( 'skinIndex', bufferAttribute \);\s+break;/g;
const toLegacyGLTFLoader = 'case \'JOINT\':\ngeometry.addAttribute( \'skinIndex\', bufferAttribute );\nbreak;\ncase \'_BATCHID\':\ngeometry.addAttribute( \'_BATCHID\', bufferAttribute );\nbreak;';

patchs.push(() => replace({
    files: fileLegacyGLTFLoader,
    from: fromBatchIDLegacy,
    to: toLegacyGLTFLoader,
}));

// Chain all patchs, Warning the order of patchs is important
patchs.reduce((prev, cur) => prev.then(cur), starting_promise);
