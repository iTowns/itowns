/**
 * Generates a shareable URL for the current example.
 * Handles both iTowns gallery (iframe) and standalone contexts.
 * @param {string} url - The data source URL to be shared.
 * @param {string} searchParam - The search param to set in the new URL (e.g. 'copc' or 'ept').
 * @returns {string} The full shareable URL. (e.g. https://itowns-project/itowns/examples/copc_3d_loader.html?copc=https://data.copc.laz)
 */
export function getShareableURL(url, searchParam) {
    let targetUrl;

    if (window.location.href === 'about:srcdoc') {
        const topUrl = new URL(window.top.location.href);
        const exampleName = topUrl.hash.substring(1); // remove the # hashtag to keep the example's slug only

        let basePath = topUrl.href.split('#')[0];
        basePath = basePath.replace(/index\.html$/, '');
        if (!basePath.endsWith('/')) {
            basePath += '/';
        }

        targetUrl = new URL(`${exampleName}.html`, basePath);
    } else {
        targetUrl = new URL(window.location.href);
        targetUrl.search = '';
    }
    targetUrl.searchParams.set(searchParam, url);
    return targetUrl.href;
}
