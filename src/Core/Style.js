import { FEATURE_TYPES } from 'Core/Feature';
import Cache from 'Core/Scheduler/Cache';
import Fetcher from 'Provider/Fetcher';
import * as maplibre from '@maplibre/maplibre-gl-style-spec';
import { Color } from 'three';
import { deltaE } from 'Renderer/Color';
import Coordinates from 'Core/Geographic/Coordinates';

import itowns_stroke_single_before from './StyleChunk/itowns_stroke_single_before.css';

const cacheStyle = new Cache();

const matrix = document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGMatrix();
const canvas = document.createElement('canvas');

const inv255 = 1 / 255;

function baseAltitudeDefault(properties, ctx) {
    return ctx?.coordinates?.z || 0;
}

export function readExpression(property, ctx) {
    if (property.expression) {
        return property.expression.evaluate(ctx);
    }
    if (property.stops) {
        const stops = property.stops;
        property = property.stops[0][1];
        for (let i = stops.length - 1; i >= 0; i--) {
            const stop = stops[i];

            if (ctx.zoom >= stop[0]) {
                property = stop[1];
                break;
            }
        }
    }
    if (typeof property === 'string' || property instanceof String) {
        return property.replace(/\{(.+?)\}/g, (a, b) => (ctx.properties[b] || '')).trim();
    }
    if (property instanceof Function) {
        // TOBREAK: Pass the current `context` as a unique parameter.
        // In this proposal, metadata will be accessed in the callee by the
        // `context.properties` property.
        return property(ctx.properties, ctx);
    }
    return property;
}

