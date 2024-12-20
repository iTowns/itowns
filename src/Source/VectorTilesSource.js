import { featureFilter } from '@maplibre/maplibre-gl-style-spec';
import Style from 'Core/Style';
import TMSSource from 'Source/TMSSource';
import URLBuilder from 'Provider/URLBuilder';
import Fetcher from 'Provider/Fetcher';
import urlParser from 'Parser/MapBoxUrlParser';

function toTMSUrl(url) {
    return url.replace(/\{/g, '${');
}

function mergeCollections(collections) {
    const collection = collections[0];
    collections.forEach((col, index) => {
        if (index === 0) { return; }
        col.features.forEach((feature) => {
            collection.features.push(feature);
        });
    });
    return collection;
}

/**
 * VectorTilesSource are object containing informations on how to fetch vector
 * tiles resources.
 *
 * @property {function} filter - function to filter vector tiles layers, the
 * parameter function is a layer.
 * @property {boolean} [symbolToCircle=false] - If true, all symbols from a tile
 * will be considered as circle, and render as circles.
 */
class VectorTilesSource extends TMSSource {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * VectorTilesSource and {@link Source}.
     * @param {string|Object} source.style - The URL of the JSON style, of the
     * JSON style directly.
     * @param {string} [source.sprite] - The base URL to load informations about
     * the sprite of the style. If this is set, it overrides the `sprite` value
     * of the `source.style`. A style's sprite property supplies a URL template
     * for loading small images.
     * ```js
     * {
     *      sprite: 'http//:xxxxx/maps/sprites/'
     * }
     * ```
     * A valid sprite source must supply two types of files:
     * * An index file, which is a JSON document containing a description of each image contained in the sprite.
     * * Image files, which are PNG images containing the sprite data.
     *
     * For more specification : [the Mapbox sprite Specification](https://docs.mapbox.com/mapbox-gl-js/style-spec/sprite/)
     *
     * @param {string} [source.url] - The base URL to load the tiles. If no url
     * is specified, it reads it from the loaded style. Read [the Mapbox Style
     * Specification](https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/)
     * for more informations.
     * @param {string} [source.accessToken] - Mapbox access token
     */
    constructor(source) {
        source.format = 'application/x-protobuf;type=mapbox-vector';
        source.crs = 'EPSG:3857';
        source.isInverted = true;
        source.url = source.url || '.';
        super(source);
        const ffilter = source.filter || (() => true);
        this.urls = [];
        this.layers = {};
        this.styles = {};
        let promise;
        this.isVectorTileSource = true;

        this.accessToken = source.accessToken;

        let styleUrl;
        if (source.style) {
            if (typeof source.style == 'string') {
                styleUrl = urlParser.normalizeStyleURL(source.style, this.accessToken);
                promise = Fetcher.json(styleUrl, this.networkOptions);
            } else {
                promise = Promise.resolve(source.style);
            }
        } else {
            throw new Error('New VectorTilesSource: style is required');
        }

        this.whenReady = promise.then((style) => {
            this.jsonStyle = style;
            let baseurl = source.sprite || style.sprite;
            if (baseurl) {
                baseurl = new URL(baseurl, styleUrl).toString();
                const spriteUrl = urlParser.normalizeSpriteURL(baseurl, '', '.json', this.accessToken);
                return Fetcher.json(spriteUrl, this.networkOptions).then((sprites) => {
                    this.sprites = sprites;
                    const imgUrl = urlParser.normalizeSpriteURL(baseurl, '', '.png', this.accessToken);
                    this.sprites.source = imgUrl;
                    return style;
                });
            }

            return style;
        }).then((style) => {
            style.layers.forEach((layer, order) => {
                layer.sourceUid = this.uid;
                if (layer.type === 'background') {
                    this.backgroundLayer = layer;
                } else if (ffilter(layer)) {
                    const style = Style.setFromVectorTileLayer(layer, this.sprites, order, this.symbolToCircle);
                    this.styles[layer.id] = style;

                    if (!this.layers[layer['source-layer']]) {
                        this.layers[layer['source-layer']] = [];
                    }
                    this.layers[layer['source-layer']].push({
                        id: layer.id,
                        order,
                        filterExpression: featureFilter(layer.filter),
                        zoom: {
                            min: layer.minzoom || 0,
                            max: layer.maxzoom || 24,
                        },
                    });
                }
            });

            if (this.url == '.') {
                const TMSUrlList = Object.values(style.sources).map((sourceVT) => {
                    if (sourceVT.url) {
                        sourceVT.url = new URL(sourceVT.url, styleUrl).toString();
                        const urlSource = urlParser.normalizeSourceURL(sourceVT.url, this.accessToken);
                        return Fetcher.json(urlSource, this.networkOptions).then((tileJSON) => {
                            if (tileJSON.tiles[0]) {
                                tileJSON.tiles[0] = decodeURIComponent(new URL(tileJSON.tiles[0], urlSource).toString());
                                return toTMSUrl(tileJSON.tiles[0]);
                            }
                        });
                    } else if (sourceVT.tiles) {
                        return Promise.resolve(toTMSUrl(sourceVT.tiles[0]));
                    }
                    return Promise.reject();
                });
                return Promise.all(TMSUrlList);
            }
            return (Promise.resolve([toTMSUrl(this.url)]));
        }).then((TMSUrlList) => {
            this.urls = Array.from(new Set(TMSUrlList));
        });
    }

    urlFromExtent(tile, url) {
        return URLBuilder.xyz(tile, { tileMatrixCallback: this.tileMatrixCallback, url });
    }

    onLayerAdded(options) {
        super.onLayerAdded(options);
        if (options.out.style) {
            if (options.out.isFeatureGeometryLayer && options.out.accurate) {
                console.warn('With VectorTilesSource and FeatureGeometryLayer, the accurate option is always false');
                options.out.accurate = false;
            }
        }
    }

    loadData(extent, out) {
        const cache = this._featuresCaches[out.crs];
        const key = this.requestToKey(extent);
        // try to get parsed data from cache
        let features = cache.getByArray(key);
        if (!features) {
            // otherwise fetch/parse the data
            features = cache.setByArray(
                Promise.all(this.urls.map(url =>
                    this.fetcher(this.urlFromExtent(extent, url), this.networkOptions)
                        .then(file => this.parser(file, { out, in: this, extent }))))
                    .then(collections => mergeCollections(collections))
                    .catch(err => this.handlingError(err)),
                key);

            if (this.onParsedFile) {
                features.then((feat) => {
                    this.onParsedFile(feat);
                    console.warn('Source.onParsedFile was deprecated');
                    return feat;
                });
            }
        }
        return features;
    }
}

export default VectorTilesSource;
