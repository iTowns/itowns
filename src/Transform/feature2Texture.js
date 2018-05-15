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
    // build contour
    ctx.beginPath();
    for (const indice of indices) {
        _moveTo(ctx, vertices[indice.offset], scale, origin);
        for (let j = 1; j < indice.count; j++) {
            _lineTo(ctx, vertices[indice.offset + j], scale, origin);
        }
    }
    ctx.closePath();

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

    if (typeof style === 'function') {
        style = style(properties, feature);
    }

    ctx.globalCompositeOperation = style.globalCompositeOperation || 'source-over';

    for (const geometry of feature.geometry) {
        if (feature.type === 'point') {
            drawPoint(ctx, feature.vertices[0], origin, scale, style);
        } else if (geometry.extent.intersectsExtent(extent)) {
            drawPolygon(ctx, feature.vertices, geometry.indices, origin, scale, properties, style);
        }
    }
}

/**
 * Converts [Feature]{@link module:GeoJsonParser~Feature} to
 * [THREE.Texture]{@link https://threejs.org/docs/#api/textures/Texture}.
 *
 * @function feature2Texture
 *
 * @param {module:GeoJsonParser~FeatureCollection} collection - a Feature or an
 * array of Feature.
 * @param {Object} [options] - Options controlling the conversion.
 * @param {Extent} options.extent - The extent containing the feature.
 * @param {number} options.size - The size of the texture, in pixels. The
 * resulting texture will be a square, and it is highly recommended to use a
 * power of 2 for GPU optimization purpose.
 * @param {Object|function} options.style - The style to apply to the
 * feature before rendering the texture. If it is a function, the two
 * arguments are the <code>properties</code> of the current processed
 * feature, and the <code>feature</code> itself.
 *
 * @return {function} Returns a [THREE.Texture]{@link
 * https://threejs.org/docs/#api/textures/Texture}.
 */
export default function (collection, options = {}) {
    // A texture is instancied drawn canvas
    // origin and dimension are used to transform the feature's coordinates to canvas's space
    const origin = new THREE.Vector2(options.extent.west(), options.extent.south());
    const dimension = options.extent.dimensions();
    const c = document.createElement('canvas');
    c.width = options.size;
    c.height = options.size;

    const ctx = c.getContext('2d');

    const scale = new THREE.Vector2(ctx.canvas.width / dimension.x, ctx.canvas.width / dimension.y);

    // Draw the canvas
    for (const feature of collection.features) {
        drawFeature(ctx, feature, origin, scale, options.extent, options.style);
    }

    const texture = new THREE.Texture(c);
    texture.flipY = false;
    texture.generateMipmaps = false;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
}

