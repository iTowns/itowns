import { featureFilter } from '@mapbox/mapbox-gl-style-spec';
import Style from 'Core/Style';
import TMSSource from 'Source/TMSSource';
import Fetcher from 'Provider/Fetcher';
import urlParser from 'Parser/MapBoxUrlParser';

function toTMSUrl(url) {
    return url.replace(/\{/g, '${');
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

        this.accessToken = source.accessToken;

        if (source.style) {
            if (typeof source.style == 'string') {
                const styleUrl = urlParser.normalizeStyleURL(source.style, this.accessToken);
                promise = Fetcher.json(styleUrl, this.networkOptions);
            } else {
                promise = Promise.resolve(source.style);
            }
        } else {
            throw new Error('New VectorTilesSource: style is required');
        }

        this.whenReady = promise.then((style) => {
            this.jsonStyle = style;
            const baseurl = source.sprite || style.sprite;
            if (baseurl) {
                const spriteUrl = urlParser.normalizeSpriteURL(baseurl, '', '.json', this.accessToken);
                return Fetcher.json(spriteUrl, this.networkOptions).then((sprites) => {
                    this.sprites = sprites;
                    const imgUrl = urlParser.normalizeSpriteURL(baseurl, '', '.png', this.accessToken);
                    return Fetcher.texture(imgUrl, this.networkOptions).then((texture) => {
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
                    const style = new Style().setFromVectorTileLayer(layer, this.sprites, order, this.symbolToCircle);
                    style.zoom.min = layer.minzoom || 0;
                    style.zoom.max = layer.maxzoom || 24;
                    this.styles[layer.id] = style;

                    if (!this.layers[layer['source-layer']]) {
                        this.layers[layer['source-layer']] = [];
                    }
                    this.layers[layer['source-layer']].push({
                        id: layer.id,
                        order,
                        filterExpression: featureFilter(layer.filter),
                        zoom: style.zoom,
                    });
                }
            });

            if (this.url == '.') {
                if (os.url) {
                    const urlSource = urlParser.normalizeSourceURL(os.url, this.accessToken);
                    return Fetcher.json(urlSource, this.networkOptions).then((tileJSON) => {
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

    onLayerAdded(options) {
        super.onLayerAdded(options);
        const keys = Object.keys(this.styles);

        keys.forEach((k) => { this.styles[k].parent = options.out.style; });
    }
}

export default VectorTilesSource;
