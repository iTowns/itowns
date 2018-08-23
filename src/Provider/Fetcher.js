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

export default {

    /**
     * Wrapper over fetch to get some text
     *
     * @param {string} url
     * @param {Object} options - fetch options (passed directly to fetch)
     *
     * @return {Promise}
     */
    text(url, options = {}) {
        return fetch(url, options).then((response) => {
            checkResponse(response);
            return response.text();
        });
    },

    /**
     * Little wrapper over fetch to get some json
     *
     * @param {string} url
     * @param {Object} options - fetch options (passed directly to fetch)
     *
     * @return {Promise}
     */
    json(url, options = {}) {
        return fetch(url, options).then((response) => {
            checkResponse(response);
            return response.json();
        });
    },

    /**
     * Wrapper over fetch to get some xml.
     *
     * @param {string} url
     * @param {Object} options - fetch options (passed directly to fetch)
     *
     * @return {Promise}
     */
    xml(url, options = {}) {
        return fetch(url, options).then((response) => {
            checkResponse(response);
            return response.text();
        }).then(text => new window.DOMParser().parseFromString(text, 'text/xml'));
    },

    /**
     * Wrapper around TextureLoader.
     *
     * @param {string} url
     * @param {Object} options - options to pass to TextureLoader. Note that
     * THREE.js docs mention withCredentials, but it is not actually used in TextureLoader.js.
     * @param {string} options.crossOrigin - passed directly to html elements supporting it
     *
     * @return {Promise}
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
     * Wrapper over fetch to get some ArrayBuffer
     *
     * @param {string} url
     * @param {Object} options - fetch options (passed directly to fetch)
     *
     * @return {Promise}
     */
    arrayBuffer,
    textureFloat(url, options = {}) {
        return arrayBuffer(url, options).then((buffer) => {
            const floatArray = new Float32Array(buffer);
            const texture = getTextureFloat(floatArray);
            return texture;
        });
    },
};
