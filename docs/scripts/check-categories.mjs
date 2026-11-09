// Verifies that every documented class has a `@category` tag, so the
// generated API reference groups it under one of the sections declared in
// `typedoc.json` (`categoryOrder`) instead of falling back to "Other".
//
// It also verifies that the "module-style" objects (plain object literals
// such as `Fetcher`, `GpxParser` or `CameraUtils`, formerly documented with
// the JSDoc `@module` tag) are categorized: their `@category` tag goes on the
// comment above the object declaration.
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

// Legacy "module-style" objects (e.g. `Fetcher`, `GpxParser`, `CameraUtils`...)
// are plain object literals exported as variables. They must be categorized
// too, otherwise they fall back to the "Other" navigation section.
const isModuleStyleObject = r => r.kindOf(ReflectionKind.Variable)
    && r.type?.type === 'reflection'
    && r.type.declaration?.kindOf(ReflectionKind.TypeLiteral);

const missingModuleCategory = project.getReflectionsByKind(ReflectionKind.Variable)
    .filter(v => v.parent?.kindOf(ReflectionKind.Module))
    .filter(v => isModuleStyleObject(v) && v.hasComment() && !isInternal(v) && !hasCategory(v))
    .map(v => `${v.parent.name}.${v.name}`);

if (missingModuleCategory.length) {
    console.error(`Module-style objects without @category: ${missingModuleCategory.join(', ')}`);
    process.exit(1);
}

console.log('All module-style objects have a @category tag.');
