# Documentation

The documentation of itowns is available on the itowns website:
http://www.itowns-project.org/itowns/docs/

## Writing documentation

The documentation is composed of two parts: the API reference, and
tutorials.

### API reference

The API reference is written in the source of itowns, using
[JSDoc](http://usejsdoc.org/), along with support for the
[Markdown](https://commonmark.org/help/) syntax. This is a
classic documentation, explaining all exposed methods and classes in itowns, and
some internal others.

When documenting something, don't forget to check the presence of your file
inside `docs/config.json`.

If the file you are editing is not present, add it to the `navigation` list, in
the correct package.

#### How to document a class

A typical class should have the following documenting parts:

```js
/**
 * @classdesc
 * The description of the class.
 *
 * @property {type} prop - Description of a property of the class.
 * @property {type} prop2 - Description of another property of the class.
 */
class AClass {
    /**
     * @param - Description of the parameter.
     *
     * @constructor
     */
    constructor() {}

    /**
     * Description and explanation of the method.
     *
     * @param {type} param - Description of the parameter.
     *
     * @return {type} The returned value.
     */
    method() {}
}
```

If you are not sure about a tag, a reviewer will tell you what to use in your
pull request.

### Tutorials

Tutorials don't use JSDoc, but rather
[Markdown](https://daringfireball.net/projects/markdown/). Note that some JSDoc
tags are still working inside Markdown in our case.

When adding a tutorial, also add it in `docs/tutorials/list.json`, and following
the already present tutorials, add a name to it.

If you want to add images to the tutorial, add them inside
`docs/tutorials/images`, and name under `$TUTORIAL_NAME_xxx`, `$TUTORIAL_NAME`
being the name of the markdown file containing the tutorial, and `xxx` the
number of the picture.

## Generating documentation

Make sure all dependencies are installed (do a `npm install` if not), and simply
run this command:

```
npm run doc
```

The generation process should take less than 5 seconds, and result in the
creation of a `out/` folder in `docs/`.

## Consulting the documentation locally

The documentation can't be viewed without a server, as it uses `XHR` requests to
make the link between the navigation and the content.

If you have `npm start`
running, you can browse the documentation at `http://localhost:8080/docs/out/`.

Otherwise, if you have another server running that can serve the itowns
directory, you can go in `$YOUR_SERVER/$ITOWNS_PATH/docs/out` and it should be
here, with `$YOUR_SERVER` and `$ITOWNS_PATH` to replace by a working value given
your configuration.

## Modifying the template

If you wish to modify the current template, there are multiple things to change:

- `docs/static/styles/` contains the CSS styles of the template
- `docs/tmpl/` contains the templates of each part
- `publish.js` and `templateHelper.js` define the generation process of the
  documentation from the template

The architecture of the template follows roughly [the one from
JSDoc](https://github.com/jsdoc3/jsdoc/tree/master/templates/default).
