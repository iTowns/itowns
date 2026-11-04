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

Every documented class must carry an `@category` tag (e.g. `@category Layer`,
`@category View`...), so it gets grouped under the correct navigation section
instead of falling back to "Other". The list of known sections is declared in
`typedoc.json` (`categoryOrder`); reuse an existing one when it fits, or add a
new one there if it doesn't. This rule is enforced by `npm run doclint` (see
`docs/scripts/check-categories.mjs`), which fails the build if a class (or a
legacy module-style default export) has no `@category` tag.

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
