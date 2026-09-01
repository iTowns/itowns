import * as THREE from 'three';
import { FEATURE_TYPES } from 'Core/Feature';
import { Extent, Coordinates } from '@itowns/geographic';
import Style, { StyleContext, loadImage, cropImage } from 'Core/Style';
import { createContext2D, sharedContext2D } from 'Utils/CanvasUtils';


const defaultStyle = new Style();
const context = new StyleContext();
let /** @type {SVGMatrix | undefined} */_matrix;
function matrix() {
    if (!_matrix) {
        _matrix = document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGMatrix();
    }
    return _matrix;
}

export function applyStrokeStyle(
    /** @type {CanvasRenderingContext2D} */ctx,
    /** @type {object} */stroke,
    /** @type {number} */scale,
) {
    const { color, width = 1.0, opacity = 1.0, lineCap = 'butt', dasharray = [] } = stroke;
    if (ctx.strokeStyle !== color) {
        ctx.strokeStyle = color;
    }
    const lineWidth = width * scale;
    if (ctx.lineWidth !== lineWidth) {
        ctx.lineWidth = lineWidth;
    }
    if (opacity !== ctx.globalAlpha) {
        ctx.globalAlpha = opacity;
    }
    if (ctx.lineCap !== lineCap) {
        ctx.lineCap = lineCap;
    }
    ctx.setLineDash(dasharray.map(a => a * scale * 2));
}

async function createPattern(
    /** @type {CanvasRenderingContext2D} */ctx,
    /** @type {object} */ pattern,
) {
    if (typeof pattern == 'object' && 'source' in pattern) { // ImageRegion
        const { source, cropValues = {} } = pattern;
        const img = await loadImage(source);
        const {
            x = 0,
            y = 0,
            width = 'naturalWidth' in img ? img.naturalWidth : img.width,
            height = 'naturalHeight' in img ? img.naturalHeight : img.height,
        } = cropValues;

        const cropCtx = sharedContext2D();
        cropCtx.canvas.width = width;
        cropCtx.canvas.height = height;
        cropImage(cropCtx, img, x, y, width, height);
        return ctx.createPattern(cropCtx.canvas, 'repeat');
    } else { // string | HTMLImageElement | HTMLCanvasElement
        const img = await loadImage(pattern);
        const drawCtx = sharedContext2D();
        drawCtx.canvas.width = 'naturalWidth' in img ? img.naturalWidth : img.width;
        drawCtx.canvas.height = 'naturalHeight' in img ? img.naturalHeight : img.height;
        drawCtx.drawImage(img, 0, 0);
        return ctx.createPattern(drawCtx.canvas, 'repeat');
    }
}

export async function applyFillStyle(
    /** @type {CanvasRenderingContext2D} */ctx,
    /** @type {object} */fill,
    /** @type {number} */scale,
) {
    const { opacity = 1.0, pattern, color } = fill;
    if (typeof pattern === 'object') {
        const fillStyle = /** @type {CanvasPattern} */(await createPattern(ctx, pattern));
        fillStyle.setTransform(matrix().scale(scale));
        ctx.fillStyle = fillStyle;
    } else if (typeof color === 'string' && ctx.fillStyle !== color) {
        ctx.fillStyle = color;
    }
    if (opacity !== ctx.globalAlpha) {
        ctx.globalAlpha = opacity;
    }
}

export function applyPointStyle(
    /** @type {CanvasRenderingContext2D} */ctx,
    /** @type {object} */point,
    /** @type {number} */scale,
) {
    const { color, line, width = 1.0, opacity = 1.0 } = point;
    if (color) {
        if (ctx.fillStyle !== color) {
            ctx.fillStyle = color;
        }
    }
    if (line) {
        const lineWidth = width * scale;
        if (ctx.lineWidth !== lineWidth) {
            ctx.lineWidth = lineWidth;
        }
        if (ctx.strokeStyle !== line) {
            ctx.strokeStyle = line;
        }
    }
    if (ctx.globalAlpha !== opacity) {
        ctx.globalAlpha = opacity;
    }
}

/**
 * Draw polygon (contour, line edge and fill) based on feature vertices into canvas
 * using the given style(s). Several styles will re-draws the polygon each one with
 * a different style.
 * @param      {CanvasRenderingContext2D} ctx - canvas' 2D rendering context.
 * @param      {Feature} feature - The feature containing vertices to draw.
 * @param      {FeatureGeometry} geometry - The geometry whose indices define the polygon.
 * @param      {object} style - The style to apply for this feature.
 * @param      {Extent} extent - The extent.
 * @param      {number} invCtxScale - The ration to scale line width and radius circle.
 */
export function drawPolygon(
    ctx,
    feature,
    geometry,
    style,
    extent,
    invCtxScale,
) {
    const { vertices, size } = feature;
    const { indices = [{ offset: 0, count: 1 }] } = geometry;
    if (vertices.length === 0) {
        return;
    }
    // build contour
    const path = new Path2D();

    for (const indice of indices) {
        if (indice.extent && Extent.intersectsExtent(indice.extent, extent)) {
            const offset = indice.offset * size;
            const count = offset + indice.count * size;
            path.moveTo(vertices[offset], vertices[offset + 1]);
            for (let j = offset + size; j < count; j += size) {
                path.lineTo(vertices[j], vertices[j + 1]);
            }
        }
    }

    const { stroke, fill } = style;

    if (stroke && stroke.width > 0) {
        // TO DO add possibility of using a pattern (https://github.com/iTowns/itowns/issues/2210)
        applyStrokeStyle(ctx, stroke, invCtxScale);
        ctx.stroke(path);
    }

    if (feature.type == FEATURE_TYPES.POLYGON && fill && (fill.pattern || fill.color)) {
        applyFillStyle(ctx, fill, invCtxScale);
        ctx.fill(path);
    }
}

