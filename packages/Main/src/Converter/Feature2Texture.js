import * as THREE from 'three';
import { FEATURE_TYPES } from 'Core/Feature';
import { Extent, Coordinates } from '@itowns/geographic';
import Style, { StyleContext, loadImage, cropImage } from 'Core/Style';
import { createContext2D, sharedContext2D } from 'Utils/CanvasUtils';

let _matrix;
function matrix() {
    if (!_matrix) {
        _matrix = document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGMatrix();
    }
    return _matrix;
}

export function applyStrokeToPolygon(
    /** @type {CanvasRenderingContext2D} */context,
    /** @type {Path2D} */polygon,
    stroke,
    /** @type {number} */scale,
) {
    if (context.strokeStyle !== stroke.color) {
        context.strokeStyle = stroke.color;
    }
    const width = stroke.width * scale;
    if (context.lineWidth !== width) {
        context.lineWidth = width;
    }
    const alpha = stroke.opacity;
    if (alpha !== context.globalAlpha && typeof alpha == 'number') {
        context.globalAlpha = alpha;
    }
    if (context.lineCap !== stroke.lineCap) {
        context.lineCap = stroke.lineCap;
    }
    context.setLineDash(stroke.dasharray.map(a => a * scale * 2));
    context.stroke(polygon);
}

async function createPattern(
    /** @type {CanvasRenderingContext2D} */context,
    pattern,
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
        return context.createPattern(cropCtx.canvas, 'repeat');
    } else { // string | HTMLImageElement | HTMLCanvasElement
        const img = await loadImage(pattern);
        context.drawImage(img, 0, 0);
    }
    return context.createPattern(context.canvas, 'repeat');
}

export async function applyFillToPolygon(
    /** @type {CanvasRenderingContext2D} */context,
    /** @type {Path2D} */polygon,
    fill,
    /** @type {number} */scale,
) {
    if (fill.pattern) {
        const fillStyle = await createPattern(context, fill.pattern); // by image already loaded
        fillStyle.setTransform(matrix().scale(scale));
        context.fillStyle = fillStyle;
    } else if (context.fillStyle !== fill.color) {
        context.fillStyle = fill.color;
    }
    if (fill.opacity !== context.globalAlpha) {
        context.globalAlpha = fill.opacity;
    }
    context.fill(polygon);
}

const defaultStyle = new Style();
const context = new StyleContext();

/**
 * Draw polygon (contour, line edge and fill) based on feature vertices into canvas
 * using the given style(s). Several styles will re-draws the polygon each one with
 * a different style.
 * @param      {CanvasRenderingContext2D} ctx - canvas' 2D rendering context.
 * @param      {number[]} vertices - All the vertices of the Feature.
 * @param      {object[]} indices - Contains the indices that define the geometry.
 * Objects stored in this array have two properties, an `offset` and a `count`.
 * The offset is related to the overall number of vertices in the Feature.
 * @param      {object} style - The style to apply for this feature.
 * @param      {number} size - The size of the feature.
 * @param      {number} extent - The extent.
 * @param      {number} invCtxScale - The ration to scale line width and radius circle.
 * @param      {boolean} canBeFilled - true if feature.type == FEATURE_TYPES.POLYGON
 */
function drawPolygon(
    ctx,
    vertices,
    indices = [{ offset: 0, count: 1 }],
    size,
    style,
    extent,
    invCtxScale,
    canBeFilled,
) {
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
        applyStrokeToPolygon(ctx, path, stroke, invCtxScale);
    }

    if (canBeFilled && fill && (fill.pattern || fill.color)) {
        applyFillToPolygon(ctx, path, fill, invCtxScale);
    }
}

function drawPoint(
    /** @type {CanvasRenderingContext2D} */ctx,
    /** @type {number} */x,
    /** @type {number} */y,
    point,
    /** @type {number} */scale,
) {
    const { color, radius = 3.0, line, width = 1.0, opacity = 1.0 } = point;

    ctx.beginPath();
    ctx.arc(x, y, radius * scale, 0, 2 * Math.PI, false);

    if (opacity !== ctx.globalAlpha) {
        ctx.globalAlpha = opacity;
    }
    if (color) {
        ctx.fillStyle = color;
        ctx.fill();
    }
    if (line) {
        ctx.lineWidth = width * scale;
        ctx.strokeStyle = line;
        ctx.stroke();
    }
}

const coord = new Coordinates('EPSG:4326', 0, 0, 0);

function drawFeature(
    /** @type {CanvasRenderingContext2D} */ctx,
    /** @type {Feature} */feature,
    style,
    /** @type {Extent} */extent,
    /** @type {number} */invCtxScale,
) {
    const extentDim = extent.planarDimensions();
    const scaleRadius = extentDim.x / ctx.canvas.width;
    const { zoom } = style;
    const { min = 0, max = Infinity } = zoom;

    for (const geometry of feature.geometries) {
        if (geometry.extent && Extent.intersectsExtent(geometry.extent, extent)) {
            context.setGeometry(geometry);
            if (min > style.context.zoom || max <= style.context.zoom) {
                return;
            }

            if (feature.type === FEATURE_TYPES.POINT && style.point) {
                const { radius = 3.0 } = style.point;
                // cross multiplication to know in the extent system the real size of
                // the point
                const px = Math.round(radius * invCtxScale) * scaleRadius;
                for (const indice of geometry.indices) {
                    const offset = indice.offset * feature.size;
                    const count = offset + indice.count * feature.size;
                    for (let j = offset; j < count; j += feature.size) {
                        coord.setFromArray(feature.vertices, j);
                        if (extent.isPointInside(coord, px)) {
                            drawPoint(ctx, feature.vertices[j], feature.vertices[j + 1], style.point, invCtxScale);
                        }
                    }
                }
            } else {
                drawPolygon(ctx, feature.vertices, geometry.indices, feature.size, style, extent, invCtxScale, (feature.type == FEATURE_TYPES.POLYGON));
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
    createTextureFromFeature(
        /** @type {FeatureCollection | null} */collection,
        /** @type {Extent} */extent,
        /** @type {number} */zoom,
        /** @type {number} */sizeTexture,
        /** @type {object} */layerStyle,
        /** @type {THREE.Color} */backgroundColor,
    ) {
        const style = layerStyle ?? defaultStyle;
        style.setContext(context);
        let /** @type {THREE.Texture} */texture;

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
                drawFeature(ctx, feature, style, featureExtent, invCtxScale);
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
