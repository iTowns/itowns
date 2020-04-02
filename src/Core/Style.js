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
 * A Style is an object that defines the visual appearance of {@link
 * FeatureCollection} and {@link Feature}. It is taken into account when drawing
 * them in textures that will be placed onto tiles.
 *
 * As there are four basic elements present in `Features`, there are also four
 * main components in a `Style` object:
 * - `fill` is for all fillings and polygons
 * - `stroke` is for all lines and polygons edges
 * - `point` is for all points
 * - `text` contains all {@link Label} related things
 *
 * @property {Object} fill - Polygons and fillings style.
 * @property {string} fill.color - Defines the main color of the filling. Can be
 * any [valid color
 * string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is no value, indicating that no filling needs to be done.
 * @property {Image|Canvas} fill.pattern - Defines a pattern to fill the surface
 * with. See [this
 * example](http://www.itowns-project.org/itowns/examples/#source_file_geojson_raster)
 * for how to use.
 * @property {number} fill.opacity - The opacity of the color or the
 * pattern. Can be between `0.0` and `1.0`. Default is `1.0`.
 *
 * @property {Object} stroke - Lines and polygon edges.
 * @property {string} stroke.color The color of the line. Can be any [valid
 * color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is no value, indicating that no stroke needs to be done.
 * @property {number} stroke.opacity - The opacity of the line. Can be between
 * `0.0` and `1.0`. Default is `1.0`.
 * @property {number} stroke.width - The width of the line. Default is `1.0`.
 *
 * @property {Object} point - Point style.
 * @property {string} point.color - The color of the point. Can be any [valid
 * color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is no value, indicating that no point will be shown.
 * @property {number} point.radius - The radius of the point, in pixel. Default
 * is `2.0`.
 * @property {string} point.line - The color of the border of the point. Can be
 * any [valid color
 * string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * @property {number} point.width - The width of the border, in pixel. Default
 * is `0.0` (no border).
 * @property {number} point.opacity - The opacity of the point. Can be between
 * `0.0` and `1.0`. Default is `1.0`.
 *
 * @property {Object} text - All things {@link Label} related.
 * @property {string} text.field - A string to help read the text field from
 * properties of a `FeatureGeometry`, with the key of the property enclosed by
 * brackets. For example, if each geometry contains a `name` property,
 * `text.field` can be set as `{name}`. Default is no value, indicating that no
 * text will be shown.
 *
 * The brackets allows the use of complex fields. For
 * example, if a static string `foo` is attached to the changing property `bar`,
 * you can specify `foo {bar}`, and `foo` will stay everytime, while `{bar}`
 * will change into the value of the property of the geometry. You can also have
 * multiple properties in one field, like if you want the latin name and the
 * local name of a location. Specifying `{name_latin} - {name_local}` can result
 * in `Marrakesh - مراكش` for example.
 * @property {string} text.color - The color of the text. Can be any [valid
 * color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is `#000000`.
 * @property {string} text.anchor - The anchor of the text compared to its
 * position (see {@link Label} for the position). Can be a few value: `top`,
 * `left`, `bottom`, `right`, `center`, `top-left`, `top-right`, `bottom-left`
 * or `bottom-right`. Default is `center`.
 * @property {Array} text.offset - The offset of the text, depending on its
 * anchor, in pixels. First value is from `left`, second is from `top`. Default
 * is `[0, 0]`.
 * @property {number} text.padding - The padding outside the text, in pixels.
 * Default is `2`.
 * @property {number} text.size - The size of the font, in pixels. Default is
 * `16`.
 * @property {number} text.wrap - The maximum width, in pixels, before the text
 * is wrapped, because the string is too long. Default is `10`.
 * @property {number} text.spacing - The spacing between the letters, in `em`.
 * Default is `0`.
 * @property {string} text.transform - A value corresponding to the [CSS
 * property
 * `text-transform`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-transform).
 * Default is `none`.
 * @property {string} text.justify - A value corresponding to the [CSS property
 * `text-align`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-align).
 * Default is `center`.
 * @property {number} text.opacity - The opacity of the text. Can be between
 * `0.0` and `1.0`. Default is `1.0`.
 * @property {Array} text.font - A list (as an array of string) of font family
 * names, prioritized in the order it is set. Default is `Open Sans Regular,
 * Arial Unicode MS Regular, sans-serif`.
 * @property {Object} text.halo - An object containing properties defining a
 * halo around the text.
 * @property {string} text.halo.color - The color of the halo. Can be any [valid
 * color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is `#000000`.
 * @property {number} text.halo.width - The width of the halo, in pixels.
 * Default is `0`.
 * @property {number} text.halo.blur - The blur value of the halo, in pixels.
 * Default is `0`.
 *
 * @example
 * const style = new itowns.Style({
 *      stroke: { color: 'red' },
 *      point: { color: 'white', line: 'red' },
 * });
 *
 * const source = new itowns.FileSource(...);
 *
 * const layer = new itowns.ColorLayer('foo', {
 *      source: source,
 *      style: style,
 * });
 *
 * view.addLayer(layer);
 */
class Style {
    /**
     * @param {Object} [params={}] An object that can contain all properties of
     * a Style.
     *
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
            opacity: params.fill.opacity == undefined ? 1.0 : params.fill.opacity,
            pattern: params.fill.pattern,
        };

        this.stroke = {
            color: params.stroke.color,
            opacity: params.stroke.opacity == undefined ? 1.0 : params.stroke.opacity,
            width: params.stroke.width == undefined ? 1.0 : params.stroke.width,
            dasharray: params.stroke.dasharray || [],
        };

        this.point = {
            color: params.point.color,
            line: params.point.line,
            opacity: params.point.opacity == undefined ? 1.0 : params.point.opacity,
            radius: params.point.radius == undefined ? 2.0 : params.point.radius,
            width: params.point.width || 0.0,
        };

        this.text = {
            field: params.text.field,
            zOrder: params.text.zOrder || 'auto',
            color: params.text.color || '#000000',
            anchor: params.text.anchor || 'center',
            offset: params.text.offset || [0, 0],
            padding: params.text.padding || 2,
            size: params.text.size || 16,
            placement: params.text.placement || 'point',
            rotation: params.text.rotation || 'auto',
            wrap: params.text.wrap || 10,
            spacing: params.text.spacing || 0,
            transform: params.text.transform || 'none',
            justify: params.text.justify || 'center',
            opacity: params.text.opacity || 1.0,
            font: params.text.font || ['Open Sans Regular', 'Arial Unicode MS Regular', 'sans-serif'],
            halo: {
                color: (params.text.halo && params.text.halo.color) || '#000000',
                width: (params.text.halo && params.text.halo.width) || 0,
                blur: (params.text.halo && params.text.halo.blur) || 0,
            },
        };
    }

    /**
     * Copies the content of the target style into this style.
     *
     * @param {Style} style - The style to copy.
     *
     * @return {Style} This style.
     */
    copy(style) {
        Object.assign(this.fill, style.fill);
        Object.assign(this.stroke, style.stroke);
        Object.assign(this.point, style.point);
        Object.assign(this.text, style.text);
        Object.assign(this.text.halo, style.text.halo);
        return this;
    }

    /**
     * Clones this style.
     *
     * @return {Style} The new style, cloned from this one.
     */
    clone() {
        const clone = new Style();
        return clone.copy(this);
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
            this.point.opacity = properties['fill-opacity'] || this.point.opacity;
            this.point.line = properties.stroke || 'gray';
            this.point.radius = properties.radius || this.point.radius;
        } else {
            this.stroke.color = properties.stroke;
            this.stroke.width = properties['stroke-width'];
            this.stroke.opacity = properties['stroke-opacity'];

            if (type !== FEATURE_TYPES.LINE) {
                this.fill.color = properties.fill;
                this.fill.opacity = properties['fill-opacity'] || this.fill.opacity;
            }
        }
        return this;
    }

    /**
     * set Style from vector tile layer properties.
     * @param {object} layer vector tile layer.
     * @param {Number} zoom vector tile layer.
     * @param {Object} sprites vector tile layer.
     * @param {boolean} [symbolToCircle=false]
     * @returns {Style}
     */
    setFromVectorTileLayer(layer, zoom, sprites, symbolToCircle = false) {
        layer.layout = layer.layout || {};
        layer.paint = layer.paint || {};

        if (layer.type === 'fill' && !this.fill.color) {
            const { color, opacity } = rgba2rgb(readVectorProperty(layer.paint['fill-color'] || layer.paint['fill-pattern']));
            this.fill.color = color;
            this.fill.opacity = readVectorProperty(layer.paint['fill-opacity'], zoom) || opacity || this.fill.opacity;
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
            this.stroke.lineCap = layer.layout['line-cap'];
            this.stroke.width = readVectorProperty(layer.paint['line-width'], zoom) || this.stroke.width;
            this.stroke.opacity = readVectorProperty(layer.paint['line-opacity'], zoom) || opacity || this.stroke.opacity;
        } else if (layer.type === 'circle' || symbolToCircle) {
            const { color, opacity } = rgba2rgb(readVectorProperty(layer.paint['circle-color'], zoom) || '#000000ff');
            this.point.color = color;
            this.point.opacity = opacity;
            this.point.radius = readVectorProperty(layer.paint['circle-radius'], zoom) || this.point.radius;
        } else if (layer.type === 'symbol') {
            // overlapping order
            this.text.zOrder = readVectorProperty(layer.layout['symbol-z-order'], zoom) || this.text.zOrder;
            if (this.text.zOrder == 'auto') {
                this.text.zOrder = readVectorProperty(layer.layout['symbol-sort-key'], zoom) || 'Y';
            } else if (this.text.zOrder == 'viewport-y') {
                this.text.zOrder = 'Y';
            } else if (this.text.zOrder == 'source') {
                this.text.zOrder = 0;
            }

            // position
            this.text.anchor = readVectorProperty(layer.layout['text-anchor'], zoom) || this.text.anchor;
            this.text.offset = readVectorProperty(layer.layout['text-offset'], zoom) || this.text.offset;
            this.text.padding = readVectorProperty(layer.layout['text-padding'], zoom) || this.text.padding;
            this.text.size = readVectorProperty(layer.layout['text-size'], zoom) || this.text.size;
            this.text.placement = readVectorProperty(layer.layout['symbol-placement'], zoom) || this.text.placement;
            this.text.rotation = readVectorProperty(layer.layout['text-rotation-alignment'], zoom) || this.text.rotation;

            // content
            this.text.field = readVectorProperty(layer.layout['text-field'], zoom) || this.text.field;
            this.text.wrap = readVectorProperty(layer.layout['text-max-width'], zoom) || this.text.wrap;
            this.text.spacing = readVectorProperty(layer.layout['text-letter-spacing'], zoom) || this.text.spacing;
            this.text.transform = readVectorProperty(layer.layout['text-transform'], zoom) || this.text.transform;
            this.text.justify = readVectorProperty(layer.layout['text-justify'], zoom) || this.text.justify;

            // appearance
            const { color, opacity } = rgba2rgb(readVectorProperty(layer.paint['text-color'], zoom) || this.text.color);
            this.text.color = color;
            this.text.opacity = readVectorProperty(layer.paint['text-opacity'], zoom) || (opacity !== undefined && opacity) || this.text.opacity;
            this.text.font = readVectorProperty(layer.layout['text-font'], zoom) || this.text.font;
            this.text.halo.color = readVectorProperty(layer.paint['text-halo-color'], zoom) || this.text.halo.color;
            this.text.halo.width = readVectorProperty(layer.paint['text-halo-width'], zoom) || this.text.halo.width;
            this.text.halo.blur = readVectorProperty(layer.paint['text-halo-blur'], zoom) || this.text.halo.blur;

            // additional icon
            const iconSrc = readVectorProperty(layer.layout['icon-image'], zoom);
            if (iconSrc) {
                let size = readVectorProperty(layer.layout['icon-size'], zoom);
                if (size == undefined) { size = 1; }

                this.icon = Cache.get(`${iconSrc}-${size}`);

                if (!this.icon) {
                    this.icon = {};
                    this.icon.dom = getImageFromSprite(sprites, iconSrc);
                    this.icon.dom.width *= size;
                    this.icon.dom.height *= size;

                    this.icon.anchor = readVectorProperty(layer.layout['icon-anchor'], zoom) || 'center';
                    this.icon.halfWidth = this.icon.dom.width / 2;
                    this.icon.halfHeight = this.icon.dom.height / 2;

                    Cache.set(`${iconSrc}-${size}`, this.icon);
                }
            }
        }
        return this;
    }

    /**
     * Applies this style to a DOM element. Limited to the `text` and `icon`
     * properties of this style.
     *
     * @param {Element} domElement - The element to set the style to.
     */
    applyToHTML(domElement) {
        domElement.style.padding = `${this.text.padding}px`;
        domElement.style.maxWidth = `${this.text.wrap}em`;

        domElement.style.color = this.text.color;
        domElement.style.fontSize = `${this.text.size}px`;
        domElement.style.fontFamily = this.text.font.join(',');

        domElement.style.overflowWrap = 'break-word';
        domElement.style.textTransform = this.text.transform;
        domElement.style.letterSpacing = `${this.text.spacing}em`;
        domElement.style.textAlign = this.text.justify;

        // NOTE: find a better way to support text halo
        if (this.text.halo.width > 0) {
            domElement.style.textShadow = `1px 1px 0px ${this.text.halo.color}, -1px 1px 0px ${this.text.halo.color}, -1px -1px 0px ${this.text.halo.color}, 1px -1px 0px ${this.text.halo.color}`;
        }

        if (!this.icon) {
            return;
        }

        this.icon.dom.style.position = 'absolute';
        switch (this.text.anchor) { // center by default
            case 'left':
                this.icon.dom.style.right = `calc(100% - ${this.icon.halfWidth}px)`;
                this.icon.dom.style.top = `calc(50% - ${this.icon.halfHeight}px)`;
                break;
            case 'right':
                this.icon.dom.style.top = `calc(50% - ${this.icon.halfHeight}px)`;
                break;
            case 'top':
                this.icon.dom.style.right = `calc(50% - ${this.icon.halfWidth}px)`;
                break;
            case 'bottom':
                this.icon.dom.style.top = `calc(100% - ${this.icon.halfHeight}px)`;
                this.icon.dom.style.right = `calc(50% - ${this.icon.halfWidth}px)`;
                break;
            case 'bottom-left':
                this.icon.dom.style.top = `calc(100% - ${this.icon.halfHeight}px)`;
                this.icon.dom.style.right = `calc(100% - ${this.icon.halfWidth}px)`;
                break;
            case 'bottom-right':
                this.icon.dom.style.top = `calc(100% - ${this.icon.halfHeight}px)`;
                break;
            case 'top-left':
                this.icon.dom.style.right = `calc(100% - ${this.icon.halfWidth}px)`;
                break;
            case 'top-right':
                break;
            case 'center':
            default:
                this.icon.dom.style.top = `calc(50% - ${this.icon.halfHeight}px)`;
                this.icon.dom.style.right = `calc(50% - ${this.icon.halfWidth}px)`;
                break;
        }

        domElement.appendChild(this.icon.dom.cloneNode());
    }

    /**
     * Get the CSS value corresponding to the anchor of the text. It is usually
     * a `translate()` value to use with a `transform` property.
     *
     * @return {string} The CSS value.
     */
    getTextAnchorPositionInCSS() {
        switch (this.text.anchor) {
            case 'left': return 'translate(0, -50%)';
            case 'right': return 'translate(-100%, -50%)';
            case 'top': return 'translate(-50%, 0)';
            case 'bottom': return 'translate(-50%, -100%)';
            case 'top-right': return 'translate(-100%, 0)';
            case 'bottom-left': return 'translate(0, -100%)';
            case 'bottom-right': return 'translate(-100%, -100%)';
            case 'center': return 'translate(-50%, -50%)';
            case 'top-left': // 0% in both case
            default:
                return '';
        }
    }

    /**
     * Returns a string, associating `style.text.field` and properties to use to
     * replace the keys in `style.text.field`.
     *
     * @param {Object} properties - An object containing the properties to use.
     *
     * @return {string} The formatted string.
     */
    getTextFromProperties(properties) {
        return this.text.field.replace(/\{(.+?)\}/g, (a, b) => (properties[b] || ''));
    }
}

export default Style;
