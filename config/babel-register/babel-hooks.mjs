import { fileURLToPath } from 'url';
import * as path from 'path';
import * as babel from '@babel/core';

/**
 * This script is a [node:module hook][https://nodejs.org/api/module.html] to
 * override module resolution and source-code loading to transpile files with
 * babel.
 */

// Regular expressions from
// https://github.com/babel/babel/blob/main/packages/babel-register/src/worker/transform.js
function escapeRegExp(string) {
    return string.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

const nmRE = escapeRegExp(`${path.sep}node_modules${path.sep}`);
const cwd = path.resolve('.');
const cwdRE = escapeRegExp(cwd);

/**
 * @param {string | SharedArrayBuffer | Uint8Array} source
 * @param {Object} context
 * @param {string} context.url
 * @param {string} context.format
 */
async function transpile(source, context) {
    const { url, format } = context;
    if (format !== 'module' && format !== 'commonjs') {
        return source;
    }

    let input;
    if (typeof source === 'string') {
        input = source;
    } else if (Buffer.isBuffer(source)) {
        input = source.toString('utf-8');
    } else {
        input = Buffer.from(source).toString('utf-8');
    }

    // transformAsync merges options in .babelrc with the ones provided below
    const transform = await babel.transformAsync(input, {
        sourceType: 'module',
        filename: fileURLToPath(url),
        sourceMaps: 'inline',
        ast: false,
        ignore: [
            // do not transpile files in node_modules
            new RegExp(`^${cwdRE}(?:${path.sep}.*)?${nmRE}`, 'i'),
        ],
    });

    if (!transform?.code) {
        return;
    }

    return transform.code;
}

/**
 * @param {string} specifier
 * @param {Object} context
 * @param {string[]} context.conditions - Export conditions of the relevant
 * package.json
 * @param {Object} context.importAttributes - An object whose key-value pairs
 * represent the attributes for the module to import
 * @param {string | undefined} context.parentURL - The module importing this
 * one, or undefined if this is the Node.js entry point
 * @param {Function} nextResolve - The subsequent resolve hook in the chain, or
 * the Node.js default resolve hook after the last user-supplied resolve hook
 */
export async function resolve(specifier, context, nextResolve) {
    // Try to resolve the path of an imported module.
    // If the resolver failed, retry substituting the extension with '.ts'.
    try {
        return await nextResolve(specifier, context);
    } catch (err) {
        if (err.code === 'ERR_MODULE_NOT_FOUND') {
            const url = new URL(specifier, context.parentURL);
            url.pathname = url.pathname.replace(/\.[^/.]+$/, '.ts');
            return nextResolve(url.href, context);
        }
        throw err;
    }
}

/**
 * @param {string} url - The URL returned by the resolve chain
 * @param {Object} context
 * @param {string[]} context.conditions - Export conditions of the relevant
 * package.json
 * @param {string | null | undefined} context.format - The format optionally
 * supplied by the resolve hook chain
 * @param {Object} context.importAttributes
 * @param {function(string, object): Promise<{ format: string, shortCircuit: boolean, source: string }>} nextLoad -
 * The subsequent load hook in the chain, or the Node.js default load hook after
 * the last user-supplied load hook
 */
export async function load(url, context, nextLoad) {
    // Try to load the file using the default loader (which supports both
    // ESM/CJS modules) but does not support '.ts' extensions. Use the ESM
    // module loader for typescript files.
    const { format, shortCircuit, source } = await nextLoad(url, context)
        .catch(async (error) => {
            if (error.code === 'ERR_UNKNOWN_FILE_EXTENSION') {
                return nextLoad(url, { ...context, format: 'module' });
            }

            throw error;
        });

    if (format !== 'module' && format !== 'commonjs') {
        return { format, shortCircuit, source };
    }

    if (source) {
        const code = await transpile(source, { format, url });
        if (code) {
            return { source: code, format };
        }
    }

    return { format, source };
}
