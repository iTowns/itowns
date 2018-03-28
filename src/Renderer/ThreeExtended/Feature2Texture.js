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

function drawPolygon(ctx, vertices, contour, holes, origin, scale, properties, style = {}) {
    if (vertices.length === 0) {
        return;
    }
    // build contour
    ctx.beginPath();
    if (contour) {
        _moveTo(ctx, vertices[contour.offset], scale, origin);
        for (let i = 1; i < contour.count; i++) {
            _lineTo(ctx, vertices[contour.offset + i], scale, origin);
        }
    } else {
        // linestring
        _moveTo(ctx, vertices[0], scale, origin);
        for (let i = 1; i < vertices.length; i++) {
            _lineTo(ctx, vertices[i], scale, origin);
        }
    }

    // holes
    if (contour && holes) {
        for (const hole of holes) {
            // ctx.beginPath();
            _moveTo(ctx, vertices[hole.offset], scale, origin);
            for (let i = 1; i < hole.count; i++) {
                _lineTo(ctx, vertices[hole.offset + i], scale, origin);
            }
            ctx.closePath();
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
    if (contour && (style.fill || properties.fill)) {
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

function _drawFeatureGeometry(ctx, feature, geometry, origin, scale, extent, style) {
    const properties = feature.properties;
    if (geometry.type === 'point') {
        drawPoint(ctx, geometry.vertices[0], origin, scale, style);
    } else if (geometry.extent.intersectsExtent(extent)) {
        drawPolygon(ctx, geometry.vertices, geometry.contour, geometry.holes, origin, scale, properties, style);
    }
}

function drawFeature(ctx, feature, origin, scale, extent, style = {}) {
    if (Array.isArray(feature.geometry)) {
        for (let i = 0; i < feature.geometry.length; i++) {
            _drawFeatureGeometry(ctx, feature, feature.geometry[i], origin, scale, extent, style);
        }
    } else {
        _drawFeatureGeometry(ctx, feature, feature.geometry, origin, scale, extent, style);
    }
}

export default {
    createTextureFromFeature(features, extent, sizeTexture, style) {
        // A texture is instancied drawn canvas
        // origin and dimension are used to transform the feature's coordinates to canvas's space
        const origin = new THREE.Vector2(extent.west(), extent.south());
        const dimension = extent.dimensions();
        const c = document.createElement('canvas');

        c.width = sizeTexture;
        c.height = sizeTexture;
        const ctx = c.getContext('2d');
        ctx.globalCompositeOperation = style.globalCompositeOperation || 'source-over';

        const scale = new THREE.Vector2(ctx.canvas.width / dimension.x, ctx.canvas.width / dimension.y);

        // Draw the canvas
        if (Array.isArray(features)) {
            for (let i = 0; i < features.length; i++) {
                drawFeature(ctx, features[i], origin, scale, extent, style);
            }
        } else {
            drawFeature(ctx, features, origin, scale, extent, style);
        }

        const texture = new THREE.Texture(c);
        texture.flipY = false;
        texture.generateMipmaps = false;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        return texture;
    },
};

