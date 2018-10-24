/* global itowns, Promise */
var manager = new itowns.THREE.LoadingManager();

// namespace ThreeLoader.
var ThreeLoader = {};

// Utility method to use Promise.
function defer() {
    var deferredPromise = {};
    deferredPromise.promise = new Promise(function _(resolve, reject) {
        deferredPromise.resolve = resolve;
        deferredPromise.reject = reject;
    });
    return deferredPromise;
}

/**
 * Load a script asynchronously
 * @param {String} uri URI of the script to load.
 * @returns {Promise} A promise resolved when the script is loaded.
 */
function loadScriptAsync(uri) {
    var deferredPromise = defer();
    var tag = document.createElement('script');
    tag.async = true;
    tag.onload = function r() {
        deferredPromise.resolve();
    };
    tag.src = uri;
    document.body.append(tag);
    return deferredPromise.promise;
}

/**
 * Load script asynchronously from ThreeJs example loaders
 *
 * @param {String} format Format to be loaded. Example: Collada will return ColladaLoader
 * @returns {Promise} A promise with the ThreeJS Loader
 */
ThreeLoader.getThreeJsLoader = function getThreeJsLoader(format) {
    var deferredPromise = defer();
    // eslint-disable-next-line no-undef
    THREE = itowns.THREE;
    loadScriptAsync('https://cdn.rawgit.com/mrdoob/three.js/r' + itowns.THREE.REVISION + '/examples/js/loaders/' + format + 'Loader.js')
        .then(function createLoader() {
            deferredPromise.resolve(new itowns.THREE[format + 'Loader'](manager));
        }).catch(function error(e) {
            console.error('Error creating', format, 'loader : ', e);
        });
    return deferredPromise.promise;
};

/**
 * Load a ressource asynchronously using an already created loader
 * @param {Loader} loader Loader from ThreeJs example loaders
 * @param {String} url URL of the ressource
 * @returns {Promise} A promise resolved when the ressource is loaded.
 */
ThreeLoader.useThreeJsLoader = function useThreeJsLoader(loader, url) {
    var deferredPromise = defer();
    loader.load(url, deferredPromise.resolve, function _() {}, deferredPromise.reject);
    return deferredPromise.promise;
};

/**
 * Load a resource asynchronously using ThreeJs example loader.
 * @param {String} format Format of the resource. Example: 'Collada' to use the ColladaLoader.
 * Loaders can be one of these : https://github.com/mrdoob/three.js/tree/dev/examples/js/loaders
 * @param {String} url URL of the ressource
 * @returns {Promise} A promise resolved when the ressource is loaded.
 */
// eslint-disable-next-line no-unused-vars
ThreeLoader.load = function load(format, url) {
    return ThreeLoader.getThreeJsLoader(format).then(function _(loader) {
        return ThreeLoader.useThreeJsLoader(loader, url);
    });
};
