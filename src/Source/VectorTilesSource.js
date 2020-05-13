import { featureFilter } from '@mapbox/mapbox-gl-style-spec';
import Style from 'Core/Style';
import TMSSource from 'Source/TMSSource';
import Fetcher from 'Provider/Fetcher';

function toTMSUrl(url) {
    return url.replace(/\{/g, '${');
}

function checkStopsValues(obj, target) {
    for (const p in obj) {
        if (obj[p].stops) {
            obj[p].stops.forEach(s => target.push(s[0]));
        }
    }
}

/**
 * @classdesc
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
     * of the `source.style`.
     * @param {string} [source.url] - The base URL to load the tiles. If no url
     * is specified, it reads it from the loaded style. Read [the Mapbox Style
     * Specification](https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/)
     * for more informations.
     *
     * @constructor
     */
    constructor(source) {
        source.format = 'application/x-protobuf;type=mapbox-vector';
        source.projection = 'EPSG:3857';
        source.isInverted = true;
        source.url = source.url || '.';
        super(source);
        const ffilter = source.filter || (() => true);
        this.layers = {};
        this.styles = {};
        let promise;

        if (source.style) {
            if (typeof source.style == 'string') {
                promise = Fetcher.json(source.style);
            } else {
                promise = Promise.resolve(source.style);
            }
        } else {
            throw new Error('New VectorTilesSource: style is required');
        }

        this.whenReady = promise.then((style) => {
            const baseurl = source.sprite || style.sprite;
            if (baseurl) {
                return Fetcher.json(`${baseurl}.json`).then((sprites) => {
                    this.sprites = sprites;
                    return Fetcher.texture(`${baseurl}.png`, this.networkOptions).then((texture) => {
                        this.sprites.img = texture.image;
                        return style;
                    });
                });
            }

            return style;
        }).then((style) => {
            const s = Object.keys(style.sources)[0];
            const os = style.sources[s];

            style.layers.forEach((layer, order) => {
                layer.sourceUid = this.uid;
                if (layer.type === 'background') {
                    this.backgroundLayer = layer;
                } else if (ffilter(layer)) {
                    // TODO: add support for expressions
                    // https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions
                    const stops = [];
                    stops.push(layer.minzoom == undefined ? 2 : layer.minzoom);
                    checkStopsValues(layer.layout, stops);
                    checkStopsValues(layer.paint, stops);
                    stops.push(layer.maxzoom == undefined ? 24 : layer.maxzoom);
                    stops.sort((a, b) => (a - b));

                    this.styles[layer.id] = [];
                    for (let i = 0; i < stops.length - 1; i++) {
                        if (stops[i] == stops[i + 1]) { continue; }
                        const style = new Style();
                        style.minzoom = stops[i];
                        style.maxzoom = stops[i + 1];
                        style.setFromVectorTileLayer(layer, this.sprites, this.symbolToCircle);
                        this.styles[layer.id].push(style);
                    }

                    if (!this.layers[layer['source-layer']]) {
                        this.layers[layer['source-layer']] = [];
                    }

                    this.layers[layer['source-layer']].push({
                        id: layer.id,
                        order,
                        filterExpression: featureFilter(layer.filter),
                        minzoom: stops[0],
                        maxzoom: stops[stops.length - 1],
                    });
                }
            });

            if (this.url == '.') {
                if (os.url) {
                    return Fetcher.json(os.url).then((tileJSON) => {
                        if (tileJSON.tiles[0]) {
                            this.url = toTMSUrl(tileJSON.tiles[0]);
                        }
                    });
                } else if (os.tiles[0]) {
                    this.url = toTMSUrl(os.tiles[0]);
                }
            }
        });
    }

    onParsedFile(collection) {
        collection.features.forEach((feature) => {
            feature.style = this.getStyleFromIdZoom(feature.id, collection.extent.zoom);
        });
        return collection;
    }

    getStyleFromIdZoom(id, zoom) {
        return this.styles[id].find(s => s.minzoom <= zoom && s.maxzoom > zoom);
    }
}

export default VectorTilesSource;
