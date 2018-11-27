import * as THREE from 'three';

const pt = new THREE.Vector2();

function _moveTo(ctx, x, y, scale, origin) {
    pt.x = x - origin.x;
    pt.y = y - origin.y;
    pt.multiply(scale);
    ctx.moveTo(Math.round(pt.x), Math.round(pt.y));
}

function _lineTo(ctx, x, y, scale, origin) {
    pt.x = x - origin.x;

    pt.y = y - origin.y;
    pt.multiply(scale);
    ctx.lineTo(Math.round(pt.x), Math.round(pt.y));
}

function drawPolygon(ctx, vertices, indices = [{ offset: 0, count: 1 }], origin, scale, properties, style = {}, size) {
    if (vertices.length === 0) {
        return;
    }

    if (style.length) {
        for (const s of style) {
            _drawPolygon(ctx, vertices, indices, origin, scale, properties, s, size);
        }
    } else {
        _drawPolygon(ctx, vertices, indices, origin, scale, properties, style, size);
    }
}

function _drawPolygon(ctx, vertices, indices, origin, scale, properties = {}, style, size) {
    // build contour
    ctx.beginPath();
    for (const indice of indices) {
        const offset = indice.offset * size;
        const count = offset + indice.count * size;
        _moveTo(ctx, vertices[offset], vertices[offset + 1], scale, origin);
        for (let j = offset + size; j < count; j += size) {
            _lineTo(ctx, vertices[j], vertices[j + 1], scale, origin);
        }
    }

    // draw line polygon
    if (style.stroke || properties.stroke) {
        ctx.strokeStyle = style.stroke || properties.stroke;
        ctx.lineWidth = style.strokeWidth || properties['stroke-width'] || 2.0;
        ctx.globalAlpha = style.strokeOpacity || properties['stroke-opacity'] || 1.0;
        ctx.stroke();
    }

    // fill polygon
    if (indices && (style.fill || properties.fill)) {
        ctx.fillStyle = style.fill || properties.fill;
        ctx.globalAlpha = style.fillOpacity || properties['fill-opacity'] || 1.0;
        ctx.fill();
    }
}

function drawPoint(ctx, x, y, origin, scale, style = {}) {
    pt.x = x - origin.x;
    pt.y = y - origin.y;
    pt.multiply(scale);

    ctx.beginPath();
    ctx.arc(Math.round(pt.x), Math.round(pt.y), Math.round(style.radius) || 3, 0, 2 * Math.PI, false);
    ctx.fillStyle = style.fill || 'white';
    ctx.fill();
    ctx.lineWidth = style.lineWidth || 1.0;
    ctx.strokeStyle = style.stroke || 'red';
    ctx.stroke();
}

function drawFeature(ctx, feature, origin, scale, extent, style = {}) {
    let gStyle = style;
    for (const geometry of feature.geometry) {
        const properties = geometry.properties;

        if (typeof (style) == 'function') {
            gStyle = style(properties, feature);
        }
        if (feature.type === 'point') {
            drawPoint(ctx, feature.vertices[0], feature.vertices[1], origin, scale, gStyle);
        } else if (feature.type === 'multipoint') {
            for (var i = 0; i < feature.vertices.length; i += feature.size) {
                drawPoint(ctx, feature.vertices[i], feature.vertices[i + 1], origin, scale, gStyle);
            }
        } else if (geometry.extent.intersectsExtent(extent)) {
            drawPolygon(ctx, feature.vertices, geometry.indices, origin, scale, properties, gStyle, feature.size);
        }
    }
}

export default {
    // backgroundColor is a THREE.Color to specify a color to fill the texture
    // with, given there is no feature passed in parameter
    createTextureFromFeature(collection, extent, sizeTexture, style, backgroundColor) {
        let texture;

        if (collection) {
            // A texture is instancied drawn canvas
            // origin and dimension are used to transform the feature's coordinates to canvas's space
            const origin = new THREE.Vector2(extent.west(), extent.south());
            const dimension = extent.dimensions();
            const c = document.createElement('canvas');

            c.width = sizeTexture;
            c.height = sizeTexture;
            const ctx = c.getContext('2d');
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor.getStyle();
                ctx.fillRect(0, 0, sizeTexture, sizeTexture);
            }
            ctx.globalCompositeOperation = style.globalCompositeOperation || 'source-over';

            const scale = new THREE.Vector2(ctx.canvas.width / dimension.x, ctx.canvas.width / dimension.y);

            // Draw the canvas
            for (const feature of collection.features) {
                const ex = feature.crs == extent.crs() ? extent : extent.as(feature.crs);
                drawFeature(ctx, feature, origin, scale, ex, style);
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

