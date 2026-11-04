// Verifies that every documented class has a `@category` tag, so the
// generated API reference groups it under one of the sections declared in
// `typedoc.json` (`categoryOrder`) instead of falling back to "Other".
//
// It also verifies that the legacy "module-style" default-export objects
// (e.g. `Fetcher`, `URLBuilder`, `GpxParser`...) that used to be documented
// as `@module` entries in the old JSDoc-based navigation are still
// categorized. TypeDoc 0.28 does not support the old `@module` tag: a
// comment containing only `@module <name>` (with no other content) is
// silently dropped, which orphans these entries from the generated
// navigation. The fix applied across the codebase is to drop the `@module`
// tag and add a `@category <Section>` tag instead, directly on the comment
// above the file's `export default { ... }` (or `const X = (function...`)
// declaration; this both documents the object and makes TypeDoc file it
// under the right navigation category.
import { Application, ReflectionKind } from 'typedoc';

// `Application.bootstrap` (used without plugins) does not load
// `typedoc-plugin-mdn-links`; use `bootstrapWithPlugins` so the conversion
// matches what `npx typedoc` produces. `typedoc.json` is read automatically
// since it sits at the project root (the default config file location).
const app = await Application.bootstrapWithPlugins();
const project = await app.convert();
if (!project) {
    process.exit(1);
}

const hasCategory = r => r.comment?.blockTags?.some(t => t.tag === '@category');
const isInternal = r => r.comment?.modifierTags?.has('@internal') || r.comment?.modifierTags?.has('@hidden');

const missing = project.getReflectionsByKind(ReflectionKind.Class)
    .filter(c => !isInternal(c) && !hasCategory(c))
    .map(c => c.name);

if (missing.length) {
    console.error(`Classes without @category: ${missing.join(', ')}`);
    process.exit(1);
}

console.log('All classes have a @category tag.');

// Former `@module`-tagged files that must now carry a `@category` tag on
// their default export (see comment above). Paths are matched against the
// end of each reflection's source file name.
const legacyModuleStyleFiles = [
    'packages/Main/src/Renderer/ColorLayersOrdering.js',
    'packages/Main/src/Core/Picking.js',
    'packages/Main/src/Converter/Feature2Mesh.js',
    'packages/Main/src/Provider/Fetcher.js',
    'packages/Main/src/Provider/URLBuilder.js',
    'packages/Main/src/Utils/CameraUtils.js',
    'packages/Main/src/Utils/DEMUtils.js',
    'packages/Main/src/Parser/VectorTileParser.js',
    'packages/Main/src/Parser/PotreeBinParser.js',
    'packages/Main/src/Parser/GTXParser.js',
    'packages/Main/src/Parser/PntsParser.js',
    'packages/Main/src/Parser/KMLParser.js',
    'packages/Main/src/Parser/LASParser.js',
    'packages/Main/src/Parser/GDFParser.js',
    'packages/Main/src/Parser/GeoJsonParser.js',
    'packages/Main/src/Parser/CameraCalibrationParser.js',
    'packages/Main/src/Parser/B3dmParser.js',
    'packages/Main/src/Parser/ISGParser.js',
    'packages/Main/src/Parser/GpxParser.js',
    'packages/Main/src/Parser/ShapefileParser.js',
    'packages/Main/src/Parser/Potree2BinParser.js',
    'examples/jsm/plugins/FeatureToolTip.js',
    'examples/jsm/plugins/CSVnVRTParser.js',
    'examples/jsm/plugins/DragNDrop.js',
    'examples/jsm/plugins/TIFFParser.js',
];

const modules = project.getReflectionsByKind(ReflectionKind.Module);
const missingModuleCategory = [];
for (const file of legacyModuleStyleFiles) {
    const mod = modules.find(m => m.sources?.some(s => s.fileName.endsWith(file)));
    if (!mod) {
        missingModuleCategory.push(`${file} (module not found)`);
        continue;
    }
    const defaultExport = mod.children?.find(c => c.name === 'default') ?? mod;
    if (!hasCategory(defaultExport)) {
        missingModuleCategory.push(file);
    }
}

if (missingModuleCategory.length) {
    console.error(`Legacy module-style files without @category: ${missingModuleCategory.join(', ')}`);
    process.exit(1);
}

console.log('All legacy module-style files have a @category tag.');

