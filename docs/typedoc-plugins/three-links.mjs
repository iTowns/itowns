// TypeDoc plugin resolving `{@link three!Name}` to the Three.js documentation.
// The doc category (math, core, cameras...) is the folder of the class in
// `three/src`, so no per-class entry is needed in `externalSymbolLinkMappings`.
import { readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const DOCS = 'https://threejs.org/docs/#api/en';

const findCategory = (srcDir, name) => readdirSync(srcDir, { withFileTypes: true })
    .find(d => d.isDirectory() && existsSync(path.join(srcDir, d.name, `${name}.js`)))?.name;

/** @param {import('typedoc').Application} app */
export function load(app) {
    const srcDir = path.join(path.dirname(createRequire(import.meta.url).resolve('three')), '..', 'src');

    app.converter.addUnknownSymbolResolver((ref) => {
        const names = ref.symbolReference?.path;
        if (ref.moduleSource !== 'three' || names?.length !== 1) {
            return undefined;
        }
        const name = names[0].path;
        const category = findCategory(srcDir, name);
        return category ? { target: `${DOCS}/${category}/${name}`, caption: name } : undefined;
    });
}
