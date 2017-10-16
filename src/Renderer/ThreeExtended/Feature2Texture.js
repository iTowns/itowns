import * as THREE from 'three';
import { UNIT } from '../../Core/Geographic/Coordinates';

const pt = new THREE.Vector2();

function drawPolygon(ctx, vertices, origin, dimension, properties, style = {}) {
    if (vertices.length === 0) {
        return;
    }
    // compute scale transformation extent to canvas
    //
    const scale = new THREE.Vector2(ctx.canvas.width / dimension.x, ctx.canvas.width / dimension.y);
    ctx.beginPath();
    pt.x = vertices[0]._values[0] - origin.x;
    pt.y = vertices[0]._values[1] - origin.y;
    pt.multiply(scale);
    // Place the first point
    ctx.moveTo(pt.x, pt.y);
    vertices.shift();

    // build path
    for (const vertice of vertices) {
        pt.x = vertice._values[0] - origin.x;
        pt.y = vertice._values[1] - origin.y;
        pt.multiply(scale);
        ctx.lineTo(pt.x, pt.y);
    }

    // draw line polygon
    if (style.stroke || properties.stroke) {
        ctx.strokeStyle = style.stroke || properties.stroke;
        ctx.lineWidth = style.strokeWidth || properties['stroke-width'] || 2.0;
        ctx.globalAlpha = style.strokeOpacity || properties['stroke-opacity'] || 1.0;
        ctx.stroke();
    }

    // fill polygon
    if (style.fill || properties.fill) {
        ctx.closePath();
        ctx.fillStyle = style.fill || properties.fill;
        ctx.globalAlpha = style.fillOpacity || properties['fill-opacity'] || 1.0;
        ctx.fill();
    }
}

function drawPoint(ctx, vertice, origin, dimension, style = {}) {
    const scale = new THREE.Vector2(ctx.canvas.width / dimension.x, ctx.canvas.width / dimension.y);
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

function drawFeature(ctx, feature, origin, dimension, extent, style = {}) {
    const properties = feature.properties;
    const coordinates = feature.geometry.coordinates.slice();
    if (feature.geometry.type === 'point') {
        drawPoint(ctx, coordinates[0], origin, dimension, style);
    } else if (feature.geometry.extent.intersectsExtent(extent)) {
        ctx.globalCompositeOperation = 'destination-over';
        drawPolygon(ctx, coordinates, origin, dimension, properties, style);
    }
}

function drawFeatureCollection(ctx, collection, origin, dimension, extent, style = {}) {
    for (const features of collection.geometries) {
        /* eslint-disable guard-for-in */
        if (features.extent.intersectsExtent(extent)) {
            for (const id in features.featureVertices) {
                const polygon = features.featureVertices[id];
                const properties = collection.features[id].properties;
                const coordinates = features.coordinates.slice(polygon.offset, polygon.offset + polygon.count);
                if (features.type === 'point') {
                    drawPoint(ctx, coordinates[0], origin, dimension, style);
                } else if (polygon.extent.intersectsExtent(extent)) {
                    ctx.globalCompositeOperation = 'destination-over';
                    drawPolygon(ctx, coordinates, origin, dimension, properties, style);
                }
            }
        }
    }
    /* eslint-enable guard-for-in */
}

export default {
    createTextureFromFeature(feature, extent, sizeTexture, style) {
        // A texture is instancied drawn canvas
        // origin and dimension are used to transform the feature's coordinates to canvas's space
        const origin = new THREE.Vector2(extent.west(UNIT.DEGREE), extent.south(UNIT.DEGREE));
        const dimension = extent.dimensions(UNIT.DEGREE);
        const c = document.createElement('canvas');

        c.width = sizeTexture;
        c.height = sizeTexture;
        const ctx = c.getContext('2d');

        // Draw the canvas
        if (feature.geometries) {
            drawFeatureCollection(ctx, feature, origin, dimension, extent, style);
        } else {
            drawFeature(ctx, feature, origin, dimension, extent, style);
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