const coord = new Coordinates('EPSG:4326', 0, 0, 0);

/**
 * Draw points based on feature vertices into canvas using the given style.
 * @param      {CanvasRenderingContext2D} ctx - canvas' 2D rendering context.
 * @param      {Feature} feature - The feature containing vertices to draw.
 * @param      {FeatureGeometry} geometry - The geometry whose indices define the points.
 * @param      {object} style - The style to apply for this feature.
 * @param      {Extent} extent - The extent.
 * @param      {number} invCtxScale - The ration to scale line width and radius circle.
 * @param      {number} scaleRadius - Extent-to-canvas scale for the point size in extent space.
 */
export function drawPoint(
    ctx,
    feature,
    geometry,
    style,
    extent,
    invCtxScale,
    scaleRadius,
) {
    const { vertices, size } = feature;
    const { indices = [{ offset: 0, count: 1 }] } = geometry;
    if (vertices.length === 0) {
        return;
    }
    const { point } = style;
    const { color, line, radius = 3.0 } = point;
    applyPointStyle(ctx, point, invCtxScale);

    // cross multiplication to know in the extent system the real size of
    // the point
    const px = Math.round(radius * invCtxScale) * scaleRadius;
    for (const indice of indices) {
        const offset = indice.offset * size;
        const count = offset + indice.count * size;
        for (let j = offset; j < count; j += size) {
            coord.setFromArray(vertices, j);
            if (extent.isPointInside(coord, px)) {
                ctx.beginPath();
                ctx.arc(vertices[j], vertices[j + 1], radius * invCtxScale, 0, 2 * Math.PI, false);
                if (color) {
                    ctx.fill();
                }
                if (line) {
                    ctx.stroke();
                }
            }
        }
    }
}

export function drawFeature(ctx, feature, style, extent, invCtxScale, zoom) {
    const extentDim = extent.planarDimensions();
    const scaleRadius = extentDim.x / ctx.canvas.width;

    for (const geometry of feature.geometries) {
        if (geometry.extent && Extent.intersectsExtent(geometry.extent, extent)) {
            context.setGeometry(geometry);

            const { min = 0, max = Infinity } = style.zoom;
            if (min > zoom || max <= zoom) {
                return;
            }

            if (feature.type === FEATURE_TYPES.POINT && style.point) {
                drawPoint(ctx, feature, geometry, style, extent, invCtxScale, scaleRadius);
            } else {
                drawPolygon(ctx, feature, geometry, style, extent, invCtxScale);
            }
        }
    }
}

const origin = new THREE.Vector3();
const dimension = new THREE.Vector3(0, 0, 1);
const scale = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const world2texture = new THREE.Matrix4();
const feature2texture = new THREE.Matrix4();
const worldTextureOrigin = new THREE.Vector3();

const featureExtent = new Extent('EPSG:4326', 0, 0, 0, 0);

export default {
    // backgroundColor is a THREE.Color to specify a color to fill the texture
    // with, given there is no feature passed in parameter
    createTextureFromFeature(collection, extent, zoom, sizeTexture, layerStyle, backgroundColor) {
        const style = layerStyle ?? defaultStyle;
        style.setContext(context);
        let texture;

        if (collection) {
            // A texture is instancied drawn canvas
            // origin and dimension are used to transform the feature's coordinates to canvas's space
            extent.planarDimensions(dimension);
            coord.crs = extent.crs;

            const ctx = createContext2D(sizeTexture, sizeTexture);
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor.getStyle();
                ctx.fillRect(0, 0, sizeTexture, sizeTexture);
            }

            // Documentation needed !!
            ctx.globalCompositeOperation = style.globalCompositeOperation || 'source-over';
            ctx.imageSmoothingEnabled = false;
            ctx.lineJoin = 'round';

            // transform extent to feature projection
            extent.as(collection.crs, featureExtent);
            // transform extent to local system
            featureExtent.applyMatrix4(collection.matrixWorldInverse);

            // compute matrix transformation `world2texture` to convert coordinates to texture coordinates
            if (collection.isInverted) {
                worldTextureOrigin.set(extent.west, extent.north, 0);
                scale.set(ctx.canvas.width, -ctx.canvas.height, 1.0).divide(dimension);
            } else {
                worldTextureOrigin.set(extent.west, extent.south, 0);
                scale.set(ctx.canvas.width, ctx.canvas.height, 1.0).divide(dimension);
            }

            world2texture.compose(worldTextureOrigin.multiply(scale).negate(), quaternion, scale);

            // compute matrix transformation `feature2texture` to convert features coordinates to texture coordinates
            feature2texture.multiplyMatrices(world2texture, collection.matrixWorld);
            feature2texture.decompose(origin, quaternion, scale);

            ctx.setTransform(scale.x, 0, 0, scale.y, origin.x, origin.y);

            // to scale line width and radius circle
            const invCtxScale = Math.abs(1 / scale.x);

            context.setZoom(zoom);

            // Draw the canvas
            for (const feature of collection.features) {
                context.setFeature(feature);
                drawFeature(ctx, feature, style, featureExtent, invCtxScale, zoom);
            }

            texture = new THREE.CanvasTexture(ctx.canvas);
            texture.flipY = collection.isInverted;
        } else if (backgroundColor) {
            const data = new Uint8Array(3);
            data[0] = backgroundColor.r * 255;
            data[1] = backgroundColor.g * 255;
            data[2] = backgroundColor.b * 255;
            texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
        } else {
            texture = new THREE.Texture();
        }

        return texture;
    },
};
