// TypeDoc plugin resolving references to Three.js symbols to the Three.js
// documentation: `{@link three!Name}` links and types such as
// `{THREE.Object3D}`, `{Object3D}` (declared by `@types/three`) or
// `{@link THREE.Object3D}` (even without `THREE` in scope), including
// addons (`three/addons/...`) and members (`THREE.Object3D.copy`).
// A link is only emitted for classes having a source file in `three/src` or
// `three/examples/jsm`, so no per-class entry is needed in
// `externalSymbolLinkMappings`.
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const DOCS = 'https://threejs.org/docs/#';
const MODULES = new Set(['three', '@types/three']);

const listClasses = dir => readdirSync(dir, { recursive: true })
    .filter(f => f.endsWith('.js'))
    .map(f => path.basename(f, '.js'));

/** @param {import('typedoc').Application} app */
export function load(app) {
    const root = path.join(path.dirname(createRequire(import.meta.url).resolve('three')), '..');
    const classes = new Set([
        ...listClasses(path.join(root, 'src')),
        ...listClasses(path.join(root, 'examples', 'jsm')),
    ]);

    app.converter.addUnknownSymbolResolver((ref) => {
        const names = ref.symbolReference?.path;
        // `{@link THREE.X}` is resolved by TypeScript when `THREE` is in
        // scope, otherwise it comes without module source.
        const isThree = MODULES.has(ref.moduleSource)
            || (!ref.moduleSource && names?.[0]?.path === 'THREE');
        if (!isThree || !names?.length) {
            return undefined;
        }
        const fullName = names.map(p => p.path).join('.');
        const [name, member] = fullName
            .replace(/<[^>]*>/g, '')
            .replace(/^THREE\./, '')
            .split('.');
        if (!classes.has(name)) {
            return undefined;
        }
        const anchor = member && member !== 'constructor' ? `${name}.${member}` : name;
        return { target: `${DOCS}${anchor}`, caption: fullName };
    });
}
