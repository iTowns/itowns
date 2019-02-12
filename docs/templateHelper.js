/**
 * Adaptation of jsdoc/util/templateHelper to suit our needs
 */

const helper = require('jsdoc/util/templateHelper');
const catharsis = require('catharsis');
const env = require('jsdoc/env');
const inline = require('jsdoc/tag/inline');
const logger = require('jsdoc/util/logger');
const name = require('jsdoc/name');
const util = require('util');

// Not modified methods
exports.longnamesToTree = helper.longnamesToTree;
exports._replaceDictionary = helper._replaceDictionary;
exports.prune = helper.prune;
exports.addEventListeners = helper.addEventListeners;
exports.setTutorials = helper.setTutorials;
exports.globalName = helper.globalName;
exports.fileExtension = helper.fileExtension;
exports.scopeToPunc = helper.scopeToPunc;
exports.getUniqueFilename = helper.getUniqueFilename;
exports.getUniqueId = helper.getUniqueId;
exports.longnameToUrl = helper.longnameToUrl;
exports.longnameToId = helper.longnameToId;
exports.registerLink = helper.registerLink;
exports.registerId = helper.registerId;
exports.htmlsafe = helper.htmlsafe;
exports.linkto = helper.linkto;
exports.createLink = helper.createLink;
exports.getAncestorLinks = helper.getAncestorLinks;
exports.getAncestors = helper.getAncestors;
exports.getSignatureReturns = helper.getSignatureReturns;
exports.getSignatureParams = helper.getSignatureParams;
exports.getSignatureTypes = helper.getSignatureTypes;
exports.getAttribs = helper.getAttribs;
exports.getMembers = helper.getMembers;
exports.resolveAuthorLinks = helper.resolveAuthorLinks;
exports.toTutorial = helper.toTutorial;
exports.tutorialToUrl = helper.tutorialToUrl;
exports.find = helper.find;

const longnameToUrl = helper.longnameToUrl;
const toTutorial = helper.toTutorial;

var hasOwnProp = Object.prototype.hasOwnProperty;

function parseType(longname) {
    var err;

    longname = longname.replace('&lt;', '<');

    try {
        return catharsis.parse(longname, { jsdoc: true });
    } catch (e) {
        err = new Error(`unable to parse ${longname}: ${e.message}`);
        logger.error(err);

        return longname;
    }
}

function stringifyType(parsedType, cssClass, stringifyLinkMap) {
    return catharsis.stringify(parsedType, {
        cssClass,
        htmlSafe: true,
        links: stringifyLinkMap,
    });
}

