import * as THREE from 'three';
import { FEATURE_TYPES } from 'Core/Feature';
import Extent from 'Core/Geographic/Extent';
import Coordinates from 'Core/Geographic/Coordinates';
import Style, { StyleContext } from 'Core/Style';

const defaultStyle = new Style();
const context = new StyleContext();
let style;

/**
 * Draw polygon (contour, line edge and fill) based on feature vertices into canvas
 * using the given style(s). Several styles will re-draws the polygon each one with
 * a different style.
 * @param      {CanvasRenderingContext2D} ctx - canvas' 2D rendering context.
 * @param      {Number[]} vertices - All the vertices of the Feature.
 * @param      {Object[]} indices - Contains the indices that define the geometry.
 * Objects stored in this array have two properties, an `offset` and a `count`.
* The offset is related to the overall number of vertices in the Feature.
 * @param      {Number} size - The size of the feature.
 * @param      {Number} extent - The extent.
 * @param      {Number} invCtxScale - The ration to scale line width and radius circle.
 * @param      {Boolean} canBeFilled - true if feature.type == FEATURE_TYPES.POLYGON
 */
function drawPolygon(ctx, vertices, indices = [{ offset: 0, count: 1 }], size, extent, invCtxScale, canBeFilled) {
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
    style.applyToCanvasPolygon(ctx, path, invCtxScale, canBeFilled);
}

function drawPoint(ctx, x, y, invCtxScale) {
    ctx.beginPath();
    const opacity = style.point.opacity == undefined ? 1.0 : style.point.opacity;
    if (opacity !== ctx.globalAlpha) {
        ctx.globalAlpha = opacity;
    }

    ctx.arc(x, y, (style.point.radius || 3.0) * invCtxScale, 0, 2 * Math.PI, false);
    if (style.point.color) {
        ctx.fillStyle = style.point.color;
        ctx.fill();
    }
    if (style.point.line) {
        ctx.lineWidth = (style.point.width || 1.0) * invCtxScale;
        ctx.strokeStyle = style.point.line;
        ctx.stroke();
    }
}

const coord = new Coordinates('EPSG:4326', 0, 0, 0);

function drawFeature(ctx, feature, extent, invCtxScale) {
    const extentDim = extent.planarDimensions();
    const scaleRadius = extentDim.x / ctx.canvas.width;

    for (const geometry of feature.geometries) {
        if (Extent.intersectsExtent(geometry.extent, extent)) {
            context.setGeometry(geometry);
            if (style.zoom.min > style.context.zoom || style.zoom.max <= style.context.zoom) {
                return;
            }

            if (
                feature.type === FEATURE_TYPES.POINT && style.point
            ) {
                // cross multiplication to know in the extent system the real size of
                // the point
                const px = (Math.round(style.point.radius * invCtxScale) || 3 * invCtxScale) * scaleRadius;
                for (const indice of geometry.indices) {
                    const offset = indice.offset * feature.size;
                    const count = offset + indice.count * feature.size;
                    for (let j = offset; j < count; j += feature.size) {
                        coord.setFromArray(feature.vertices, j);
                        if (extent.isPointInside(coord, px)) {
                            drawPoint(ctx, feature.vertices[j], feature.vertices[j + 1], invCtxScale);
                        }
                    }
                }
            } else {
                drawPolygon(ctx, feature.vertices, geometry.indices, feature.size, extent, invCtxScale, (feature.type == FEATURE_TYPES.POLYGON));
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
    createTextureFromFeature(collection, extent, sizeTexture, layerStyle, backgroundColor) {
        style = layerStyle || defaultStyle;
        style.setContext(context);
        let texture;

        if (collection) {
            // A texture is instancied drawn canvas
            // origin and dimension are used to transform the feature's coordinates to canvas's space
            extent.planarDimensions(dimension);
            const c = document.createElement('canvas');

            coord.crs = extent.crs;

            c.width = sizeTexture;
            c.height = sizeTexture;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor.getStyle();
                ctx.fillRect(0, 0, sizeTexture, sizeTexture);
            }

            // Documentation needed !!
            ctx.globalCompositeOperation = layerStyle.globalCompositeOperation || 'source-over';
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

            context.setZoom(extent.zoom);

            // Draw the canvas
            for (const feature of collection.features) {
                context.setFeature(feature);
                drawFeature(ctx, feature, featureExtent, invCtxScale);
            }

            texture = new THREE.CanvasTexture(c);
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
