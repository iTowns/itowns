import { FEATURE_TYPES } from 'Core/Feature';
import * as maplibre from '@maplibre/maplibre-gl-style-spec';

/**
 * An object that can contain any properties (zoom, fill, stroke, point,
 * text or/and icon) and sub properties of a Style.
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
 * generate a StyleOptions from (geojson-like) properties.
 * @param {Object} properties (geojson-like) properties.
 * @param {FeatureContext} featCtx the context of the feature
 *
 * @returns {StyleOptions} containing all properties for itowns.Style
 */
function setFromProperties(properties, featCtx) {
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

function readVectorProperty(property, options) {
    if (property != undefined) {
        if (maplibre.expression.isExpression(property)) {
            return maplibre.expression.createExpression(property, options).value;
        } else {
            return property;
        }
    }
}

const inv255 = 1 / 255;

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

/**
 * generate a StyleOptions from vector tile layer properties.
 * @param {Object} layer vector tile layer.
 * @param {Object} sprites vector tile layer.
 * @param {Boolean} [symbolToCircle=false]
 *
 * @returns {StyleOptions} containing all properties for itowns.Style
 */
function setFromVectorTileLayer(layer, sprites, symbolToCircle = false) {
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

export default {
    setFromProperties,
    setFromVectorTileLayer,
};
