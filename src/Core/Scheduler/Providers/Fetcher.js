import { TextureLoader } from 'three';

const textureLoader = new TextureLoader();

function checkResponse(response) {
    if (!response.ok) {
        var error = new Error(`Error loading ${response.url}: status ${response.status}`);
        error.status = response.status;
        throw error;
    }
}

export default {

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
     * @typedef {Object} TexturePromise
     * @property {Promise} promise - a promise that resolves when the texture is loaded
     * @property {Object} texture - the loading texture
     */
    /**
     * Wrapper around TextureLoader
     *
     * @param {string} url
     * @param {Object} options - options to pass to TextureLoader. Note that
     * THREE.js docs mention withCredentials, but it is not actually used in TextureLoader.js.
     * @param {string} options.crossOrigin - passed directly to html elements supporting it
     *
     * @return {TexturePromise}
     */
    texture(url, options = {}) {
        let res;
        let rej;

        textureLoader.crossOrigin = options.crossOrigin;

        const promise = new Promise((resolve, reject) => {
            res = resolve;
            rej = reject;
        });

        const texture = textureLoader.load(url, res, () => {}, rej);
        return { texture, promise };
    },

    /**
     * Wrapper over fetch to get some ArrayBuffer
     *
     * @param {string} url
     * @param {Object} options - fetch options (passed directly to fetch)
     *
     * @return {Promise}
     */
    arrayBuffer(url, options = {}) {
        return fetch(url, options).then((response) => {
            checkResponse(response);
            return response.arrayBuffer();
        });
    },

    img(url, options = {}) {
        return new Promise((resolve, reject) => {
            var image = new Image();

            image.onload = () => resolve(image);

            image.onerror = () => reject(new Error(`Error loading ${url}`));

            image.crossOrigin = options.crossOrigin;
            image.src = url;
        });
    },
};
