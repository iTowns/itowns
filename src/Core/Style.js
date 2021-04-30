import { FEATURE_TYPES } from 'Core/Feature';
import Cache from 'Core/Scheduler/Cache';
import Fetcher from 'Provider/Fetcher';
import * as mapbox from '@mapbox/mapbox-gl-style-spec';

import itowns_stroke_single_before from './StyleChunk/itowns_stroke_single_before.css';

export const cacheStyle = new Cache();

const inv255 = 1 / 255;
const canvas = document.createElement('canvas');
const style_properties = {};

function mapPropertiesFromContext(mainKey, from, to, context) {
    to[mainKey] = to[mainKey] || {};
    for (const key of style_properties[mainKey]) {
        const value = readExpression(from[mainKey][key], context);
        if (value !== undefined) {
            to[mainKey][key] = value;
        }
    }
}

function rgba2rgb(orig) {
    if (!orig) {
        return {};
    } else if (orig.stops || orig.expression) {
        return { color: orig };
    } else if (typeof orig == 'string') {
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
}

export function readExpression(property, ctx) {
    if (property != undefined) {
        if (property.expression) {
            return property.expression.evaluate(ctx);
        } else if (property.stops) {
            for (var i = property.stops.length - 1; i >= 0; i--) {
                const stop = property.stops[i];

                if (ctx.globals.zoom >= stop[0]) {
                    return stop[1];
                }
            }
            return property.stops[0][1];
        } else {
            return property;
        }
    }
}

function readVectorProperty(property, options) {
    if (property != undefined) {
        if (mapbox.expression.isExpression(property)) {
            return mapbox.expression.createExpression(property, options).value;
        } else {
            return property.base || property;
        }
    }
}

function getImage(source, key) {
    const target = document.createElement('img');

    if (typeof source == 'string') {
        target.src = source;
    } else if (source && source[key]) {
        const sprite = source[key];
        canvas.width = sprite.width;
        canvas.height = sprite.height;
        canvas.getContext('2d').drawImage(source.img, sprite.x, sprite.y, sprite.width, sprite.height, 0, 0, sprite.width, sprite.height);
        target.src = canvas.toDataURL('image/png');
    }

    return target;
}

const textAnchorPosition = {
    left: [0, -0.5],
    right: [-1, -0.5],
    top: [-0.5, 0],
    bottom: [-0.5, -1],
    'top-right': [-1, 0],
    'bottom-left': [0, -1],
    'bottom-right': [-1, -1],
    center: [-0.5, -0.5],
    'top-left': [0, 0],
};

function defineStyleProperty(style, category, name, value, defaultValue) {
    let property;

    Object.defineProperty(
        style[category],
        name,
        {
            enumerable: true,
            get: () => {
                if (property === undefined) {
                    return style.parent[category][name] || defaultValue;
                } else {
                    return property;
                }
            },
            set: (v) => {
                property = v;
            },
        });

    style[category][name] = value;
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
 * @property {number} order - Order of the features that will be associated to
 * the style. It can helps sorting and prioritizing features if needed.
 * @property {Object} fill - Polygons and fillings style.
 * @property {string} fill.color - Defines the main color of the filling. Can be
 * any [valid color
 * string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is no value, indicating that no filling needs to be done.
 * @property {Image|Canvas|string} fill.pattern - Defines a pattern to fill the
 * surface with. It can be an `Image` to use directly, or an url to fetch the
 * pattern from. See [this
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
 * @property {string} text.haloColor - The color of the halo. Can be any [valid
 * color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is `#000000`.
 * @property {number} text.haloWidth - The width of the halo, in pixels.
 * Default is `0`.
 * @property {number} text.haloBlur - The blur value of the halo, in pixels.
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
     * @param {Style} [parent] The parent style, that is looked onto if a value
     * is missing.
     *
     * @constructor
     */
    constructor(params = {}, parent) {
        this.isStyle = true;

        this.order = 0;

        this.parent = parent || {
            zoom: {},
            fill: {},
            stroke: {},
            point: {},
            text: {},
        };

        params.zoom = params.zoom || {};
        params.fill = params.fill || {};
        params.stroke = params.stroke || {};
        params.point = params.point || {};
        params.text = params.text || {};

        this.zoom = {};
        defineStyleProperty(this, 'zoom', 'min', params.zoom.min);
        defineStyleProperty(this, 'zoom', 'max', params.zoom.max);

        this.fill = {};
        defineStyleProperty(this, 'fill', 'color', params.fill.color);
        defineStyleProperty(this, 'fill', 'opacity', params.fill.opacity, 1.0);
        defineStyleProperty(this, 'fill', 'pattern', params.fill.pattern);
        defineStyleProperty(this, 'fill', 'base_altitude', params.fill.base_altitude);
        defineStyleProperty(this, 'fill', 'extrusion_height', params.fill.extrusion_height);

        if (typeof this.fill.pattern == 'string') {
            Fetcher.texture(this.fill.pattern).then((pattern) => {
                this.fill.pattern = pattern.image;
            });
        }

        this.stroke = {};
        defineStyleProperty(this, 'stroke', 'color', params.stroke.color);
        defineStyleProperty(this, 'stroke', 'opacity', params.stroke.opacity, 1.0);
        defineStyleProperty(this, 'stroke', 'width', params.stroke.width, 1.0);
        defineStyleProperty(this, 'stroke', 'dasharray', params.stroke.dasharray, []);
        defineStyleProperty(this, 'stroke', 'base_altitude', params.stroke.base_altitude);

        this.point = {};
        defineStyleProperty(this, 'point', 'color', params.point.color);
        defineStyleProperty(this, 'point', 'line', params.point.line);
        defineStyleProperty(this, 'point', 'opacity', params.point.opacity, 1.0);
        defineStyleProperty(this, 'point', 'radius', params.point.radius, 2.0);
        defineStyleProperty(this, 'point', 'width', params.point.width, 0.0);
        defineStyleProperty(this, 'point', 'base_altitude', params.point.base_altitude, 0.0);

        this.text = {};
        defineStyleProperty(this, 'text', 'field', params.text.field);
        defineStyleProperty(this, 'text', 'zOrder', params.text.zOrder, 'auto');
        defineStyleProperty(this, 'text', 'color', params.text.color, '#000000');
        defineStyleProperty(this, 'text', 'anchor', params.text.anchor, 'center');
        defineStyleProperty(this, 'text', 'offset', params.text.offset, [0, 0]);
        defineStyleProperty(this, 'text', 'padding', params.text.padding, 2);
        defineStyleProperty(this, 'text', 'size', params.text.size, 16);
        defineStyleProperty(this, 'text', 'placement', params.text.placement, 'point');
        defineStyleProperty(this, 'text', 'rotation', params.text.rotation, 'auto');
        defineStyleProperty(this, 'text', 'wrap', params.text.wrap, 10);
        defineStyleProperty(this, 'text', 'spacing', params.text.spacing, 0);
        defineStyleProperty(this, 'text', 'transform', params.text.transform, 'none');
        defineStyleProperty(this, 'text', 'justify', params.text.justify, 'center');
        defineStyleProperty(this, 'text', 'opacity', params.text.opacity, 1.0);
        defineStyleProperty(this, 'text', 'font', params.text.font, ['Open Sans Regular', 'Arial Unicode MS Regular', 'sans-serif']);
        defineStyleProperty(this, 'text', 'haloColor', params.text.haloColor, '#000000');
        defineStyleProperty(this, 'text', 'haloWidth', params.text.haloWidth, 0);
        defineStyleProperty(this, 'text', 'haloBlur', params.text.haloBlur, 0);
    }

    /**
     * Map drawing properties style (fill, stroke and point) from context to object.
     * Only the necessary properties are mapped to object.
     * if a property is expression, the mapped value will be the expression result depending on context.
     * @param      {Object}  context  The context
     * @return     {Object}  mapped style depending on context.
     */
    drawingStylefromContext(context) {
        const style = {};
        if (this.fill.color || this.fill.pattern) {
            mapPropertiesFromContext('fill', this, style, context);
        }
        if (this.stroke.color) {
            mapPropertiesFromContext('stroke', this, style, context);
        }
        if (this.point.color) {
            mapPropertiesFromContext('point', this, style, context);
        }
        if (Object.keys(style).length) {
            return style;
        }
    }

    /**
     * Map symbol properties style (symbol and icon) from context to object.
     * Only the necessary properties are mapped to object.
     * if a property is expression, the mapped value will be the expression result depending on context.
     * @param      {Object}  context  The context
     * @return     {Object}  mapped style depending on context.
     */
    symbolStylefromContext(context) {
        const style = new Style();
        mapPropertiesFromContext('text', this, style, context);
        if (this.icon) {
            mapPropertiesFromContext('icon', this, style, context);
        }
        return style;
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
            this.point.color = properties.fill;
            this.point.opacity = properties['fill-opacity'];
            this.point.line = properties.stroke;
            this.point.radius = properties.radius;

            this.text.color = properties['label-color'];
            this.text.opacity = properties['label-opacity'];
            this.text.size = properties['label-size'];

            if (properties.icon) {
                this.icon = { image: properties.icon, size: 1 };
            }
        } else {
            this.stroke.color = properties.stroke;
            this.stroke.width = properties['stroke-width'];
            this.stroke.opacity = properties['stroke-opacity'];

            if (type !== FEATURE_TYPES.LINE) {
                this.fill.color = properties.fill;
                this.fill.opacity = properties['fill-opacity'];
            }
        }
        return this;
    }

    /**
     * set Style from vector tile layer properties.
     * @param {object} layer vector tile layer.
     * @param {Object} sprites vector tile layer.
     * @param {number} [order=0]
     * @param {boolean} [symbolToCircle=false]
     * @returns {Style}
     */
    setFromVectorTileLayer(layer, sprites, order = 0, symbolToCircle = false) {
        layer.layout = layer.layout || {};
        layer.paint = layer.paint || {};

        this.order = order;

        if (layer.type === 'fill' && !this.fill.color) {
            const { color, opacity } = rgba2rgb(readVectorProperty(layer.paint['fill-color'] || layer.paint['fill-pattern'], { type: 'color' }));
            this.fill.color = color;
            this.fill.opacity = readVectorProperty(layer.paint['fill-opacity']) || opacity;
            if (layer.paint['fill-pattern'] && sprites) {
                this.fill.pattern = getImage(sprites, layer.paint['fill-pattern']);
            }

            if (layer.paint['fill-outline-color']) {
                const { color, opacity } = rgba2rgb(readVectorProperty(layer.paint['fill-outline-color'], { type: 'color' }));
                this.stroke.color = color;
                this.stroke.opacity = opacity;
                this.stroke.width = 1.0;
                this.stroke.dasharray = [];
            }
        } else if (layer.type === 'line' && !this.stroke.color) {
            const prepare = readVectorProperty(layer.paint['line-color'], { type: 'color' });
            const { color, opacity } = rgba2rgb(prepare);
            this.stroke.dasharray = readVectorProperty(layer.paint['line-dasharray']);
            this.stroke.color = color;
            this.stroke.lineCap = layer.layout['line-cap'];
            this.stroke.width = readVectorProperty(layer.paint['line-width']);
            this.stroke.opacity = readVectorProperty(layer.paint['line-opacity']) || opacity;
        } else if (layer.type === 'circle' || symbolToCircle) {
            const { color, opacity } = rgba2rgb(readVectorProperty(layer.paint['circle-color'], { type: 'color' }));
            this.point.color = color;
            this.point.opacity = opacity;
            this.point.radius = readVectorProperty(layer.paint['circle-radius']);
        } else if (layer.type === 'symbol') {
            // overlapping order
            this.text.zOrder = readVectorProperty(layer.layout['symbol-z-order']);
            if (this.text.zOrder == 'auto') {
                this.text.zOrder = readVectorProperty(layer.layout['symbol-sort-key']) || 'Y';
            } else if (this.text.zOrder == 'viewport-y') {
                this.text.zOrder = 'Y';
            } else if (this.text.zOrder == 'source') {
                this.text.zOrder = 0;
            }

            // position
            this.text.anchor = readVectorProperty(layer.layout['text-anchor']);
            this.text.offset = readVectorProperty(layer.layout['text-offset']);
            this.text.padding = readVectorProperty(layer.layout['text-padding']);
            this.text.size = readVectorProperty(layer.layout['text-size']);
            this.text.placement = readVectorProperty(layer.layout['symbol-placement']);
            this.text.rotation = readVectorProperty(layer.layout['text-rotation-alignment']);

            // content
            this.text.field = readVectorProperty(layer.layout['text-field']);
            this.text.wrap = readVectorProperty(layer.layout['text-max-width']);
            this.text.spacing = readVectorProperty(layer.layout['text-letter-spacing']);
            this.text.transform = readVectorProperty(layer.layout['text-transform']);
            this.text.justify = readVectorProperty(layer.layout['text-justify']);

            // appearance
            const { color, opacity } = rgba2rgb(readVectorProperty(layer.paint['text-color'], { type: 'color' }));
            this.text.color = color;
            this.text.opacity = readVectorProperty(layer.paint['text-opacity']) || (opacity !== undefined && opacity);

            this.text.font = readVectorProperty(layer.layout['text-font']);
            const haloColor = readVectorProperty(layer.paint['text-halo-color'], { type: 'color' });
            if (haloColor) {
                this.text.haloColor = haloColor.color || haloColor;
                this.text.haloWidth = readVectorProperty(layer.paint['text-halo-width']);
                this.text.haloBlur = readVectorProperty(layer.paint['text-halo-blur']);
            }

            // additional icon
            const key = readVectorProperty(layer.layout['icon-image']);
            if (key) {
                this.icon = { key };
                this.icon.size = readVectorProperty(layer.layout['icon-size']) || 1;
            }
        }
        return this;
    }

    /**
     * Applies this style to a DOM element. Limited to the `text` and `icon`
     * properties of this style.
     *
     * @param {Element} domElement - The element to set the style to.
     * @param {Object} sprites - the sprites.
     */
    applyToHTML(domElement, sprites) {
        domElement.style.padding = `${this.text.padding}px`;
        domElement.style.maxWidth = `${this.text.wrap}em`;

        domElement.style.color = this.text.color;
        if (this.text.size > 0) {
            domElement.style.fontSize = `${this.text.size}px`;
        }

        domElement.style.fontFamily = this.text.font.join(',');
        domElement.style.textTransform = this.text.transform;
        domElement.style.letterSpacing = `${this.text.spacing}em`;
        domElement.style.textAlign = this.text.justify;
        domElement.style['white-space'] = 'pre-line';

        if (this.text.haloWidth > 0) {
            domElement.style.setProperty('--text_stroke_display', 'block');
            domElement.style.setProperty('--text_stroke_width', `${this.text.haloWidth}px`);
            domElement.style.setProperty('--text_stroke_color', this.text.haloColor);
            domElement.setAttribute('data-before', domElement.textContent);
        }

        if (!this.icon) {
            return;
        }

        const image = this.icon.image;

        const size = this.icon.size;

        const key = this.icon.key;

        let icon = cacheStyle.get(image || key, size);

        if (!icon) {
            if (key && sprites) {
                icon = getImage(sprites, key);
            } else {
                icon = getImage(image);
            }
            icon.style.position = 'absolute';
            cacheStyle.set(icon, image || key, size);
        }

        const addIcon = () => {
            const cIcon = icon.cloneNode();
            cIcon.width *= size;
            cIcon.height *= size;
            switch (this.text.anchor) {
                case 'left':
                    cIcon.style.right = `calc(100% - ${cIcon.width * 0.5}px)`;
                    cIcon.style.top = `calc(50% - ${cIcon.height * 0.5}px)`;
                    break;
                case 'right':
                    cIcon.style.top = `calc(50% - ${cIcon.height * 0.5}px)`;
                    break;
                case 'top':
                    cIcon.style.right = `calc(50% - ${cIcon.width * 0.5}px)`;
                    break;
                case 'bottom':
                    cIcon.style.top = `calc(100% - ${cIcon.height * 0.5}px)`;
                    cIcon.style.right = `calc(50% - ${cIcon.width * 0.5}px)`;
                    break;
                case 'bottom-left':
                    cIcon.style.top = `calc(100% - ${cIcon.height * 0.5}px)`;
                    cIcon.style.right = `calc(100% - ${cIcon.width * 0.5}px)`;
                    break;
                case 'bottom-right':
                    cIcon.style.top = `calc(100% - ${cIcon.height * 0.5}px)`;
                    break;
                case 'top-left':
                    cIcon.style.right = `calc(100% - ${cIcon.width * 0.5}px)`;
                    break;
                case 'top-right':
                    break;
                case 'center':
                default:
                    cIcon.style.top = `calc(50% - ${cIcon.height * 0.5}px)`;
                    cIcon.style.right = `calc(50% - ${cIcon.width * 0.5}px)`;
                    break;
            }

            cIcon.style['z-index'] = -1;
            domElement.appendChild(cIcon);
            icon.removeEventListener('load', addIcon);
        };

        if (icon.complete) {
            addIcon();
        } else {
            icon.addEventListener('load', addIcon);
        }
    }

    /**
     * Gets the values corresponding to the anchor of the text. It is
     * proportions, to use with a `translate()` and a `transform` property.
     *
     * @return {number[]} Two percentage values, for x and y respectively.
     */
    getTextAnchorPosition() {
        return textAnchorPosition[this.text.anchor];
    }

    /**
     * Returns a string, associating `style.text.field` and properties to use to
     * replace the keys in `style.text.field`.
     *
     * @param {Object} ctx - An object containing the feature context.
     *
     * @return {string} The formatted string.
     */
    getTextFromProperties(ctx) {
        if (this.text.field.expression) {
            return readExpression(this.text.field, ctx);
        } else {
            return this.text.field.replace(/\{(.+?)\}/g, (a, b) => (ctx.properties()[b] || '')).trim();
        }
    }
}

// Add custom style sheet with iTowns specifics
const CustomStyle = {
    itowns_stroke_single_before,
};
const customStyleSheet = document.createElement('style');
customStyleSheet.type = 'text/css';

Object.keys(CustomStyle).forEach((key) => {
    customStyleSheet.innerHTML += `${CustomStyle[key]}\n\n`;
});

document.getElementsByTagName('head')[0].appendChild(customStyleSheet);

const style = new Style();

style_properties.fill = Object.keys(style.fill);
style_properties.stroke = Object.keys(style.stroke);
style_properties.point = Object.keys(style.point);
style_properties.text = Object.keys(style.text);
style_properties.icon = ['image', 'size', 'key'];

export default Style;
