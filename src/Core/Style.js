import { FEATURE_TYPES } from 'Core/Feature';

const inv255 = 1 / 255;

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

/**
 * Style defines {@link Feature} style.
 */
class Style {
    /**
     * @constructor
     * @param {object} [params]
     * @param {object} [params.fill] fill style.
     * @param {string} [params.fill.color] fill color string css.
     * @param {number} [params.fill.opacity] fill opacity.
     * @param {object} [params.stroke] stroke style.
     * @param {string} [params.stroke.color] stroke color string css.
     * @param {number} [params.stroke.opacity] stroke opacity.
     * @param {number} [params.stroke.width] stroke line width.
     * @param {object} [params.point] point style.
     * @param {string} [params.point.color] point color string css.
     * @param {string} [params.point.line] point line color string css.
     * @param {number} [params.point.width] point line width.
     * @param {number} [params.point.opacity] point opacity.
     * @param {number} [params.point.radius] point line radius
     */
    constructor(params = {}) {
        this.isStyle = true;
        params.fill = params.fill || {};
        params.stroke = params.stroke || {};
        params.point = params.point || {};

        this.fill = {
            color: params.fill.color,
            opacity: params.fill.opacity,
        };
        this.stroke = {
            color: params.stroke.color,
            opacity: params.stroke.opacity,
            width: params.stroke.width,
        };
        this.point = {
            color: params.point.color,
            line: params.point.line,
            opacity: params.point.opacity,
            radius: params.point.radius,
            width: params.point.width,
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
     * @returns {Style}
     */
    setFromVectorTileLayer(layer) {
        if (layer.type === 'fill' && !this.fill.color) {
            const { color, opacity } = rgba2rgb(layer.paint['fill-color']);
            this.fill.color = color;
            this.fill.opacity = layer.paint['fill-opacity'] || opacity || 1.0;
        }
        if (layer.type === 'line' && !this.stroke.color) {
            const { color, opacity } = rgba2rgb(layer.paint['line-color']);
            this.stroke.color = color;
            if ('line-width' in layer.paint) {
                this.stroke.width = layer.paint['line-width'].base || 3.0;
            }
            this.stroke.opacity = layer.paint['line-opacity'] || opacity || 1.0;
        }
        if (layer.type === 'symbol') {
            const { color, opacity } = rgba2rgb(layer.paint['text-color']);
            this.point.color = color;
            this.point.opacity = opacity;
            this.point.radius = 1.5;
        }
        return this;
    }
}

export default Style;