function hasUrlPrefix(text) {
    return (/^(http|ftp)s?:\/\//).test(text);
}

function isComplexTypeExpression(expr) {
    // record types, type unions, and type applications all count as "complex"
    return /^{.+}$/.test(expr) || /^.+\|.+$/.test(expr) || /^.+<.+>$/.test(expr);
}

function fragmentHash(fragmentId) {
    if (!fragmentId) {
        return '';
    }

    return `#${fragmentId}`;
}

function getShortName(longname) {
    return name.shorten(longname).name;
}

/**
 * Build an HTML link to the symbol with the specified longname. If the longname is not
 * associated with a URL, this method simply returns the link text, if provided, or the longname.
 *
 * The `longname` parameter can also contain a URL rather than a symbol's longname.
 *
 * This method supports type applications that can contain one or more types, such as
 * `Array.<MyClass>` or `Array.<(MyClass|YourClass)>`. In these examples, the method attempts to
 * replace `Array`, `MyClass`, and `YourClass` with links to the appropriate types. The link text
 * is ignored for type applications.
 *
 * @param {string} longname - The longname (or URL) that is the target of the link.
 * @param {string=} linkText - The text to display for the link, or `longname` if no text is
 * provided.
 * @param {Object} options - Options for building the link.
 * @param {string=} options.cssClass - The CSS class (or classes) to include in the link's `<a>`
 * tag.
 * @param {string=} options.fragmentId - The fragment identifier (for example, `name` in
 * `foo.html#name`) to append to the link target.
 * @param {string=} options.linkMap - The link map in which to look up the longname.
 * @param {boolean=} options.monospace - Indicates whether to display the link text in a monospace
 * font.
 * @param {boolean=} options.shortenName - Indicates whether to extract the short name from the
 * longname and display the short name in the link text. Ignored if `linkText` is specified.
 * @return {string} The HTML link, or the link text if the link is not available.
 */
function buildLink(longname, linkText, options) {
    var classString = options.cssClass ? util.format(' class="%s"', options.cssClass) : '';
    var fileUrl;
    var fragmentString = fragmentHash(options.fragmentId);
    var stripped;
    var text;

    var parsedType;

    // handle cases like:
    // @see <http://example.org>
    // @see http://example.org
    stripped = longname ? longname.replace(/^<|>$/g, '') : '';
    if (hasUrlPrefix(stripped)) {
        fileUrl = stripped;
        text = linkText || stripped;
    // handle complex type expressions that may require multiple links
    // (but skip anything that looks like an inline tag or HTML tag)
    } else if (longname && isComplexTypeExpression(longname) && /\{@.+\}/.test(longname) === false &&
        /^<[\s\S]+>/.test(longname) === false) {
        parsedType = parseType(longname);

        return stringifyType(parsedType, options.cssClass, options.linkMap);
    } else {
        fileUrl = hasOwnProp.call(options.linkMap, longname) ? options.linkMap[longname] : '';
        text = linkText || (options.shortenName ? getShortName(longname) : longname);
    }

    text = options.monospace ? `<code>${text}</code>` : text;

    if (!fileUrl) {
        return text;
    }

    if (!fileUrl.startsWith('http')) {
        fileUrl = `window.parent.goTo('${fileUrl}','${fileUrl.replace('.html', '')}')`;
        return util.format('<a onclick="%s" title="%s">%s</a>', encodeURI(fileUrl),
            text, text);
    }

    return util.format('<a href="%s"%s>%s</a>', encodeURI(fileUrl + fragmentString),
        classString, text);
}

function useMonospace(tag, text) {
    var cleverLinks;
    var monospaceLinks;
    var result;

    if (hasUrlPrefix(text)) {
        result = false;
    } else if (tag === 'linkplain') {
        result = false;
    } else if (tag === 'linkcode') {
        result = true;
    } else {
        cleverLinks = env.conf.templates.cleverLinks;
        monospaceLinks = env.conf.templates.monospaceLinks;

        if (monospaceLinks || cleverLinks) {
            result = true;
        }
    }

    return result || false;
}

function splitLinkText(text) {
    var linkText;
    var target;
    var splitIndex;

    // if a pipe is not present, we split on the first space
    splitIndex = text.indexOf('|');
    if (splitIndex === -1) {
        splitIndex = text.search(/\s/);
    } else if (text.indexOf('&lt;')) {
        splitIndex = -1;
    }

    if (splitIndex !== -1) {
        linkText = text.substr(splitIndex + 1);
        // Normalize subsequent newlines to a single space.
        linkText = linkText.replace(/\n+/, ' ');
        target = text.substr(0, splitIndex);
    }

    return {
        linkText,
        target: target || text,
    };
}

function shouldShortenLongname() {
    if (env.conf && env.conf.templates && env.conf.templates.useShortNamesInLinks) {
        return true;
    }

    return false;
}

/**
 * Find `{@link ...}` and `{@tutorial ...}` inline tags and turn them into HTML links.
 *
 * @param {string} str - The string to search for `{@link ...}` and `{@tutorial ...}` tags.
 * @return {string} The linkified text.
 */
exports.resolveLinks = function resolveLinks(str) {
    var replacers;

    function extractLeadingText(string, completeTag) {
        var tagIndex = string.indexOf(completeTag);
        var leadingText = null;
        var leadingTextRegExp = /\[(.+?)\]/g;
        var leadingTextInfo = leadingTextRegExp.exec(string);

        // did we find leading text, and if so, does it immediately precede the tag?
        while (leadingTextInfo && leadingTextInfo.length) {
            if (leadingTextInfo.index + leadingTextInfo[0].length === tagIndex) {
                string = string.replace(leadingTextInfo[0], '');
                leadingText = leadingTextInfo[1];
                break;
            }

            leadingTextInfo = leadingTextRegExp.exec(string);
        }

        return {
            leadingText,
            string,
        };
    }

    function processLink(string, tagInfo) {
        var leading = extractLeadingText(string, tagInfo.completeTag);
        var linkText = leading.leadingText;
        var monospace;
        var split;
        var target;

        string = leading.string;

        split = splitLinkText(tagInfo.text);
        target = split.target;
        linkText = linkText || split.linkText;

        monospace = useMonospace(tagInfo.tag, tagInfo.text);

        return string.replace(tagInfo.completeTag, buildLink(target, linkText, {
            linkMap: longnameToUrl,
            monospace,
            shortenName: shouldShortenLongname(),
        }));
    }

    function processTutorial(string, tagInfo) {
        var leading = extractLeadingText(string, tagInfo.completeTag);

        string = leading.string;

        return string.replace(tagInfo.completeTag, toTutorial(tagInfo.text, leading.leadingText));
    }

    replacers = {
        link: processLink,
        linkcode: processLink,
        linkplain: processLink,
        tutorial: processTutorial,
    };

    return inline.replaceInlineTags(str, replacers).newString;
};