function rgba2rgb(orig) {
    if (!orig) {
        return {};
    } else if (orig.stops || orig.expression) {
        return { color: orig };
    } else if (typeof orig == 'string') {
        const result = orig.match(/(?:((hsl|rgb)a? *\(([\d.%]+(?:deg|g?rad|turn)?)[ ,]*([\d.%]+)[ ,]*([\d.%]+)[ ,/]*([\d.%]*)\))|(#((?:[\d\w]{3}){1,2})([\d\w]{1,2})?))/i);
        if (result === null) {
            return { color: orig, opacity: 1.0 };
        } else if (result[7]) {
            let opacity = 1.0;
            if (result[9]) {
                opacity = parseInt(result[9].length == 1 ? `${result[9]}${result[9]}` : result[9], 16) * inv255;
            }
            return { color: `#${result[8]}`, opacity };
        } else if (result[1]) {
            return { color: `${result[2]}(${result[3]},${result[4]},${result[5]})`, opacity: (result[6] ? Number(result[6]) : 1.0) };
        }
    }
}

function readVectorProperty(property, options) {
    if (property != undefined) {
        if (maplibre.expression.isExpression(property)) {
            return maplibre.expression.createExpression(property, options).value;
        } else {
            return property;
        }
    }
}

async function loadImage(source) {
    let promise = cacheStyle.get(source, 'null');
    if (!promise) {
        promise = Fetcher.texture(source, { crossOrigin: 'anonymous' });
        cacheStyle.set(promise, source, 'null');
    }
    return (await promise).image;
}

function cropImage(img, cropValues) {
    const x = cropValues.x || 0;
    const y = cropValues.y || 0;
    const width = cropValues.width || img.naturalWidth;
    const height = cropValues.height || img.naturalHeight;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img,
        x, y, width, height,
        0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
}

function replaceWhitePxl(imgd, color, id) {
    if (!color) {
        return imgd;
    }
    const imgdColored = cacheStyle.get(id, color);
    if (!imgdColored) {
        const pix = imgd.data;
        const newColor = new Color(color);
        const colorToChange = new Color('white');
        for (let i = 0, n = pix.length; i < n; i += 4) {
            const d = deltaE(pix.slice(i, i + 3), colorToChange) / 100;
            pix[i] = (pix[i] * d +  newColor.r * 255 * (1 - d));
            pix[i + 1] = (pix[i + 1] * d +  newColor.g * 255 * (1 - d));
            pix[i + 2] = (pix[i + 2] * d +  newColor.b * 255 * (1 - d));
        }
        cacheStyle.set(imgd, id, color);
        return imgd;
    }
    return imgdColored;
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

/**
 * Defines a property for the given Style for a specific parameter in a given category (one of fill, stroke, point, text, icon or zoom),
 * by generating its getter and setter.
 * The getter is in charge of returning the right style value from the following ones if they are defined (in that specific order):
 * the value set by the user (`userValue`)
 * the value read from the data source (`dataValue`)
 * the default fallback value (`defaultValue`).
 * The setter can be called to change dynamically the value.
 * @param {Style} style - The Style instance to set.
 * @param {string} category - The category (fill, stroke, point, test, icon or zoom) to set.
 * @param {string} parameter - The parameter of the category to set.
 * @param {All} userValue - The value given by the user (if any). Can be undefined.
 * @param {All} [defaultValue] - The default value to return (if needed).
 */
function defineStyleProperty(style, category, parameter, userValue, defaultValue) {
    let property;
    Object.defineProperty(
        style[category],
        parameter,
        {
            enumerable: true,
            get: () => {
                // != to check for 'undefined' and 'null' value)
                if (property != undefined) { return property; }
                if (userValue != undefined) { return readExpression(userValue, style.context); }
                const dataValue = style.context.featureStyle?.[category]?.[parameter];
                if (dataValue != undefined) { return readExpression(dataValue, style.context); }
                if (defaultValue instanceof Function) {
                    return defaultValue(style.context.properties, style.context) ?? defaultValue;
                }
                return defaultValue;
            },
            set: (v) => {
                property = v;
            },
        });
}

/**
 * StyleContext stores metadata of one FeatureGeometry that are needed for its style computation:
 * type of feature and what is needed (fill, stroke or draw a point, etc.) as well as where to get its
 * properties and its coordinates (for base_altitude).
 *
 * @property {number}               zoom Current zoom to display the FeatureGeometry.
 * @property {Object}               collection The FeatureCollection to which the FeatureGeometry is attached.
 * @property {Object}               properties Properties of the FeatureGeometry.
 * @property {string}               type Geometry type of the feature. Can be `point`, `line`, or `polygon`.
 * @property {StyleOptions|Function}featureStyle StyleOptions object (or a function returning one) to get style
 *                                  information at feature and FeatureGeometry level from the data parsed.
 * @property {Coordinates}          coordinates The coordinates (in world space) of the last vertex (x, y, z) set with
 *                                  setLocalCoordinatesFromArray().
 * private properties:
 * @property {Coordinates}          worldCoord @private Coordinates object to store coordinates in world space.
 * @property {Coordinates}          localCoordinates @private Coordinates object to store coordinates in local space.
 * @property {boolean}              worldCoordsComputed @private Have the world coordinates already been computed
 *                                      from the local coordinates?
 * @property {Feature}              feature  @private The itowns feature of interest.
 * @property {FeatureGeometry}      geometry  @private The FeatureGeometry to compute the style.
 */
export class StyleContext {
    #worldCoord = new Coordinates('EPSG:4326', 0, 0, 0);
    #localCoordinates = new Coordinates('EPSG:4326', 0, 0, 0);
    #worldCoordsComputed = true;
    #feature = {};
    #geometry = {};

    setZoom(zoom) {
        this.zoom = zoom;
    }

    setFeature(f) {
        this.#feature = f;
    }

    setGeometry(g) {
        this.#geometry = g;
    }

    setCollection(c) {
        this.collection = c;
        this.#localCoordinates.setCrs(c.crs);
    }

    setLocalCoordinatesFromArray(vertices, offset) {
        this.#worldCoordsComputed = false;
        return this.#localCoordinates.setFromArray(vertices, offset);
    }

    get properties() {
        return this.#geometry.properties;
    }

    get type() {
        return this.#feature.type;
    }
    get featureStyle() {
        let featureStyle = this.#feature.style;
        if (featureStyle instanceof Function) {
            featureStyle = featureStyle(this.properties, this);
        }
        return featureStyle;
    }

    get coordinates() {
        if (!this.#worldCoordsComputed) {
            this.#worldCoordsComputed = true;
            this.#worldCoord.copy(this.#localCoordinates).applyMatrix4(this.collection.matrixWorld);
            if (this.#localCoordinates.crs == 'EPSG:4978') {
                return this.#worldCoord.as('EPSG:4326', this.#worldCoord);
            }
        }
        return this.#worldCoord;
    }
}

function _addIcon(icon, domElement, opt) {
    const cIcon = icon.cloneNode();

    cIcon.setAttribute('class', 'itowns-icon');

    cIcon.width = icon.width * opt.size;
    cIcon.height = icon.height * opt.size;
    cIcon.style.color = opt.color;
    cIcon.style.opacity = opt.opacity;
    cIcon.style.position = 'absolute';
    cIcon.style.top = '0';
    cIcon.style.left = '0';

    switch (opt.anchor) { // center by default
        case 'left':
            cIcon.style.top = `${-0.5 * cIcon.height}px`;
            break;
        case 'right':
            cIcon.style.top = `${-0.5 * cIcon.height}px`;
            cIcon.style.left = `${-cIcon.width}px`;
            break;
        case 'top':
            cIcon.style.left = `${-0.5 * cIcon.width}px`;
            break;
        case 'bottom':
            cIcon.style.top = `${-cIcon.height}px`;
            cIcon.style.left = `${-0.5 * cIcon.width}px`;
            break;
        case 'bottom-left':
            cIcon.style.top = `${-cIcon.height}px`;
            break;
        case 'bottom-right':
            cIcon.style.top = `${-cIcon.height}px`;
            cIcon.style.left = `${-cIcon.width}px`;
            break;
        case 'top-left':
            break;
        case 'top-right':
            cIcon.style.left = `${-cIcon.width}px`;
            break;
        case 'center':
        default:
            cIcon.style.top = `${-0.5 * cIcon.height}px`;
            cIcon.style.left = `${-0.5 * cIcon.width}px`;
            break;
    }

    cIcon.style['z-index'] = -1;
    domElement.appendChild(cIcon);
    return cIcon;
}

/**
 * An object that can contain any properties (zoom, fill, stroke, point,
 * text or/and icon) and sub properties of a Style.<br/>
 * Used for the instanciation of a {@link Style}.
 *
 * @typedef {Object} StyleOptions
 *
 * @property {Object} [zoom] - Level on which to display the feature
 * @property {Number} [zoom.max] - max level
 * @property {Number} [zoom.min] - min level
 *
 * @property {Object} [fill] - Fill style for polygons.
 * @property {String|Function|THREE.Color} [fill.color] - Defines the main fill color. Can be
 * any [valid color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is no value, which means no fill.
 * If the `Layer` is a `GeometryLayer` you can use `THREE.Color`.
 * @property {Image|Canvas|String|Object|Function} [fill.pattern] - Defines a pattern to fill the
 * surface with. It can be an `Image` to use directly, an url to fetch the pattern or an object containing
 * the url of the image to fetch and the transformation to apply.
 * from. See [this example](http://www.itowns-project.org/itowns/examples/#source_file_geojson_raster)
 * for how to use.
 * @property {Image|String} [fill.pattern.source] - The image or the url to fetch the pattern image
 * @property {Object} [fill.pattern.cropValues] - The x, y, width and height (in pixel) of the sub image to use.
 * @property {THREE.Color} [fill.pattern.color] - Can be any
 * [valid color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * It will change the color of the white pixels of the source image.
 * @property {Number|Function} [fill.opacity] - The opacity of the color or of the
 * pattern. Can be between `0.0` and `1.0`. Default is `1.0`.
 * For a `GeometryLayer`, this opacity property isn't used.
 * @property {Number|Function} [fill.base_altitude] - `GeometryLayer` style option, defines altitude
 * for each coordinate.
 * If `base_altitude` is `undefined`, the original altitude is kept, and if it doesn't exist
 * then the altitude value is set to 0.
 * @property {Number|Function} [fill.extrusion_height] - `GeometryLayer` style option, if defined,
 * polygons will be extruded by the specified amount
 *
 * @property {Object} [stroke] - Lines and polygons edges.
 * @property {String|Function|THREE.Color} [stroke.color] The color of the line. Can be any [valid
 * color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is no value, which means no stroke.
 * If the `Layer` is a `GeometryLayer` you can use `THREE.Color`.
 * @property {Number|Function} [stroke.opacity] - The opacity of the line. Can be between
 * `0.0` and `1.0`. Default is `1.0`.
 * For a `GeometryLayer`, this opacity property isn't used.
 * @property {Number|Function} [stroke.width] - The width of the line. Default is `1.0`.
 * @property {Number|Function} [stroke.base_altitude] - `GeometryLayer` style option, defines altitude
 * for each coordinate.
 * If `base_altitude` is `undefined`, the original altitude is kept, and if it doesn't exist
 * then the altitude value is set to 0.
 *
 * @property {Object} [point] - Point style.
 * @property {String|Function} [point.color] - The color of the point. Can be any [valid
 * color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is no value, which means points won't be displayed.
 * @property {Number|Function} [point.radius] - The radius of the point, in pixel. Default
 * is `2.0`.
 * @property {String|Function} [point.line] - The color of the border of the point. Can be
 * any [valid color
 * string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Not supported for a `GeometryLayer`.
 * @property {Number|Function} [point.width] - The width of the border, in pixel. Default
 * is `0.0` (no border).
 * @property {Number|Function} [point.opacity] - The opacity of the point. Can be between
 * `0.0` and `1.0`. Default is `1.0`.
 * Not supported for `GeometryLayer`.
 * @property {Number|Function} [point.base_altitude] - `GeometryLayer` style option, defines altitude
 * for each coordinate.
 * If `base_altitude` is `undefined`, the original altitude is kept, and if it doesn't exist
 * then the altitude value is set to 0.
 * @property {Object} [point.model] - 3D model to instantiate at each point position.
 *
 * @property {Object} [text] - All things {@link Label} related. (Supported for Points features, not yet
 * for Lines and Polygons features.)
 * @property {String|Function} [text.field] - A string representing a property key of
 * a `FeatureGeometry` enclosed in brackets, that will be replaced by the value of the
 * property for each geometry. For example, if each geometry contains a `name` property,
 * `text.field` can be set to `{name}`. Default is no value, indicating that no
 * text will be displayed.
 *
 * It's also possible to create more complex expressions. For example, you can combine
 * text that will always be displayed (e.g. `foo`) and variable properties (e.g. `{bar}`)
 * like the following: `foo {bar}`. You can also use multiple variables in one field.
 * Let's say for instance that you have two properties latin name and local name of a
 * place, you can write something like `{name_latin} - {name_local}` which can result
 * in `Marrakesh - مراكش` for example.
 * @property {String|Function} [text.color] - The color of the text. Can be any [valid
 * color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is `#000000`.
 * @property {String|Number[]|Function} [text.anchor] - The anchor of the text compared to its
 * position (see {@link Label} for the position). Can be one of the following values: `top`,
 * `left`, `bottom`, `right`, `center`, `top-left`, `top-right`, `bottom-left`
 * or `bottom-right`. Default is `center`.
 *
 * It can also be defined as an Array of two numbers. Each number defines an offset (in
 * fraction of the label width and height) between the label position and the top-left
 * corner of the text. The first value is the horizontal offset, and the second is the
 * vertical offset. For example, `[-0.5, -0.5]` will be equivalent to `center`.
 * @property {Array|Function} [text.offset] - The offset of the text, depending on its
 * anchor, in pixels. First value is from `left`, second is from `top`. Default
 * is `[0, 0]`.
 * @property {Number|Function} [text.padding] - The padding outside the text, in pixels.
 * Default is `2`.
 * @property {Number|Function} [text.size] - The size of the font, in pixels. Default is
 * `16`.
 * @property {Number|Function} [text.wrap] - The maximum width, in pixels, before the text
 * is wrapped, because the string is too long. Default is `10`.
 * @property {Number|Function} [text.spacing] - The spacing between the letters, in `em`.
 * Default is `0`.
 * @property {String|Function} [text.transform] - A value corresponding to the [CSS
 * property
 * `text-transform`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-transform).
 * Default is `none`.
 * @property {String|Function} [text.justify] - A value corresponding to the [CSS property
 * `text-align`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-align).
 * Default is `center`.
 * @property {Number|Function} [text.opacity] - The opacity of the text. Can be between
 * `0.0` and `1.0`. Default is `1.0`.
 * @property {Array|Function} [text.font] - A list (as an array of string) of font family
 * names, prioritized in the order it is set. Default is `Open Sans Regular,
 * Arial Unicode MS Regular, sans-serif`.
 * @property {String|Function} [text.haloColor] - The color of the halo. Can be any [valid
 * color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is `#000000`.
 * @property {Number|Function} [text.haloWidth] - The width of the halo, in pixels.
 * Default is `0`.
 * @property {Number|Function} [text.haloBlur] - The blur value of the halo, in pixels.
 * Default is `0`.
 *
 * @property {Object} [icon] - Defines the appearance of icons attached to label.
 * @property {String} [icon.source] - The url of the icons' image file.
 * @property {String} [icon.id] - The id of the icons' sub-image in a vector tile data set.
 * @property {String} [icon.cropValues] - the x, y, width and height (in pixel) of the sub image to use.
 * @property {String} [icon.anchor] - The anchor of the icon compared to the label position.
 * Can be `left`, `bottom`, `right`, `center`, `top-left`, `top-right`, `bottom-left`
 * or `bottom-right`. Default is `center`.
 * @property {Number} [icon.size] - If the icon's image is passed with `icon.source` and/or
 * `icon.id`, its size when displayed on screen is multiplied by `icon.size`. Default is `1`.
 * @property {String|Function} [icon.color] - The color of the icon. Can be any [valid
 * color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * It will change the color of the white pixels of the icon source image.
 * @property {Number|Function} [icon.opacity] - The opacity of the icon. Can be between
 * `0.0` and `1.0`. Default is `1.0`.
*/

/**
 * A Style is a class that defines the visual appearance of {@link
 * FeatureCollection} and {@link Feature}. It is taken into account when drawing
 * them in textures that will be placed onto tiles.
 *
 * As there are five basic elements present in `Features`, there are also five
 * main components in a `Style` object:
 * - `fill` is for all fillings and polygons
 * - `stroke` is for all lines and polygons edges
 * - `point` is for all points
 * - `text` contains all {@link Label} related things
 * - `icon` defines the appearance of icons attached to label.
 *
 * Many style property can be set to functions. When that is the case, the function's
 * return type must necessarily be the same as the types (other than function) of the property.
 * For instance, if the `fill.pattern` property is set to a function, this function must return
 * an `Image`, a `Canvas`, or `String`.
 * The first parameter of functions used to set `Style` properties is always an object containing
 * the properties of the features displayed with the current `Style` instance.
 *
 * @property {Object} fill - Polygons and fillings style.
 * @property {String|Function|THREE.Color} fill.color - Defines the main color of the filling. Can be
 * any [valid color
 * string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is no value, indicating that no filling needs to be done.
 * If the `Layer` is a `GeometryLayer` you can use `THREE.Color`.
 * @property {Image|Canvas|String|Object|Function} [fill.pattern] - Defines a pattern to fill the
 * surface with. It can be an `Image` to use directly, an url to fetch the pattern or an object containing
 * the url of the image to fetch and the transformation to apply.
 * from. See [this example] (http://www.itowns-project.org/itowns/examples/#source_file_geojson_raster)
 * for how to use.
 * @property {Image|String} [fill.pattern.source] - The image or the url to fetch the pattern image
 * @property {Object} [fill.pattern.cropValues] - The x, y, width and height (in pixel) of the sub image to use.
 * @property {THREE.Color} [fill.pattern.color] - Can be any [valid color string]
 * @property {Number|Function} fill.opacity - The opacity of the color or of the
 * pattern. Can be between `0.0` and `1.0`. Default is `1.0`.
 * For a `GeometryLayer`, this opacity property isn't used.
 * @property {Number|Function} fill.base_altitude - Only for {@link GeometryLayer}, defines altitude
 * for each coordinate.
 * If `base_altitude` is `undefined`, the original altitude is kept, and if it doesn't exist
 * then the altitude value is set to 0.
 * @property {Number|Function} [fill.extrusion_height] - Only for {@link GeometryLayer} and if user sets it.
 * If defined, polygons will be extruded by the specified amount.
 * @property {Object} stroke - Lines and polygons edges.
 * @property {String|Function|THREE.Color} stroke.color The color of the line. Can be any [valid
 * color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is no value, indicating that no stroke needs to be done.
 * If the `Layer` is a `GeometryLayer` you can use `THREE.Color`.
 * @property {Number|Function} stroke.opacity - The opacity of the line. Can be between
 * `0.0` and `1.0`. Default is `1.0`.
 * For a `GeometryLayer`, this opacity property isn't used.
 * @property {Number|Function} stroke.width - The width of the line. Default is `1.0`.
 * @property {Number|Function} stroke.base_altitude - Only for {@link GeometryLayer}, defines altitude
 * for each coordinate.
 * If `base_altitude` is `undefined`, the original altitude is kept, and if it doesn't exist
 * then the altitude value is set to 0.
 *
 * @property {Object} point - Point style.
 * @property {String|Function} point.color - The color of the point. Can be any [valid
 * color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is no value, indicating that no point will be shown.
 * @property {Number|Function} point.radius - The radius of the point, in pixel. Default
 * is `2.0`.
 * @property {String|Function} point.line - The color of the border of the point. Can be
 * any [valid color
 * string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Not supported for `GeometryLayer`.
 * @property {Number|Function} point.width - The width of the border, in pixel. Default
 * is `0.0` (no border).
 * @property {Number|Function} point.opacity - The opacity of the point. Can be between
 * `0.0` and `1.0`. Default is `1.0`.
 * Not supported for `GeometryLayer`.
 * @property {Number|Function} point.base_altitude - Only for {@link GeometryLayer}, defines altitude
 * for each coordinate.
 * If `base_altitude` is `undefined`, the original altitude is kept, and if it doesn't exist
 * then the altitude value is set to 0.
 * @property {Object} point.model - 3D model to instantiate at each point position

 *
 * @property {Object} text - All things {@link Label} related.
 * @property {String|Function} text.field - A string representing a property key of
 * a `FeatureGeometry` enclosed in brackets, that will be replaced by the value of the
 * property for each geometry. For example, if each geometry contains a `name` property,
 * `text.field` can be set to `{name}`. Default is no value, indicating that no
 * text will be displayed.
 *
 * It's also possible to create more complex expressions. For example, you can combine
 * text that will always be displayed (e.g. `foo`) and variable properties (e.g. `{bar}`)
 * like the following: `foo {bar}`. You can also use multiple variables in one field.
 * Let's say for instance that you have two properties latin name and local name of a
 * place, you can write something like `{name_latin} - {name_local}` which can result
 * in `Marrakesh - مراكش` for example.
 * @property {String|Function} text.color - The color of the text. Can be any [valid
 * color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is `#000000`.
 * @property {String|Number[]|Function} text.anchor - The anchor of the text relative to its
 * position (see {@link Label} for the position). Can be one of the following values: `top`,
 * `left`, `bottom`, `right`, `center`, `top-left`, `top-right`, `bottom-left`
 * or `bottom-right`. Default is `center`.
 *
 * It can also be defined as an Array of two numbers. Each number defines an offset (in
 * fraction of the label width and height) between the label position and the top-left
 * corner of the text. The first value is the horizontal offset, and the second is the
 * vertical offset. For example, `[-0.5, -0.5]` will be equivalent to `center`.
 * @property {Array|Function} text.offset - The offset of the text, depending on its
 * anchor, in pixels. First value is from `left`, second is from `top`. Default
 * is `[0, 0]`.
 * @property {Number|Function} text.padding - The padding outside the text, in pixels.
 * Default is `2`.
 * @property {Number|Function} text.size - The size of the font, in pixels. Default is
 * `16`.
 * @property {Number|Function} text.wrap - The maximum width, in pixels, before the text
 * is wrapped, because the string is too long. Default is `10`.
 * @property {Number|Function} text.spacing - The spacing between the letters, in `em`.
 * Default is `0`.
 * @property {String|Function} text.transform - A value corresponding to the [CSS
 * property
 * `text-transform`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-transform).
 * Default is `none`.
 * @property {String|Function} text.justify - A value corresponding to the [CSS property
 * `text-align`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-align).
 * Default is `center`.
 * @property {Number|Function} text.opacity - The opacity of the text. Can be between
 * `0.0` and `1.0`. Default is `1.0`.
 * @property {Array|Function} text.font - A list (as an array of string) of font family
 * names, prioritized in the order it is set. Default is `Open Sans Regular,
 * Arial Unicode MS Regular, sans-serif`.
 * @property {String|Function} text.haloColor - The color of the halo. Can be any [valid
 * color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * Default is `#000000`.
 * @property {Number|Function} text.haloWidth - The width of the halo, in pixels.
 * Default is `0`.
 * @property {Number|Function} text.haloBlur - The blur value of the halo, in pixels.
 * Default is `0`.
 *
 * @property {Object} icon - Defines the appearance of icons attached to label.
 * @property {String} icon.source - The url of the icons' image file.
 * @property {String} icon.id - The id of the icons' sub-image in a vector tile data set.
 * @property {String} icon.cropValues - the x, y, width and height (in pixel) of the sub image to use.
 * @property {String} icon.anchor - The anchor of the icon compared to the label position.
 * Can be `left`, `bottom`, `right`, `center`, `top-left`, `top-right`, `bottom-left`
 * or `bottom-right`. Default is `center`.
 * @property {Number} icon.size - If the icon's image is passed with `icon.source` and/or
 * `icon.id`, its size when displayed on screen is multiplied by `icon.size`. Default is `1`.
 * @property {String|Function} icon.color - The color of the icon. Can be any [valid
 * color string](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
 * It will change the color of the white pixels of the icon source image.
 * @property {Number|Function} icon.opacity - The opacity of the icon. Can be between
 * `0.0` and `1.0`. Default is `1.0`.
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
     * @param {StyleOptions} [params={}] An object that contain any properties
     * (zoom, fill, stroke, point, text or/and icon)
     * and sub properties of a Style ({@link StyleOptions}).
     */
    constructor(params = {}) {
        this.isStyle = true;
        this.context = new StyleContext();

        params.zoom = params.zoom || {};
        params.fill = params.fill || {};
        params.stroke = params.stroke || {};
        params.point = params.point || {};
        params.text = params.text || {};
        params.icon = params.icon || {};

        this.zoom = {};
        defineStyleProperty(this, 'zoom', 'min', params.zoom.min);
        defineStyleProperty(this, 'zoom', 'max', params.zoom.max);

        this.fill = {};
        defineStyleProperty(this, 'fill', 'color', params.fill.color);
        defineStyleProperty(this, 'fill', 'opacity', params.fill.opacity, 1.0);
        defineStyleProperty(this, 'fill', 'pattern', params.fill.pattern);
        defineStyleProperty(this, 'fill', 'base_altitude', params.fill.base_altitude, baseAltitudeDefault);
        if (params.fill.extrusion_height) {
            defineStyleProperty(this, 'fill', 'extrusion_height', params.fill.extrusion_height);
        }

        this.stroke = {};
        defineStyleProperty(this, 'stroke', 'color', params.stroke.color);
        defineStyleProperty(this, 'stroke', 'opacity', params.stroke.opacity, 1.0);
        defineStyleProperty(this, 'stroke', 'width', params.stroke.width, 1.0);
        defineStyleProperty(this, 'stroke', 'dasharray', params.stroke.dasharray, []);
        defineStyleProperty(this, 'stroke', 'base_altitude', params.stroke.base_altitude, baseAltitudeDefault);

        this.point = {};
        defineStyleProperty(this, 'point', 'color', params.point.color);
        defineStyleProperty(this, 'point', 'line', params.point.line);
        defineStyleProperty(this, 'point', 'opacity', params.point.opacity, 1.0);
        defineStyleProperty(this, 'point', 'radius', params.point.radius, 2.0);
        defineStyleProperty(this, 'point', 'width', params.point.width, 0.0);
        defineStyleProperty(this, 'point', 'base_altitude', params.point.base_altitude, baseAltitudeDefault);
        if (params.point.model) {
            defineStyleProperty(this, 'point', 'model', params.point.model);
        }

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

        this.icon = {};
        defineStyleProperty(this, 'icon', 'source', params.icon.source);
        if (params.icon.key) {
            console.warn("'icon.key' is deprecated: use 'icon.id' instead");
            params.icon.id = params.icon.key;
        }
        defineStyleProperty(this, 'icon', 'id', params.icon.id);
        defineStyleProperty(this, 'icon', 'cropValues', params.icon.cropValues);
        defineStyleProperty(this, 'icon', 'anchor', params.icon.anchor, 'center');
        defineStyleProperty(this, 'icon', 'size', params.icon.size, 1);
        defineStyleProperty(this, 'icon', 'color', params.icon.color);
        defineStyleProperty(this, 'icon', 'opacity', params.icon.opacity, 1.0);
    }

    setContext(ctx) {
        this.context = ctx;
    }

    /**
     * set Style from (geojson-like) properties.
     * @param {Object} properties (geojson-like) properties.
     * @param {FeatureContext} featCtx the context of the feature
     *
     * @returns {StyleOptions} containing all properties for itowns.Style
     */
    static setFromProperties(properties, featCtx) {
        const type = featCtx.type;
        const style = {};
        if (type === FEATURE_TYPES.POINT) {
            const point = {
                ...(properties.fill !== undefined && { color: properties.fill }),
                ...(properties['fill-opacity'] !== undefined && { opacity: properties['fill-opacity'] }),
                ...(properties.stroke !== undefined && { line: properties.stroke }),
                ...(properties.radius !== undefined && { radius: properties.radius }),
            };
            if (Object.keys(point).length) {
                style.point = point;
            }
            const text = {
                ...(properties['label-color'] !== undefined && { color: properties['label-color'] }),
                ...(properties['label-opacity'] !== undefined && { opacity: properties['label-opacity'] }),
                ...(properties['label-size'] !== undefined && { size: properties['label-size'] }),
            };
            if (Object.keys(point).length) {
                style.text = text;
            }
            const icon = {
                ...(properties.icon !== undefined && { source: properties.icon }),
                ...(properties['icon-scale'] !== undefined && { size: properties['icon-scale'] }),
                ...(properties['icon-opacity'] !== undefined && { opacity: properties['icon-opacity'] }),
                ...(properties['icon-color'] !== undefined && { color: properties['icon-color'] }),
            };
            if (Object.keys(icon).length) {
                style.icon = icon;
            }
        } else {
            const stroke = {
                ...(properties.stroke !== undefined && { color: properties.stroke }),
                ...(properties['stroke-width'] !== undefined && { width: properties['stroke-width'] }),
                ...(properties['stroke-opacity'] !== undefined && { opacity: properties['stroke-opacity'] }),
            };
            if (Object.keys(stroke).length) {
                style.stroke = stroke;
            }
            if (type !== FEATURE_TYPES.LINE) {
                const fill = {
                    ...(properties.fill !== undefined && { color: properties.fill }),
                    ...(properties['fill-opacity'] !== undefined && { opacity: properties['fill-opacity'] }),
                };
                if (Object.keys(fill).length) {
                    style.fill = fill;
                }
            }
        }
        return style;
    }

    /**
     * set Style from vector tile layer properties.
     * @param {Object} layer vector tile layer.
     * @param {Object} sprites vector tile layer.
     * @param {Boolean} [symbolToCircle=false]
     *
     * @returns {StyleOptions} containing all properties for itowns.Style
     */
    static setFromVectorTileLayer(layer, sprites, symbolToCircle = false) {
        const style = {
            fill: {},
            stroke: {},
            point: {},
            text: {},
            icon: {},
        };

        layer.layout = layer.layout || {};
        layer.paint = layer.paint || {};

        if (layer.type === 'fill') {
            const { color, opacity } = rgba2rgb(readVectorProperty(layer.paint['fill-color'] || layer.paint['fill-pattern'], { type: 'color' }));
            style.fill.color = color;
            style.fill.opacity = readVectorProperty(layer.paint['fill-opacity']) || opacity;
            if (layer.paint['fill-pattern']) {
                try {
                    style.fill.pattern = {
                        id: layer.paint['fill-pattern'],
                        source: sprites.source,
                        cropValues: sprites[layer.paint['fill-pattern']],
                    };
                } catch (err) {
                    err.message = `VTlayer '${layer.id}': argument sprites must not be null when using layer.paint['fill-pattern']`;
                    throw err;
                }
            }

            if (layer.paint['fill-outline-color']) {
                const { color, opacity } = rgba2rgb(readVectorProperty(layer.paint['fill-outline-color'], { type: 'color' }));
                style.stroke.color = color;
                style.stroke.opacity = opacity;
                style.stroke.width = 1.0;
            } else {
                style.stroke.width  = 0.0;
            }
        } else if (layer.type === 'line') {
            const prepare = readVectorProperty(layer.paint['line-color'], { type: 'color' });
            const { color, opacity } = rgba2rgb(prepare);
            style.stroke.dasharray = readVectorProperty(layer.paint['line-dasharray']);
            style.stroke.color = color;
            style.stroke.lineCap = layer.layout['line-cap'];
            style.stroke.width = readVectorProperty(layer.paint['line-width']);
            style.stroke.opacity = readVectorProperty(layer.paint['line-opacity']) || opacity;
        } else if (layer.type === 'circle' || symbolToCircle) {
            const { color, opacity } = rgba2rgb(readVectorProperty(layer.paint['circle-color'], { type: 'color' }));
            style.point.color = color;
            style.point.opacity = opacity;
            style.point.radius = readVectorProperty(layer.paint['circle-radius']);
        } else if (layer.type === 'symbol') {
            // if symbol we shouldn't draw stroke but defaut value is 1.
            style.stroke.width = 0.0;
            // overlapping order
            style.text.zOrder = readVectorProperty(layer.layout['symbol-z-order']);
            if (style.text.zOrder == 'auto') {
                style.text.zOrder = readVectorProperty(layer.layout['symbol-sort-key']) || 'Y';
            } else if (style.text.zOrder == 'viewport-y') {
                style.text.zOrder = 'Y';
            } else if (style.text.zOrder == 'source') {
                style.text.zOrder = 0;
            }

            // position
            style.text.anchor = readVectorProperty(layer.layout['text-anchor']);
            style.text.offset = readVectorProperty(layer.layout['text-offset']);
            style.text.padding = readVectorProperty(layer.layout['text-padding']);
            style.text.size = readVectorProperty(layer.layout['text-size']);
            style.text.placement = readVectorProperty(layer.layout['symbol-placement']);
            style.text.rotation = readVectorProperty(layer.layout['text-rotation-alignment']);

            // content
            style.text.field = readVectorProperty(layer.layout['text-field']);
            style.text.wrap = readVectorProperty(layer.layout['text-max-width']);// Units ems
            style.text.spacing = readVectorProperty(layer.layout['text-letter-spacing']);
            style.text.transform = readVectorProperty(layer.layout['text-transform']);
            style.text.justify = readVectorProperty(layer.layout['text-justify']);

            // appearance
            const { color, opacity } = rgba2rgb(readVectorProperty(layer.paint['text-color'], { type: 'color' }));
            style.text.color = color;
            style.text.opacity = readVectorProperty(layer.paint['text-opacity']) || (opacity !== undefined && opacity);

            style.text.font = readVectorProperty(layer.layout['text-font']);
            const haloColor = readVectorProperty(layer.paint['text-halo-color'], { type: 'color' });
            if (haloColor) {
                style.text.haloColor = haloColor.color || haloColor;
                style.text.haloWidth = readVectorProperty(layer.paint['text-halo-width']);
                style.text.haloBlur = readVectorProperty(layer.paint['text-halo-blur']);
            }

            // additional icon
            const iconImg = readVectorProperty(layer.layout['icon-image']);
            if (iconImg) {
                const cropValueDefault = {
                    x: 0,
                    y: 0,
                    width: 1,
                    height: 1,
                };
                try {
                    style.icon.id = iconImg;
                    if (iconImg.stops) {
                        const iconCropValue = {
                            ...(iconImg.base !== undefined && { base: iconImg.base }),
                            stops: iconImg.stops.map((stop) => {
                                let cropValues = sprites[stop[1]];
                                if (stop[1].includes('{')) {
                                    cropValues = function _(p) {
                                        const id = stop[1].replace(/\{(.+?)\}/g, (a, b) => (p[b] || '')).trim();
                                        if (cropValues === undefined) {
                                            // const warning = `WARNING: "${id}" not found in sprite file`;
                                            sprites[id] = cropValueDefault;// or return cropValueDefault;
                                        }
                                        return sprites[id];
                                    };
                                } else if (cropValues === undefined) {
                                    // const warning = `WARNING: "${stop[1]}" not found in sprite file`;
                                    cropValues = cropValueDefault;
                                }
                                return [stop[0], cropValues];
                            }),
                        };
                        style.icon.cropValues = iconCropValue;
                    } else {
                        style.icon.cropValues = sprites[iconImg];
                        if (iconImg.includes('{')) {
                            style.icon.cropValues = function _(p) {
                                const id = iconImg.replace(/\{(.+?)\}/g, (a, b) => (p[b] || '')).trim();
                                if (sprites[id] === undefined) {
                                    // const warning = `WARNING: "${id}" not found in sprite file`;
                                    sprites[id] = cropValueDefault;// or return cropValueDefault;
                                }
                                return sprites[id];
                            };
                        } else if (sprites[iconImg] === undefined) {
                            // const warning = `WARNING: "${iconImg}" not found in sprite file`;
                            style.icon.cropValues = cropValueDefault;
                        }
                    }
                    style.icon.source = sprites.source;
                    style.icon.size = readVectorProperty(layer.layout['icon-size']) ?? 1;
                    const { color, opacity } = rgba2rgb(readVectorProperty(layer.paint['icon-color'], { type: 'color' }));
                    // https://docs.mapbox.com/style-spec/reference/layers/#paint-symbol-icon-color
                    if (iconImg.sdf) {
                        style.icon.color = color;
                    }
                    style.icon.opacity = readVectorProperty(layer.paint['icon-opacity']) ?? (opacity !== undefined && opacity);
                } catch (err) {
                    err.message = `VTlayer '${layer.id}': argument sprites must not be null when using layer.layout['icon-image']`;
                    throw err;
                }
            }
        }
        // VectorTileSet: by default minZoom = 0 and maxZoom = 24
        // https://docs.mapbox.com/style-spec/reference/layers/#maxzoom and #minzoom
        // Should be move to layer properties, when (if) one mapBox layer will be considered as several itowns layers.
        // issue https://github.com/iTowns/itowns/issues/2153 (last point)
        style.zoom = {
            min: layer.minzoom || 0,
            max: layer.maxzoom || 24,
        };
        return style;
    }

    /**
     * Applies the style.fill to a polygon of the texture canvas.
     * @param {CanvasRenderingContext2D} txtrCtx The Context 2D of the texture canvas.
     * @param {Path2D} polygon The current texture canvas polygon.
     * @param {Number} invCtxScale The ratio to scale line width and radius circle.
     * @param {Boolean} canBeFilled - true if feature.type == FEATURE_TYPES.POLYGON.
     */
    applyToCanvasPolygon(txtrCtx, polygon, invCtxScale, canBeFilled) {
        // draw line or edge of polygon
        if (this.stroke.width > 0) {
            // TO DO add possibility of using a pattern (https://github.com/iTowns/itowns/issues/2210)
            this._applyStrokeToPolygon(txtrCtx, invCtxScale, polygon);
        }

        // fill inside of polygon
        if (canBeFilled && (this.fill.pattern || this.fill.color)) {
            // canBeFilled can be move to StyleContext in the later PR
            this._applyFillToPolygon(txtrCtx, invCtxScale, polygon);
        }
    }

    _applyStrokeToPolygon(txtrCtx, invCtxScale, polygon) {
        if (txtrCtx.strokeStyle !== this.stroke.color) {
            txtrCtx.strokeStyle = this.stroke.color;
        }
        const width = this.stroke.width * invCtxScale;
        if (txtrCtx.lineWidth !== width) {
            txtrCtx.lineWidth = width;
        }
        const alpha = this.stroke.opacity;
        if (alpha !== txtrCtx.globalAlpha && typeof alpha == 'number') {
            txtrCtx.globalAlpha = alpha;
        }
        if (txtrCtx.lineCap !== this.stroke.lineCap) {
            txtrCtx.lineCap = this.stroke.lineCap;
        }
        txtrCtx.setLineDash(this.stroke.dasharray.map(a => a * invCtxScale * 2));
        txtrCtx.stroke(polygon);
    }

    async _applyFillToPolygon(txtrCtx, invCtxScale, polygon) {
        // if (this.fill.pattern && txtrCtx.fillStyle.src !== this.fill.pattern.src) {
        // need doc for the txtrCtx.fillStyle.src that seems to always be undefined
        if (this.fill.pattern) {
            let img = this.fill.pattern;
            const cropValues = { ...this.fill.pattern.cropValues };
            if (this.fill.pattern.source) {
                img = await loadImage(this.fill.pattern.source);
            }
            cropImage(img, cropValues);

            txtrCtx.fillStyle = txtrCtx.createPattern(canvas, 'repeat');
            if (txtrCtx.fillStyle.setTransform) {
                txtrCtx.fillStyle.setTransform(matrix.scale(invCtxScale));
            } else {
                console.warn('Raster pattern isn\'t completely supported on Ie and edge', txtrCtx.fillStyle);
            }
        } else if (txtrCtx.fillStyle !== this.fill.color) {
            txtrCtx.fillStyle = this.fill.color;
        }
        if (this.fill.opacity !== txtrCtx.globalAlpha) {
            txtrCtx.globalAlpha = this.fill.opacity;
        }
        txtrCtx.fill(polygon);
    }

    /**
     * Applies this style to a DOM element. Limited to the `text` and `icon`
     * properties of this style.
     *
     * @param {Element} domElement - The element to set the style to.
     *
     * @returns {undefined|Promise<HTMLImageElement>}
     *          for a text label: undefined.
     *          for an icon: a Promise resolving with the HTMLImageElement containing the image.
     */
    async applyToHTML(domElement) {
        if (arguments.length > 1) {
            console.warn('Deprecated argument sprites. Sprites must be configured in style.');
        }
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

        if (!this.icon.source) {
            return;
        }

        const icon = document.createElement('img');

        const iconPromise  = new Promise((resolve, reject) => {
            const opt = {
                size: this.icon.size,
                color: this.icon.color,
                opacity: this.icon.opacity,
                anchor: this.icon.anchor,
            };
            icon.onload = () => resolve(_addIcon(icon, domElement, opt));
            icon.onerror = err => reject(err);
        });

        if (!this.icon.cropValues && !this.icon.color) {
            icon.src = this.icon.source;
        } else {
            const cropValues = { ...this.icon.cropValues };
            const color = this.icon.color;
            const id = this.icon.id || this.icon.source;
            const img = await loadImage(this.icon.source);
            const imgd = cropImage(img, cropValues);
            const imgdColored = replaceWhitePxl(imgd, color, id);
            canvas.getContext('2d').putImageData(imgdColored, 0, 0);
            icon.src = canvas.toDataURL('image/png');
        }
        return iconPromise;
    }

    /**
     * Gets the values corresponding to the anchor of the text. It is
     * proportions, to use with a `translate()` and a `transform` property.
     *
     * @return {Number[]} Two percentage values, for x and y respectively.
     */
    getTextAnchorPosition() {
        if (typeof this.text.anchor === 'string') {
            if (Object.keys(textAnchorPosition).includes(this.text.anchor)) {
                return textAnchorPosition[this.text.anchor];
            } else {
                console.error(`${this.text.anchor} is not a valid input for Style.text.anchor parameter.`);
                return textAnchorPosition.center;
            }
        } else {
            return this.text.anchor;
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

if (typeof document !== 'undefined') {
    document.getElementsByTagName('head')[0].appendChild(customStyleSheet);
}

export default Style;
