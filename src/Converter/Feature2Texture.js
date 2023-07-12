import * as THREE from 'three';
import { FEATURE_TYPES } from 'Core/Feature';
import Extent from 'Core/Geographic/Extent';
import Coordinates from 'Core/Geographic/Coordinates';

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
const matrix = svg.createSVGMatrix();

function drawPolygon(ctx, vertices, indices = [{ offset: 0, count: 1 }], style = {}, size, extent, invCtxScale, canBeFilled) {
    if (vertices.length === 0) {
        return;
    }

    if (style.length) {
        for (const s of style) {
            _drawPolygon(ctx, vertices, indices, s, size, extent, invCtxScale, canBeFilled);
        }
    } else {
        _drawPolygon(ctx, vertices, indices, style, size, extent, invCtxScale, canBeFilled);
    }
}

function _drawPolygon(ctx, vertices, indices, style, size, extent, invCtxScale, canBeFilled) {
    // build contour
    ctx.beginPath();
    for (const indice of indices) {
        if (indice.extent && Extent.intersectsExtent(indice.extent, extent)) {
            const offset = indice.offset * size;
            const count = offset + indice.count * size;
            ctx.moveTo(vertices[offset], vertices[offset + 1]);
            for (let j = offset + size; j < count; j += size) {
                ctx.lineTo(vertices[j], vertices[j + 1]);
            }
        }
    }

    // draw line or edge of polygon
    if (style.stroke) {
        strokeStyle(style, ctx, invCtxScale);
        ctx.stroke();
    }

    // fill polygon only
    if (canBeFilled && style.fill) {
        fillStyle(style, ctx, invCtxScale);
        ctx.fill();
    }
}

function fillStyle(style, ctx, invCtxScale) {
    if (style.fill.pattern && ctx.fillStyle.src !== style.fill.pattern.src) {
        ctx.fillStyle = ctx.createPattern(style.fill.pattern, 'repeat');
        if (ctx.fillStyle.setTransform) {
            ctx.fillStyle.setTransform(matrix.scale(invCtxScale));
        } else {
            console.warn('Raster pattern isn\'t completely supported on Ie and edge');
        }
    } else if (ctx.fillStyle !== style.fill.color) {
        ctx.fillStyle = style.fill.color;
    }
    if (style.fill.opacity !== ctx.globalAlpha) {
        ctx.globalAlpha = style.fill.opacity;
    }
}

function strokeStyle(style, ctx, invCtxScale) {
    if (ctx.strokeStyle !== style.stroke.color) {
        ctx.strokeStyle = style.stroke.color;
    }
    const width = (style.stroke.width || 2.0) * invCtxScale;
    if (ctx.lineWidth !== width) {
        ctx.lineWidth = width;
    }
    const alpha = style.stroke.opacity == undefined ? 1.0 : style.stroke.opacity;
    if (alpha !== ctx.globalAlpha && typeof alpha == 'number') {
        ctx.globalAlpha = alpha;
    }
    if (ctx.lineCap !== style.stroke.lineCap) {
        ctx.lineCap = style.stroke.lineCap;
    }
    ctx.setLineDash(style.stroke.dasharray.map(a => a * invCtxScale * 2));
}

function drawPoint(ctx, x, y, style = {}, invCtxScale) {
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

function drawFeature(ctx, feature, extent, style, invCtxScale) {
    const extentDim = extent.planarDimensions();
    const scaleRadius = extentDim.x / ctx.canvas.width;
    const globals = { zoom: extent.zoom };

    for (const geometry of feature.geometries) {
        if (Extent.intersectsExtent(geometry.extent, extent)) {
            const context = { globals, properties: () => geometry.properties };
            const contextStyle = (geometry.properties.style || style).drawingStylefromContext(context);

            if (contextStyle) {
                if (
                    feature.type === FEATURE_TYPES.POINT
                    && contextStyle.point
                ) {
                    // cross multiplication to know in the extent system the real size of
                    // the point
                    const px = (Math.round(contextStyle.point.radius * invCtxScale) || 3 * invCtxScale) * scaleRadius;
                    for (const indice of geometry.indices) {
                        const offset = indice.offset * feature.size;
                        const count = offset + indice.count * feature.size;
                        for (let j = offset; j < count; j += feature.size) {
                            coord.setFromArray(feature.vertices, j);
                            if (extent.isPointInside(coord, px)) {
                                drawPoint(ctx, feature.vertices[j], feature.vertices[j + 1], contextStyle, invCtxScale);
                            }
                        }
                    }
                } else {
                    drawPolygon(ctx, feature.vertices, geometry.indices, contextStyle, feature.size, extent, invCtxScale, (feature.type == FEATURE_TYPES.POLYGON));
                }
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
    createTextureFromFeature(collection, extent, sizeTexture, style = {}, backgroundColor) {
        let texture;

        if (collection) {
            // A texture is instancied drawn canvas
            // origin and dimension are used to transform the feature's coordinates to canvas's space
            extent.planarDimensions(dimension);
            const c = document.createElement('canvas');

            coord.crs = extent.crs;

            c.width = sizeTexture;
            c.height = sizeTexture;
            const ctx = c.getContext('2d');
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor.getStyle();
                ctx.fillRect(0, 0, sizeTexture, sizeTexture);
            }
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

            // Draw the canvas
            for (const feature of collection.features) {
                drawFeature(ctx, feature, featureExtent, feature.style || style, invCtxScale);
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
