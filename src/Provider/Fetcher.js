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
    const texture = new DataTexture(buffer, SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE, AlphaFormat, FloatType);
    texture.needsUpdate = true;
    return texture;
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
     * @param {Object} options - Fetch options (passed directly to
     * <code>fetch()</code>), see [the syntax for more information]{@link
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
     * @param {Object} options - Fetch options (passed directly to
     * <code>fetch()</code>), see [the syntax for more information]{@link
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
     * @param {Object} options - Fetch options (passed directly to
     * <code>fetch()</code>), see [the syntax for more information]{@link
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
     * @param {Object} options - Fetch options (passed directly to
     * <code>fetch()</code>), see [the syntax for more information]{@link
     * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax}.
     * Note that THREE.js docs mentions <code>withCredentials</code>, but it is
     * not actually used in {@link THREE.TextureLoader}.
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
     * @param {Object} options - Fetch options (passed directly to
     * <code>fetch()</code>), see [the syntax for more information]{@link
     * https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax}.
     *
     * @return {Promise<ArrayBuffer>} Promise containing the ArrayBuffer.
     */
    arrayBuffer,

    /**
     * Wrapper over fetch to get some {@link THREE.DataTexture}.
     *
     * @param {string} url - The URL of the resources to fetch.
     * @param {Object} options - Fetch options (passed directly to
     * <code>fetch()</code>), see [the syntax for more information]{@link
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
};
