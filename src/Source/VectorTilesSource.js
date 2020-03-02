import TMSSource from 'Source/TMSSource';
import Fetcher from 'Provider/Fetcher';

function toTMSUrl(url) {
    return url.replace(/\{/g, '${');
}

/**
 * @classdesc
 * VectorTilesSource are object containing informations on how to fetch vector tiles resources.
 *
 * @property {string} style - the url to json style.
 * @property {string} sprite - the base url to sprites folder.
 * @property {function} filter - function to filter vector tiles layers, the parameter function is a layer.
 *
 */
class VectorTilesSource extends TMSSource {
    /**
     * @param {Object} source - An object that can contain all properties of a
     * VectorTilesSource and {@link Source}.
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
        this.filter = [];
        const promises = [];

        if (source.style) {
            promises.push(Fetcher.json(source.style).then((style) => {
                const s = Object.keys(style.sources)[0];
                const os = style.sources[s];

                style.layers.forEach((layer) => {
                    layer.sourceUid = this.uid;
                    if (layer.type === 'background') {
                        this.backgroundLayer = layer;
                    } else if (ffilter(layer)) {
                        this.filter.push(layer);
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
            }));
        } else {
            throw new Error('New VectorTilesSource: style is required');
        }
        if (source.sprite) {
            promises.push(Fetcher.json(`${source.sprite}.json`).then((sprites) => {
                this.sprites = sprites;
                return Fetcher.texture(`${source.sprite}.png`, { crossOrigin: 'anonymous' }).then((texture) => {
                    this.sprites.img = texture.image;
                });
            }));
        }

        this.whenReady = Promise.all(promises);
    }
}

export default VectorTilesSource;
