### Automatic patch three examples to import directly in `itowns`.

`three/examples` files are patched to support ES6 `import`.


## Add file to patch
To patch Three.js examples add file path in `Array filesExamples` in file `./threeExamples.js` ;

```js
module.exports = {
    patchedPath: './ThreeExtended/',
    filesExamples: [
        './loaders/GLTFLoader.js',
        './loaders/deprecated/LegacyGLTFLoader.js',
        './loaders/DDSLoader.js',
        './loaders/DRACOLoader.js',
        './utils/BufferGeometryUtils.js',
        /// Add your file to patch here.
    ],
};
```

## Import patched file
`threeExamples` is alias path to import three examples.
By example, you could be imported in itowns by:

```js
import GLTFLoader from './ThreeExtended/loaders/GLTFLoader';
```