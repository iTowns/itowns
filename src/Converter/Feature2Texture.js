import * as THREE from 'three';
import { FEATURE_TYPES } from 'Core/Feature';
import Extent from 'Core/Geographic/Extent';
import Coordinates from 'Core/Geographic/Coordinates';

const _extent = new Extent('EPSG:4326', [0, 0, 0, 0]);

function drawPolygon(ctx, vertices, indices = [{ offset: 0, count: 1 }], properties, style = {}, size, extent, invCtxScale) {
    if (vertices.length === 0) {
        return;
    }

    if (style.length) {
        for (const s of style) {
            _drawPolygon(ctx, vertices, indices, properties, s, size, extent, invCtxScale);
        }
    } else {
        _drawPolygon(ctx, vertices, indices, properties, style, size, extent, invCtxScale);
    }
}

function _drawPolygon(ctx, vertices, indices, properties = {}, style, size, extent, invCtxScale) {
    // build contour
    ctx.beginPath();
    for (const indice of indices) {
        if (indice.extent && indice.extent.intersectsExtent(extent)) {
            const offset = indice.offset * size;
            const count = offset + indice.count * size;
            ctx.moveTo(vertices[offset], vertices[offset + 1]);
            for (let j = offset + size; j < count; j += size) {
                ctx.lineTo(vertices[j], vertices[j + 1]);
            }
        }
    }

    // draw line polygon
    if (style.stroke || properties.stroke) {
        strokeStyle(style, properties, ctx, invCtxScale);
        ctx.stroke();
    }

    // fill polygon
    if (style.fill || properties.fill) {
        fillStyle(style, properties, ctx);
        ctx.fill();
    }
}

function fillStyle(style, properties, ctx) {
    const fill = style.fill || properties.fill;
    if (ctx.fillStyle !== fill) {
        ctx.fillStyle = fill;
    }
    const alpha = style.fillOpacity || properties['fill-opacity'] || 1.0;
    if (alpha !== ctx.globalAlpha && typeof alpha == 'number') {
        ctx.globalAlpha = alpha;
    }
}

function strokeStyle(style, properties, ctx, invCtxScale) {
    const stroke = style.stroke || properties.stroke;
    if (ctx.strokeStyle !== stroke) {
        ctx.strokeStyle = stroke;
    }
    const width = Math.round((style.strokeWidth || properties['stroke-width'] || 2.0)) * invCtxScale;
    if (ctx.lineWidth !== width) {
        ctx.lineWidth = width;
    }
    const alpha = style.strokeOpacity || properties['stroke-opacity'] || 1.0;
    if (alpha !== ctx.globalAlpha && typeof alpha == 'number') {
        ctx.globalAlpha = alpha;
    }
}

function drawPoint(ctx, x, y, style = {}, invCtxScale) {
    ctx.beginPath();
    const opacity = style.pointOpacity || 1.0;
    if (opacity !== ctx.globalAlpha) {
        ctx.globalAlpha = opacity;
    }

    ctx.arc(x, y, style.radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = style.fill || 'white';
    ctx.fill();
    ctx.lineWidth = (style.lineWidth || 1.0) * invCtxScale;
    ctx.strokeStyle = style.stroke || 'red';
    ctx.stroke();
}

const coord = new Coordinates('EPSG:4326', 0, 0, 0);

function drawFeature(ctx, feature, extent, style = {}, invCtxScale) {
    const extentDim = extent.dimensions();
    const scaleRadius = extentDim.x / ctx.canvas.width;
    let gStyle = style;
    let px;

    for (const geometry of feature.geometry) {
        if (geometry.extent.intersectsExtent(extent)) {
            const properties = geometry.properties;

            if (typeof (style) == 'function') {
                gStyle = style(properties, feature);
            }

            gStyle.radius = Math.round(gStyle.radius * invCtxScale) || 3 * invCtxScale;

            // cross multiplication to know in the extent system the real size of
            // the point
            px = gStyle.radius * scaleRadius;

            if (feature.type === FEATURE_TYPES.POINT) {
                for (const indice of geometry.indices) {
                    const offset = indice.offset * feature.size;
                    const count = offset + indice.count * feature.size;
                    for (let j = offset; j < count; j += feature.size) {
                        coord.set(extent.crs, feature.vertices[j], feature.vertices[j + 1]);
                        if (extent.isPointInside(coord, px)) {
                            drawPoint(ctx, feature.vertices[j], feature.vertices[j + 1], gStyle, invCtxScale);
                        }
                    }
                }
            } else {
                drawPolygon(ctx, feature.vertices, geometry.indices, properties, gStyle, feature.size, extent, invCtxScale);
            }
        }
    }
}

const origin = new THREE.Vector2();
const dimension = new THREE.Vector2();
const scale = new THREE.Vector2();
const extentTransformed = new Extent('EPSG:4326', 0, 0, 0, 0);

export default {
    // backgroundColor is a THREE.Color to specify a color to fill the texture
    // with, given there is no feature passed in parameter
    createTextureFromFeature(collection, extent, sizeTexture, style, backgroundColor) {
        let texture;

        if (collection) {
            // A texture is instancied drawn canvas
            // origin and dimension are used to transform the feature's coordinates to canvas's space
            extent.dimensions(dimension);
            const c = document.createElement('canvas');

            c.width = sizeTexture;
            c.height = sizeTexture;
            const ctx = c.getContext('2d');
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor.getStyle();
                ctx.fillRect(0, 0, sizeTexture, sizeTexture);
            }
            ctx.globalCompositeOperation = style.globalCompositeOperation || 'source-over';
            ctx.imageSmoothingEnabled = false;

            const ex = collection.crs == extent.crs ? extent : extent.as(collection.crs, _extent);
            const t = collection.translation;
            const s = collection.scale;
            extentTransformed.transformedCopy(t, s, ex);

            scale.set(ctx.canvas.width, ctx.canvas.width).divide(dimension);
            origin.set(extent.west, extent.south).add(t).multiply(scale).negate();
            ctx.setTransform(scale.x / s.x, 0, 0, scale.y / s.y, origin.x, origin.y);

            // to scale line width and radius circle
            const invCtxScale = s.x / scale.x;

            // Draw the canvas
            for (const feature of collection.features) {
                drawFeature(ctx, feature, extentTransformed, style, invCtxScale);
            }

            texture = new THREE.CanvasTexture(c);
            texture.flipY = false;
        } else if (backgroundColor) {
            const data = new Uint8Array(3);
            data[0] = backgroundColor.r * 255;
            data[1] = backgroundColor.g * 255;
            data[2] = backgroundColor.b * 255;
            texture = new THREE.DataTexture(data, 1, 1, THREE.RGBFormat);
            texture.needsUpdate = true;
        } else {
            texture = new THREE.Texture();
        }

        return texture;
    },
};
