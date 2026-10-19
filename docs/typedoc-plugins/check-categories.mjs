// TypeDoc plugin verifying that every documented class has a `@category` tag,
// so the generated API reference groups it under one of the sections declared
// in `typedoc.json` (`categoryOrder`) instead of falling back to "Other".
//
// It also verifies that the "module-style" objects (plain object literals
// such as `Fetcher`, `GpxParser` or `CameraUtils`, formerly documented with
// the JSDoc `@module` tag) are categorized: their `@category` tag goes on the
// comment above the object declaration.
//
// Missing tags are reported as warnings during TypeDoc validation, which fail
// the run since `treatWarningsAsErrors` is enabled.
import { Application, ReflectionKind } from 'typedoc';

const hasCategory = r => r.comment?.blockTags?.some(t => t.tag === '@category');
const isInternal = r => r.comment?.modifierTags?.has('@internal') || r.comment?.modifierTags?.has('@hidden');

const isModuleStyleObject = r => r.kindOf(ReflectionKind.Variable)
    && r.type?.type === 'reflection'
    && r.type.declaration?.kindOf(ReflectionKind.TypeLiteral);

/** @param {import('typedoc').Application} app */
export function load(app) {
    app.on(Application.EVENT_VALIDATE_PROJECT, (project) => {
        const missingClasses = project.getReflectionsByKind(ReflectionKind.Class)
            .filter(c => !isInternal(c) && !hasCategory(c))
            .map(c => c.name);

        if (missingClasses.length) {
            app.logger.warn(`Classes without @category: ${missingClasses.join(', ')}`);
        }

        const missingObjects = project.getReflectionsByKind(ReflectionKind.Variable)
            .filter(v => v.parent?.kindOf(ReflectionKind.Module))
            .filter(v => isModuleStyleObject(v) && v.hasComment() && !isInternal(v) && !hasCategory(v))
            .map(v => `${v.parent.name}.${v.name}`);

        if (missingObjects.length) {
            app.logger.warn(`Module-style objects without @category: ${missingObjects.join(', ')}`);
        }
    });
}
