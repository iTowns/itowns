// TypeDoc plugin resolving unqualified `{@link}` tags against the project
// modules (`itowns`, `@itowns/geographic`, ...), so that documentation can
// write `{@link GlobeView}` instead of `{@link itowns!GlobeView | GlobeView}`.
//
// TypeDoc only calls this resolver for links it could not resolve natively
// (e.g. links in tutorials, which have no TypeScript scope). A link matching
// symbols in several modules is reported as ambiguous and must be qualified
// explicitly (`{@link @itowns/geographic!Coordinates}`). Unmatched links are
// left untouched, so `validation.invalidLink` still reports them.
import { ReflectionKind } from 'typedoc';

const findInModule = (module, names) => {
    let current = module;
    for (const name of names) {
        current = current?.getChildByName(name);
    }
    return current;
};

/** @param {import('typedoc').Application} app */
export function load(app) {
    app.converter.addUnknownSymbolResolver((ref, refl, part) => {
        const path = ref.symbolReference?.path;
        if (!part || ref.moduleSource || !path?.length) {
            return undefined;
        }

        const names = path.map(p => p.path);
        const targets = new Set(refl.project.getChildrenByKind(ReflectionKind.Module)
            .map(m => findInModule(m, names))
            .filter(Boolean)
            // Symbols re-exported by several modules share the same target.
            .map(r => (r.isReference() ? r.getTargetReflectionDeep() : r)));

        if (targets.size > 1) {
            const modules = [...targets].map(t => t.getFriendlyFullName()).join(', ');
            app.logger.warn(`Ambiguous link {@link ${part.text}} in ${refl.getFriendlyFullName()} matches ${modules}; qualify it with its module.`);
            return undefined;
        }

        const [target] = targets;
        // TypeDoc types `target` as a URL, but a Reflection is handled like a
        // natively resolved link.
        return target ? { target, caption: target.name } : undefined;
    });
}
