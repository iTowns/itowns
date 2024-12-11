const urlRe = /^(\w+):\/\/([^/?]*)(\/[^?]+)?\??(.+)?/;

const config = {
    API_URL: 'https://api.mapbox.com',
    REQUIRE_ACCESS_TOKEN: true,
    ACCESS_TOKEN: null,
};

function formatUrl(obj) {
    const params = obj.params.length ? `?${obj.params.join('&')}` : '';
    return `${obj.protocol}://${obj.authority}${obj.path}${params}`;
}

function makeAPIURL(urlObject, accessToken) {
    const apiUrlObject = parseUrl(config.API_URL);
    urlObject.protocol = apiUrlObject.protocol;
    urlObject.authority = apiUrlObject.authority;

    if (urlObject.protocol === 'http') {
        const i = urlObject.params.indexOf('secure');
        if (i >= 0) {
            urlObject.params.splice(i, 1);
        }
    }

    if (apiUrlObject.path !== '/') {
        urlObject.path = `${apiUrlObject.path}${urlObject.path}`;
    }

    if (!config.REQUIRE_ACCESS_TOKEN) { return formatUrl(urlObject); }

    accessToken = accessToken || config.ACCESS_TOKEN;
    if (!accessToken) { throw new Error('An API access token is required'); }
    if (accessToken[0] === 's') { throw new Error('Use a public access token (pk.*), not a secret access token (sk.*).'); }

    urlObject.params = urlObject.params.filter(d => d.indexOf('access_token') === -1);
    urlObject.params.push(`access_token=${accessToken}`);
    return formatUrl(urlObject);
}

function isMapboxURL(url) {
    return url.indexOf('mapbox:') === 0;
}

function parseUrl(url) {
    const parts = url.match(urlRe);
    if (!parts) {
        throw new Error('Unable to parse URL object');
    }
    return {
        protocol: parts[1],
        authority: parts[2],
        path: parts[3] || '/',
        params: parts[4] ? parts[4].split('&') : [],
    };
}

function normalizeSpriteURL(url, format, extension, accessToken) {
    const urlObject = parseUrl(url);
    if (!isMapboxURL(url)) {
        urlObject.path += `${format}${extension}`;
        return formatUrl(urlObject);
    }
    urlObject.path = `/styles/v1${urlObject.path}/sprite${format}${extension}`;
    return makeAPIURL(urlObject, accessToken);
}

function normalizeSourceURL(url, accessToken) {
    if (!isMapboxURL(url)) { return url; }
    const urlObject = parseUrl(url);
    urlObject.path = `/v4/${urlObject.authority}.json`;
    urlObject.params.push('secure');
    return makeAPIURL(urlObject, accessToken);
}

function normalizeStyleURL(url, accessToken) {
    if (!isMapboxURL(url)) { return url; }
    const urlObject = parseUrl(url);
    urlObject.path = `/styles/v1${urlObject.path}`;
    return makeAPIURL(urlObject, accessToken);
}

export default {
    normalizeStyleURL,
    normalizeSourceURL,
    normalizeSpriteURL,
};
