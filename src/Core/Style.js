import { FEATURE_TYPES } from 'Core/Feature';
import Cache from 'Core/Scheduler/Cache';

const inv255 = 1 / 255;
const canvas = document.createElement('canvas');

function rgba2rgb(orig) {
    const result = orig.match(/(?:((hsl|rgb)a? *\(([\d.%]+(?:deg|g?rad|turn)?)[ ,]*([\d.%]+)[ ,]*([\d.%]+)[ ,/]*([\d.%]*)\))|(#((?:[\d\w]{3}){1,2})([\d\w]{1,2})?))/i);
    if (!result) {
        return { color: orig, opacity: 1.0 };
    } else if (result[7]) {
        let opacity = 1.0;
        if (result[9]) {
            opacity = parseInt(result[9].length == 1 ? `${result[9]}${result[9]}` : result[9], 16) * inv255;
        }
        return { color: `#${result[8]}`, opacity };
    } else if (result[0]) {
        return { color: `${result[2]}(${result[3]},${result[4]},${result[5]})`, opacity: (Number(result[6]) || 1.0) };
    }
}


function readVectorProperty(property, zoom) {
    if (property == undefined) {
        //
    } else if (property.stops) {
        const p = property.stops.slice().reverse().find(stop => zoom >= stop[0]);
        return p ? p[1] : property.stops[0][1];
    } else {
        return property.base || property;
    }
}

function getImageFromSprite(sprites, key) {
    const sprite = sprites[key];
    canvas.width = sprite.width;
    canvas.height = sprite.height;
    canvas.getContext('2d').drawImage(sprites.img, sprite.x, sprite.y, sprite.width, sprite.height, 0, 0, sprite.width, sprite.height);
    const image = document.createElement('img');
    image.src = canvas.toDataURL('image/png');

    return image;
}

/**
 * Style defines {@link Feature} style.
 * @property {object} fill fill style.
 * @property {string} fill.color fill color string css.
 * @property {Image|Canvas} fill.pattern fill with pattern image.
 * @property {number} fill.opacity fill opacity.
 * @property {object} stroke stroke style.
 * @property {string} stroke.color stroke color string css.
 * @property {number} stroke.opacity stroke opacity.
 * @property {number} stroke.width stroke line width.
 * @property {object} point point style.
 * @property {string} point.color point color string css.
 * @property {string} point.line point line color string css.
 * @property {number} point.width point line width.
 * @property {number} point.opacity point opacity.
 * @property {number} point.radius point line radius
 */
class Style {
    /**
     * Constructs the object.
     * @param  {Object}  [params={}] An object that can contain all properties of a Style.
     * @constructor
     */
    constructor(params = {}) {
        this.isStyle = true;
        params.fill = params.fill || {};
        params.stroke = params.stroke || {};
        params.point = params.point || {};
        params.text = params.text || {};

        this.fill = {
            color: params.fill.color,
            opacity: params.fill.opacity,
            pattern: params.fill.pattern,
        };
        this.stroke = {
            color: params.stroke.color,
            opacity: params.stroke.opacity,
            width: params.stroke.width,
            dasharray: params.stroke.dasharray || [],
        };
        this.point = {
            color: params.point.color,
            line: params.point.line,
            opacity: params.point.opacity,
            radius: params.point.radius,
            width: params.point.width,
        };
        this.text = {
            field: params.text.field,
            font: params.text.font,
            color: params.text.color,
        };
    }
    /**
     * set Style from geojson properties.
     * @param {object} properties geojson properties.
     * @param {number} type
     * @returns {Style}
     */
    setFromGeojsonProperties(properties, type) {
        if (type === FEATURE_TYPES.POINT) {
            this.point.color = properties.fill || 'white';
            this.point.opacity = properties['fill-opacity'] || 1.0;
            this.point.line = properties.stroke || 'gray';
            this.point.radius = properties.radius || 2.0;
        } else {
            this.stroke.color = properties.stroke;
            this.stroke.width = properties['stroke-width'];
            this.stroke.opacity = properties['stroke-opacity'];

            if (type !== FEATURE_TYPES.LINE) {
                this.fill.color = properties.fill;
                this.fill.opacity = properties['fill-opacity'] || 1.0;
            }
        }
        return this;
    }

    /**
     * set Style from vector tile layer properties.
     * @param {object} layer vector tile layer.
     * @param {Number} zoom vector tile layer.
     * @param {Object} sprites vector tile layer.
     * @returns {Style}
     */
    setFromVectorTileLayer(layer, zoom, sprites) {
        if (layer.type === 'fill' && !this.fill.color) {
            const { color, opacity } = rgba2rgb(readVectorProperty(layer.paint['fill-color'] || layer.paint['fill-pattern']));
            this.fill.color = color;
            this.fill.opacity = readVectorProperty(layer.paint['fill-opacity'], zoom) || opacity || 1.0;
            if (layer.paint['fill-pattern'] && sprites) {
                this.fill.pattern = getImageFromSprite(sprites, layer.paint['fill-pattern']);
            }

            if (layer.paint['fill-outline-color']) {
                const { color, opacity } = rgba2rgb(readVectorProperty(layer.paint['fill-outline-color']));
                this.stroke.color = color;
                this.stroke.opacity = opacity;
                this.stroke.width = 1.0;
                this.stroke.dasharray = [];
            }
        } else if (layer.type === 'line' && !this.stroke.color) {
            const prepare = readVectorProperty(layer.paint['line-color'], zoom);
            const { color, opacity } = rgba2rgb(prepare);
            this.stroke.dasharray = readVectorProperty(layer.paint['line-dasharray'], zoom) || [];
            this.stroke.color = color;
            this.stroke.lineCap = layer.layout && layer.layout['line-cap'];
            this.stroke.width = readVectorProperty(layer.paint['line-width'], zoom) || 3.0;
            this.stroke.opacity = readVectorProperty(layer.paint['line-opacity'], zoom) || opacity || 1.0;
        } else if (layer.type === 'symbol') {
            // overlapping order
            this.text.zOrder = readVectorProperty(layer.layout && layer.layout['symbol-z-order'] || 'auto', zoom);
            if (this.text.zOrder == 'auto') {
                this.text.zOrder = readVectorProperty(layer.layout && layer.layout['symbol-sort-key'] || 'Y', zoom);
            } else if (this.text.zOrder == 'viewport-y') {
                this.text.zOrder = 'Y';
            } else if (this.text.zOrder == 'source') {
                this.text.zOrder = 0;
            }

            // position
            this.text.anchor = readVectorProperty(layer.layout && layer.layout['text-anchor'] || 'center', zoom);
            this.text.offset = readVectorProperty(layer.layout && layer.layout['text-offset'] || [0, 0], zoom);
            this.text.padding = readVectorProperty(layer.layout && layer.layout['text-padding'] || 2, zoom);
            this.text.size = readVectorProperty(layer.layout && layer.layout['text-size'] || 16, zoom);
            this.text.placement = readVectorProperty(layer.layout && layer.layout['symbol-placement'] || 'point', zoom);
            this.text.rotation = readVectorProperty(layer.layout && layer.layout['text-rotation-alignment'] || 'auto', zoom);

            // content
            this.text.field = readVectorProperty(layer.layout && layer.layout['text-field'] || '', zoom);
            this.text.wrap = readVectorProperty(layer.layout && layer.layout['text-max-width'] || 10, zoom);
            this.text.spacing = readVectorProperty(layer.layout && layer.layout['text-letter-spacing'] || 0, zoom);
            this.text.transform = readVectorProperty(layer.layout && layer.layout['text-transform'] || 'none', zoom);
            this.text.justify = readVectorProperty(layer.layout && layer.layout['text-justify'] || 'center', zoom);

            // appearance
            const { color, opacity } = rgba2rgb(readVectorProperty(layer.paint && layer.paint['text-color'] || '#000000', zoom));
            this.text.color = color;
            this.text.opacity = readVectorProperty(layer.paint && layer.paint['text-opacity'], zoom) || (opacity !== undefined && opacity) || 1.0;
            this.text.font = readVectorProperty(layer.layout && layer.layout['text-font'] || ['Open Sans Regular', 'Arial Unicode MS Regular'], zoom);
            this.text.halo = {};
            this.text.halo.color = readVectorProperty(layer.paint && layer.paint['text-halo-color'] || '#000000', zoom);
            this.text.halo.width = readVectorProperty(layer.paint && layer.paint['text-halo-width'] || 0, zoom);
            this.text.halo.blur = readVectorProperty(layer.paint && layer.paint['text-halo-blur'] || 0, zoom);

            // additional icon
            const iconSrc = readVectorProperty(layer.layout && layer.layout['icon-image'], zoom);
            if (iconSrc) {
                let size = readVectorProperty(layer.layout && layer.layout['icon-size'], zoom);
                if (size == undefined) { size = 1; }

                this.icon = Cache.get(`${iconSrc}-${size}`);

                if (!this.icon) {
                    this.icon = {};
                    this.icon.dom = getImageFromSprite(sprites, iconSrc);

                    this.icon.anchor = readVectorProperty(layer.layout && layer.layout['icon-anchor'] || 'center', zoom);
                    this.icon.halfWidth = canvas.width / 2;
                    this.icon.halfHeight = canvas.height / 2;

                    Cache.set(`${iconSrc}-${size}`, this.icon);
                }
            }
        } else if (layer.type === 'circle') {
            const { color, opacity } = rgba2rgb(readVectorProperty(layer.paint && layer.paint['circle-color']), zoom);
            this.point.color = color;
            this.point.opacity = opacity;
            this.point.radius = readVectorProperty(layer.paint['circle-radius'], zoom);
        }
        return this;
    }
}

export default Style;
