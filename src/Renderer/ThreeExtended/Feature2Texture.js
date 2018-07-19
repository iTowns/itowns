import * as THREE from 'three';

const pt = new THREE.Vector2();

function _moveTo(ctx, coord, scale, origin) {
    pt.x = coord._values[0] - origin.x;
    pt.y = coord._values[1] - origin.y;
    pt.multiply(scale);
    ctx.moveTo(pt.x, pt.y);
}

function _lineTo(ctx, coord, scale, origin) {
    pt.x = coord._values[0] - origin.x;
    pt.y = coord._values[1] - origin.y;
    pt.multiply(scale);
    ctx.lineTo(pt.x, pt.y);
}

function drawPolygon(ctx, vertices, indices, origin, scale, properties, style = {}) {
    if (vertices.length === 0) {
        return;
    }

    if (style.length) {
        for (const s of style) {
            _drawPolygon(ctx, vertices, indices, origin, scale, properties, s);
        }
    } else {
        _drawPolygon(ctx, vertices, indices, origin, scale, properties, style);
    }
}

function _drawPolygon(ctx, vertices, indices, origin, scale, properties, style) {
    // build contour
    ctx.beginPath();
    for (const indice of indices) {
        _moveTo(ctx, vertices[indice.offset], scale, origin);
        for (let j = 1; j < indice.count; j++) {
            _lineTo(ctx, vertices[indice.offset + j], scale, origin);
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

function drawPoint(ctx, vertice, origin, scale, style = {}) {
    pt.x = vertice._values[0] - origin.x;
    pt.y = vertice._values[1] - origin.y;
    pt.multiply(scale);

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, style.radius || 3, 0, 2 * Math.PI, false);
    ctx.fillStyle = style.fill || 'white';
    ctx.fill();
    ctx.lineWidth = style.lineWidth || 1.0;
    ctx.strokeStyle = style.stroke || 'red';
    ctx.stroke();
}

function drawFeature(ctx, feature, origin, scale, extent, style = {}) {
    const properties = feature.properties;

    if (typeof (style) == 'function') {
        style = style(properties, feature);
    }

    for (const geometry of feature.geometry) {
        if (feature.type === 'point') {
            drawPoint(ctx, feature.vertices[0], origin, scale, style);
        } else if (geometry.extent.intersectsExtent(extent)) {
            drawPolygon(ctx, feature.vertices, geometry.indices, origin, scale, properties, style);
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
                drawFeature(ctx, feature, origin, scale, extent, style);
            }

            texture = new THREE.Texture(c);
            texture.flipY = false;
            texture.generateMipmaps = false;
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearFilter;
            texture.needsUpdate = true;
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

