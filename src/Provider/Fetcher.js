import { TextureLoader, DataTexture, AlphaFormat, FloatType } from 'three';

const textureLoader = new TextureLoader();
const SIZE_TEXTURE_TILE = 256;
function checkResponse(response) {
    if (!response.ok) {
        var error = new Error(`Error loading ${response.url}: status ${response.status}`);
        error.response = response;
        throw error;
    }
}

const arrayBuffer = (url, options = {}) => fetch(url, options).then((response) => {
    checkResponse(response);
    return response.arrayBuffer();
});

const getTextureFloat = function getTextureFloat(buffer) {
    return new DataTexture(buffer, SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE, AlphaFormat, FloatType);
};

/**
 * Utilitary to fetch resources from a server using the [fetch API]{@link
 * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch}.
 *
 * @module Fetcher
 */
export default {
    /**
     * Wrapper over fetch to get some text.
     *
     * @param {string} url - The URL of the resources to fetch.
     * @param {Object} options - Fetch options (passed directly to `fetch()`),
     * see [the syntax for more information]{@link
     * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax}.
     *
     * @return {Promise<string>} Promise containing the text.
     */
    text(url, options = {}) {
        return fetch(url, options).then((response) => {
            checkResponse(response);
            return response.text();
        });
    },

    /**
     * Little wrapper over fetch to get some JSON.
     *
     * @param {string} url - The URL of the resources to fetch.
     * @param {Object} options - Fetch options (passed directly to `fetch()`),
     * see [the syntax for more information]{@link
     * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax}.
     *
     * @return {Promise<Object>} Promise containing the JSON object.
     */
    json(url, options = {}) {
        return fetch(url, options).then((response) => {
            checkResponse(response);
            return response.json();
        });
    },

    /**
     * Wrapper over fetch to get some XML.
     *
     * @param {string} url - The URL of the resources to fetch.
     * @param {Object} options - Fetch options (passed directly to `fetch()`),
     * see [the syntax for more information]{@link
     * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax}.
     *
     * @return {Promise<Document>} Promise containing the XML Document.
     */
    xml(url, options = {}) {
        return fetch(url, options).then((response) => {
            checkResponse(response);
            return response.text();
        }).then(text => new window.DOMParser().parseFromString(text, 'text/xml'));
    },

    /**
     * Wrapper around {@link THREE.TextureLoader}.
     *
     * @param {string} url - The URL of the resources to fetch.
     * @param {Object} options - Fetch options (passed directly to `fetch()`),
     * see [the syntax for more information]{@link
     * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax}.
     * Note that THREE.js docs mentions `withCredentials`, but it is not
     * actually used in {@link THREE.TextureLoader}.
     *
     * @return {Promise<THREE.Texture>} Promise containing the {@link
     * THREE.Texture}.
     */
    texture(url, options = {}) {
        let res;
        let rej;

        textureLoader.crossOrigin = options.crossOrigin;

        const promise = new Promise((resolve, reject) => {
            res = resolve;
            rej = reject;
        });

        textureLoader.load(url, res, () => {}, rej);
        return promise;
    },

    /**
     * Wrapper over fetch to get some ArrayBuffer.
     *
     * @param {string} url - The URL of the resources to fetch.
     * @param {Object} options - Fetch options (passed directly to `fetch()`),
     * see [the syntax for more information]{@link
     * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax}.
     *
     * @return {Promise<ArrayBuffer>} Promise containing the ArrayBuffer.
     */
    arrayBuffer,

    /**
     * Wrapper over fetch to get some {@link THREE.DataTexture}.
     *
     * @param {string} url - The URL of the resources to fetch.
     * @param {Object} options - Fetch options (passed directly to `fetch()`),
     * see [the syntax for more information]{@link
     * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax}.
     *
     * @return {Promise<THREE.DataTexture>} Promise containing the DataTexture.
     */
    textureFloat(url, options = {}) {
        return arrayBuffer(url, options).then((buffer) => {
            const floatArray = new Float32Array(buffer);
            const texture = getTextureFloat(floatArray);
            return texture;
        });
    },

    /**
     * Wrapper over fetch to get a bunch of files sharing the same name, but
     * different extensions.
     *
     * @param {string} baseUrl - The shared URL of the resources to fetch.
     * @param {Object} extensions - An object containing arrays. The keys of
     * each of this array are available fetch type, such as `text`, `json` or
     * even `arrayBuffer`. The arrays contains the extensions to append after
     * the `baseUrl` (see example below).
     * @param {Object} options - Fetch options (passed directly to `fetch()`),
     * see [the syntax for more information]{@link
     * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax}.
     *
     * @return {Promise[]} An array of promises, containing all the files,
     * organized by their extensions (see the example below).
     *
     * @example
     * itowns.Fetcher.multiple('http://geo.server/shapefile', {
     *     // will fetch:
     *     // - http://geo.server/shapefile.shp
     *     // - http://geo.server/shapefile.dbf
     *     // - http://geo.server/shapefile.shx
     *     // - http://geo.server/shapefile.prj
     *     arrayBuffer: ['shp', 'dbf', 'shx'],
     *     text: ['prj'],
     * }).then(function _(result) {
     *     // result looks like:
     *     result = {
     *         shp: ArrayBuffer
     *         dbf: ArrayBuffer
     *         shx: ArrayBuffer
     *         prj: string
     *     };
     * });
     */
    multiple(baseUrl, extensions, options = {}) {
        const promises = [];
        let url;

        for (const fetchType in extensions) {
            if (!this[fetchType]) {
                throw new Error(`${fetchType} is not a valid Fetcher method.`);
            } else {
                for (const extension of extensions[fetchType]) {
                    url = `${baseUrl}.${extension}`;
                    promises.push(this[fetchType](url, options).then(result => ({
                        type: extension,
                        result,
                    })));
                }
            }
        }

        return Promise.all(promises).then((result) => {
            const all = {};
            for (const res of result) {
                all[res.type] = res.result;
            }

            return Promise.resolve(all);
        });
    },
};
