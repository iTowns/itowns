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
        source.crs = 'EPSG:3857';
        source.isInverted = true;
        source.url = source.url || '.';
        super(source);
        const ffilter = source.filter || (() => true);
        this.layers = {};
        this.styles = {};
        let promise;

        if (source.style) {
            if (typeof source.style == 'string') {
                promise = Fetcher.json(source.style, this.networkOptions);
            } else {
                promise = Promise.resolve(source.style);
            }
        } else {
            throw new Error('New VectorTilesSource: style is required');
        }

        this.whenReady = promise.then((style) => {
            const baseurl = source.sprite || style.sprite;
            if (baseurl) {
                return Fetcher.json(`${baseurl}.json`, this.networkOptions).then((sprites) => {
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
                    let stops = [];
                    checkStopsValues(layer.layout, stops);
                    checkStopsValues(layer.paint, stops);

                    let minStop = Math.min(...stops);
                    // if none is found, default to 0
                    minStop = (minStop == Infinity) ? 0 : minStop;
                    // compare to layer.minzoom and take the highest
                    minStop = (layer.minzoom == undefined) ? minStop : Math.max(layer.minzoom, minStop);

                    stops.push(minStop);
                    stops.push(layer.maxzoom == undefined ? 24 : layer.maxzoom);
                    stops.sort((a, b) => (a - b));

                    // remove all value < minStop
                    stops = stops.filter(s => s >= minStop);

                    this.styles[layer.id] = [];
                    for (let i = 0; i < stops.length - 1; i++) {
                        if (stops[i] == stops[i + 1]) { continue; }
                        const style = new Style();
                        style.zoom.min = stops[i];
                        style.zoom.max = stops[i + 1];
                        style.setFromVectorTileLayer(layer, this.sprites, order, this.symbolToCircle);
                        this.styles[layer.id].push(style);
                    }

                    if (!this.layers[layer['source-layer']]) {
                        this.layers[layer['source-layer']] = [];
                    }

                    this.layers[layer['source-layer']].push({
                        id: layer.id,
                        order,
                        filterExpression: featureFilter(layer.filter),
                        zoom: {
                            min: stops[0],
                            max: stops[stops.length - 1],
                        },
                    });
                }
            });

            if (this.url == '.') {
                if (os.url) {
                    return Fetcher.json(os.url, this.networkOptions).then((tileJSON) => {
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
}

export default VectorTilesSource;
