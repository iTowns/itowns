# Documentation

The documentation of itowns is available on the itowns website:
http://www.itowns-project.org/itowns/docs/

## Writing documentation

The documentation is composed of two parts: the API reference, and
tutorials.

### API reference

The API reference is written in the source of itowns using
[TypeDoc](https://typedoc.org/), which relies on standard
[TSDoc](https://tsdoc.org/)/JSDoc comments and supports the
[Markdown](https://commonmark.org/help/) syntax. It documents both the `.ts`
and `.js` sources, and generates a classic reference explaining all exposed
methods and classes in itowns.

The reference is built from the public entry point of each package, declared
in `typedoc.json` (`entryPoints`): `itowns` (`packages/Main/src/Main.js`),
`@itowns/geographic`, `@itowns/debug`, `@itowns/widgets`, and `plugins`
(`docs/plugins.js`, which re-exports the example plugins). Each entry file
names its module with a `@module` tag. Only what is exported from these entry
points is documented. Internal types (e.g. JSDoc `@typedef`s such as
`ParsingOptions`) are not exported, so don't reference them with `{@link}`
(use backticks): an unresolved link is a warning, and warnings fail the build.
In `.js` files, make sure such types are resolvable by TypeScript, e.g. with a
JSDoc `@import` (`/** @import { ParsingOptions } from 'Source/Source' */`).

Every documented class must carry an `@category` tag (e.g. `@category Layer`,
`@category View`...), so it gets grouped under the correct navigation section
instead of falling back to "Other". The list of known sections is declared in
`typedoc.json` (`categoryOrder`); reuse an existing one when it fits, or add a
new one there if it doesn't. This rule is enforced by `npm run doclint` (see
`docs/scripts/check-categories.mjs`), which fails the build if a class (or a
module-style object, such as `Fetcher` or `GeoJsonParser`) has no `@category`
tag.

#### How to document a class

A typical class should have the following documenting parts:

```js
/**
 * The description of the class.
 *
 * @category Layer
 */
class AClass {
    /**
     * Description of a property of the class.
     */
    prop;

    /**
     * @param {Type} param - Description of the parameter.
     */
    constructor(param) {}

    /**
     * Description and explanation of the method.
     *
     * @param {Type} param - Description of the parameter.
     *
     * @returns {Type} The returned value.
     */
    method(param) {}
}
```

Links use the `{@link Target}` syntax (or `{@link Target | text}` for a
custom text); the JSDoc `[text]{@link Target}` syntax is not supported, and a
link wrapped in backticks is rendered as plain code. Titled examples use
`@example Title` followed by a fenced code block.

If you are not sure about a tag, a reviewer will tell you what to use in your
pull request.

### Tutorials

Tutorials are plain [Markdown](https://daringfireball.net/projects/markdown/)
files living in `docs/tutorials/`, and are listed as TypeDoc project
documents in `typedoc.json` (`projectDocuments`).

Each tutorial starts with a YAML frontmatter block declaring at least a
`title` and a `group` (the navigation section it belongs to), for example:

```md
---
title: Fundamentals
group: Getting started
---

Tutorial content...
```

Tutorials have no TypeScript scope, so links to the API must be qualified
with their module, e.g. `{@link itowns!GlobeView}` or
`{@link @itowns/geographic!Coordinates}`.

When adding a tutorial, create the Markdown file in `docs/tutorials/` and
reference it in the `projectDocuments` array of `typedoc.json`.

If you want to add images to a tutorial, put them inside
`docs/tutorials/images`.

## Generating documentation

Make sure all dependencies are installed (do a `npm install` if not), and
simply run this command:

```
npm run doc
```

This runs TypeDoc and generates the API reference and tutorials into
`docs/out/`.

To only validate the documentation (missing `@category` tags, broken links,
etc.) without generating the output, run:

```
npm run doclint
```

## Consulting the documentation locally

Once generated, `docs/out/` is a static site: open `docs/out/index.html`
directly in a browser, or serve the itowns directory with any static server
and browse to `$YOUR_SERVER/$ITOWNS_PATH/docs/out/`.
