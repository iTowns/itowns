import * as THREE from 'three';
import Earcut from 'earcut';
import { FEATURE_TYPES } from 'Core/Feature';
import ReferLayerProperties from 'Layer/ReferencingLayerProperties';
import { deprecatedFeature2MeshOptions } from 'Core/Deprecated/Undeprecator';
import { Extent, Coordinates, OrientationUtils } from '@itowns/geographic';
import Style, { StyleContext } from 'Core/Style';

const coord = new Coordinates('EPSG:4326', 0, 0, 0);
const context = new StyleContext();
const defaultStyle = new Style();
let style;

const dim_ref = new THREE.Vector2();
const dim = new THREE.Vector2();
const up = new THREE.Vector3();
const baseCoord = new THREE.Vector3();
const topCoord = new THREE.Vector3();
const inverseScale = new THREE.Vector3();
const extent = new Extent('EPSG:4326', 0, 0, 0, 0);

const _color = new THREE.Color();
const maxValueUint8 = 2 ** 8 - 1;
const maxValueUint16 = 2 ** 16 - 1;
const maxValueUint32 = 2 ** 32 - 1;
const crsWGS84 = 'EPSG:4326';
const SEGMENTS = 8; // radial segments in a circle - used to model cylinders and spheres

class FeatureMesh extends THREE.Group {
    #currentCrs;
    #originalCrs;
    #collection = new THREE.Group();
    #place = new THREE.Group();
    constructor(meshes, collection) {
        super();

        this.meshes = new THREE.Group().add(...meshes);

        this.#collection = new THREE.Group().add(this.meshes);
        this.#collection.quaternion.copy(collection.quaternion);
        this.#collection.position.copy(collection.position);

        this.#collection.scale.copy(collection.scale);
        this.#collection.updateMatrix();

        this.#originalCrs = collection.crs;
        this.#currentCrs = this.#originalCrs;
        this.extent = collection.extent;
        this.isFeatureMesh = true;

        this.add(this.#place.add(this.#collection));
    }

    as(crs) {
        if (this.#currentCrs !== crs) {
            this.#currentCrs = crs;
            if (crs == this.#originalCrs) {
                // reset transformation
                this.place.position.set(0, 0, 0);
                this.position.set(0, 0, 0);
                this.scale.set(1, 1, 1);
                this.quaternion.identity();
            } else {
                // calculate the scale transformation to transform the feature.extent
                // to feature.extent.as(crs)
                coord.crs = this.#originalCrs;
                // TODO: An extent here could be either a geographic extent (for
                // features from WFS) or a tiled extent (for features from MVT).
                // Unify both behavior.
                if (this.extent.isExtent) {
                    extent.copy(this.extent).applyMatrix4(this.#collection.matrix);
                    extent.as(coord.crs, extent);
                } else {
                    this.extent.toExtent(coord.crs, extent);
                }
                extent.spatialEuclideanDimensions(dim_ref);
                extent.planarDimensions(dim);
                if (dim.x && dim.y) {
                    this.scale.copy(dim_ref).divide(dim).setZ(1);
                }

                // Position and orientation
                // remove original position
                this.#place.position.copy(this.#collection.position).negate();

                // get mesh coordinate
                coord.setFromVector3(this.#collection.position);

                // get method to calculate orientation
                const crsInput = this.#originalCrs == 'EPSG:3857' ? crsWGS84 : this.#originalCrs;
                const crs2crs = OrientationUtils.quaternionFromCRSToCRS(crsInput, crs);
                // calculate orientation to crs
                crs2crs(coord.as(crsWGS84), this.quaternion);

                // transform position to crs
                coord.as(crs, coord).toVector3(this.position);
            }
        }

        return this;
    }
}

function toColor(color) {
    if (color) {
        if (color.type == 'Color') {
            return color;
        } else {
            return _color.set(color);
        }
    } else {
        return _color.set(Math.random() * 0xffffff);
    }
}

function getIntArrayFromSize(data, size) {
    if (size <= maxValueUint8) {
        return new Uint8Array(data);
    } else if (size <= maxValueUint16) {
        return new Uint16Array(data);
    } else {
        return new Uint32Array(data);
    }
}

function separateMeshes(object3D) {
    const meshes = [];
    object3D.updateMatrixWorld();
    object3D.traverse((element) => {
        if (element instanceof THREE.Mesh) {
            element.updateMatrixWorld();
            element.geometry.applyMatrix4(element.matrixWorld);
            meshes.push(element);
        }
    });

    return meshes;
}

/**
 * Add indices for the side faces.
 * We loop over the contour and create a side face made of two triangles.
 *
 * For a ring made of (n) coordinates, there are (n*2) vertices.
 * The (n) first vertices are on the roof, the (n) other vertices are on the floor.
 *
 * If index (i) is on the roof, index (i+length) is on the floor.
 *
 * @param {number[]} indices - Array of indices to push to
 * @param {number} length - Total vertices count in the geom (excluding the extrusion ones)
 * @param {number} offset
 * @param {number} count
 * @param {boolean} isClockWise - Wrapping direction
 */
function addExtrudedPolygonSideFaces(indices, length, offset, count, isClockWise) {
    // loop over contour length, and for each point of the contour,
    // add indices to make two triangle, that make the side face
    const startIndice = indices.length;
    indices.length += (count - 1) * 6;
    for (let i = offset, j = startIndice; i < offset + count - 1; ++i, ++j) {
        if (isClockWise) {
            // first triangle indices
            indices[j] = i;
            indices[++j] = i + length;
            indices[++j] = i + 1;
            // second triangle indices
            indices[++j] = i + 1;
            indices[++j] = i + length;
            indices[++j] = i + length + 1;
        } else {
            // first triangle indices
            indices[j] = i + length;
            indices[++j] = i;
            indices[++j] = i + length + 1;
            // second triangle indices
            indices[++j] = i + length + 1;
            indices[++j] = i;
            indices[++j] = i + 1;
        }
    }
}

function featureToPoint(feature, options) {
    const ptsIn = feature.vertices;
    const colors = new Uint8Array(ptsIn.length);
    const batchIds = new Uint32Array(ptsIn.length);
    const batchId = options.batchId || ((p, id) => id);

    let featureId = 0;
    const vertices = new Float32Array(ptsIn);
    inverseScale.setFromMatrixScale(context.collection.matrixWorldInverse);
    up.set(0, 0, 1).multiply(inverseScale);

    const pointMaterialSize = [];
    context.setFeature(feature);

    for (const geometry of feature.geometries) {
        const id = batchId(geometry.properties, featureId);
        context.setGeometry(geometry);

        updatePointVertices({ feature }, vertices, colors, batchIds, id);

        // collect point size for this geometry
        const { radius } = style.point;
        if (!pointMaterialSize.includes(radius)) {
            pointMaterialSize.push(radius);
        }

        featureId++;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
    geom.setAttribute('batchId', new THREE.BufferAttribute(batchIds, 1));

    options.pointMaterial.size = pointMaterialSize[0];
    if (pointMaterialSize.length > 1) {
        // TODO CREATE material for each feature
        console.warn('Too many different point.radius, only the first one will be used');
    }

    return new THREE.Points(geom, options.pointMaterial);
}

/**
 * Update vertex data for POINT features.
 *
 * @param {Object} featureMesh - Object carrying the feature (expects { feature }).
 * @param {Float32Array} [vertices] - Target positions buffer to write into.
 * @param {Uint8Array} [colors] - Target color buffer (rgb Uint8, normalized).
 * @param {Uint32Array} [batchIds] - Target per-vertex batch id buffer.
 * @param {number} [id] - Batch id for batchIds when provided.
 */
function updatePointVertices(featureMesh, vertices, colors, batchIds, id) {
    const feature = featureMesh.feature;
    const ptsIn = feature.vertices;
    if (!ptsIn?.length) {
        console.error('Feature has no vertices');
        return;
    }

    // context setup
    context.setFeature(feature);
    inverseScale.setFromMatrixScale(context.collection.matrixWorldInverse);
    up.set(0, 0, 1).multiply(inverseScale);
    coord.setCrs(context.collection.crs);
    style.setContext(context);

    // geometry range
    const geometry = context.getGeometry();
    const start = geometry.indices[0].offset;
    const count = geometry.indices[0].count;
    const end = start + count;

    for (let v = start * 3, j = start; j < end; v += 3, j += 1) {
        if (vertices) {
            if (feature.normals) {
                up.fromArray(feature.normals, v).multiply(inverseScale);
            }

            const localCoord = context.setLocalCoordinatesFromArray(feature.vertices, v);

            coord.copy(localCoord)
                .applyMatrix4(context.collection.matrixWorld);
            if (coord.crs === 'EPSG:4978') {
                // altitude conversion from geocentered to elevation (from ground)
                coord.as('EPSG:4326', coord);
            }

            baseCoord.copy(up)
                .multiplyScalar(style.point.base_altitude - coord.z).add(localCoord)
                .toArray(vertices, v);
        }

        if (colors) {
            toColor(style.point.color).multiplyScalar(255).toArray(colors, v);
        }

        if (batchIds) { batchIds[j] = id; }
    }
}

function featureToLine(feature, options) {
    const ptsIn = feature.vertices;
    const colors = new Uint8Array(ptsIn.length);
    const count = ptsIn.length / 3;

    const batchIds = new Uint32Array(count);
    const batchId = options.batchId || ((p, id) => id);
    let featureId = 0;

    const vertices = new Float32Array(ptsIn.length);
    const geom = new THREE.BufferGeometry();

    const lineMaterialWidth = [];
    context.setFeature(feature);

    const countIndices = (count - feature.geometries.length) * 2;
    const indices = getIntArrayFromSize(countIndices, count);

    let i = 0;
    inverseScale.setFromMatrixScale(context.collection.matrixWorldInverse);
    up.set(0, 0, 1).multiply(inverseScale);
    // Multi line case
    for (const geometry of feature.geometries) {
        context.setGeometry(geometry);
        const id = batchId(geometry.properties, featureId);

        const start = geometry.indices[0].offset;
        // To avoid integer overflow with index value (16 bits)
        if (start > 0xffff) {
            console.warn('Feature to Line: integer overflow, too many points in lines');
            break;
        }
        const count = geometry.indices[0].count;
        const end = start + count;

        for (let j = start; j < end - 1; j++) {
            if (j >= 0xffff) { break; }
            indices[i++] = j;
            indices[i++] = j + 1;
        }

        updateLineVertices({ feature }, vertices, colors, batchIds, id);

        // collect line width for this geometry
        const { width } = style.stroke;
        if (!lineMaterialWidth.includes(width)) {
            lineMaterialWidth.push(width);
        }

        featureId++;
    }

    options.lineMaterial.linewidth = lineMaterialWidth[0];
    if (lineMaterialWidth.length > 1) {
        // TODO CREATE material for each feature
        console.warn('Too many different stroke.width, only the first one will be used');
    }

    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
    geom.setAttribute('batchId', new THREE.BufferAttribute(batchIds, 1));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));

    return new THREE.LineSegments(geom, options.lineMaterial);
}

function featureToExtrudedLine(feature, options) {
    const vertSize = (feature.vertices.length - 3 * feature.geometries.length) * 2 * SEGMENTS;
    const vertices = new Float32Array(vertSize);
    const colors = new Uint8Array(vertSize);
    const batchIdFn = options.batchId || ((p, id) => id);
    const batchIds = new Uint32Array(vertices.length / 3);

    context.setFeature(feature);
    inverseScale.setFromMatrixScale(context.collection.matrixWorldInverse);
    up.set(0, 0, 1).multiply(inverseScale);
    coord.setCrs(context.collection.crs);

    let featureId = 0;

    // Build one cylinder per line segment
    for (const geometry of feature.geometries) {
        context.setGeometry(geometry);
        const id = batchIdFn(geometry.properties, featureId);
        updateExtrudedLineVertices({ feature }, vertices, colors, batchIds, id);
        featureId++;
    }

    let totalSegments = 0;
    for (const g of feature.geometries) {
        totalSegments += Math.max(0, g.indices[0].count - 1);
    }
    const indexCount = totalSegments * SEGMENTS * 6;
    const indices = getIntArrayFromSize(indexCount, vertices.length / 3);
    let vertexBaseIndex = 0;
    let iIndices = 0;
    for (const geometry of feature.geometries) {
        context.setGeometry(geometry);
        const start = geometry.indices[0].offset;
        const count = geometry.indices[0].count;
        const end = start + count;
        for (let j = start; j < end - 1; j++) {
            // Indices for cylindrical side quads
            // Connect them in an order such that normals face outwards
            for (let k = 0; k < SEGMENTS - 1; k++) {
                const v = vertexBaseIndex + k * 2;
                indices.set([v, v + 2, v + 1, v + 1, v + 2, v + 3], iIndices);
                iIndices += 6;
            }
            const v = vertexBaseIndex + 2 * SEGMENTS - 2;
            indices.set([v, vertexBaseIndex, v + 1, v + 1, vertexBaseIndex, vertexBaseIndex + 1], iIndices);
            iIndices += 6;
            vertexBaseIndex += SEGMENTS * 2;
        }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.Uint8BufferAttribute(colors, 3, true));
    geom.setAttribute('batchId', new THREE.Uint32BufferAttribute(batchIds, 1));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));

    return new THREE.Mesh(geom, options.polygonMaterial);
}

function featureToPolygon(feature, options) {
    const vertices = new Float32Array(feature.vertices);
    const colors = new Uint8Array(feature.vertices.length);
    const indices = [];

    const batchIds = new Uint32Array(vertices.length / 3);
    const batchId = options.batchId || ((p, id) => id);
    context.setFeature(feature);

    inverseScale.setFromMatrixScale(context.collection.matrixWorldInverse);
    up.set(0, 0, 1).multiply(inverseScale);
    let featureId = 0;

    for (const geometry of feature.geometries) {
        const start = geometry.indices[0].offset;
        // To avoid integer overflow with index value (32 bits)
        if (start > maxValueUint32) {
            console.warn('Feature to Polygon: integer overflow, too many points in polygons');
            break;
        }
        context.setGeometry(geometry);

        const lastIndice = geometry.indices.slice(-1)[0];
        const end = lastIndice.offset + lastIndice.count;
        const id = batchId(geometry.properties, featureId);

        updatePolygonVertices({ feature }, vertices, colors, batchIds, id);

        featureId++;

        const geomVertices = vertices.slice(start * 3, end * 3);
        const holesOffsets = geometry.indices.map(i => i.offset - start).slice(1);
        const triangles = Earcut(geomVertices, holesOffsets, 3);

        const startIndice = indices.length;
        indices.length += triangles.length;

        for (let i = 0; i < triangles.length; i++) {
            indices[startIndice + i] = triangles[i] + start;
        }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
    geom.setAttribute('batchId', new THREE.BufferAttribute(batchIds, 1));
    geom.setIndex(new THREE.BufferAttribute(getIntArrayFromSize(indices, vertices.length / 3), 1));

    return new THREE.Mesh(geom, options.polygonMaterial);
}

/**
 * Update base (non-extruded) polygon vertex data.
 *
 * @param {Object} featureMesh - Object carrying the feature (expects { feature }).
 * @param {Float32Array} [vertices] - Target positions buffer to write into.
 * @param {Uint8Array} [colors] - Target color buffer (rgb Uint8, normalized).
 * @param {Uint32Array} [batchIds] - Target per-vertex batch id buffer.
 * @param {number} [id] - Batch id value written when batchIds is provided.
 */
function updatePolygonVertices(featureMesh, vertices, colors, batchIds, id) {
    const feature = featureMesh.feature;
    const ptsIn = feature.vertices;
    if (!ptsIn?.length) {
        console.error('Feature has no vertices');
        return;
    }

    // context setup
    context.setFeature(feature);
    inverseScale.setFromMatrixScale(context.collection.matrixWorldInverse);
    up.set(0, 0, 1).multiply(inverseScale);
    coord.setCrs(context.collection.crs);
    style.setContext(context);

    // geometry range
    const geometry = context.getGeometry();
    const start = geometry.indices[0].offset;
    const lastIndex = geometry.indices.slice(-1)[0];
    const end = lastIndex.offset + lastIndex.count;

    for (let v = start * 3, j = start; j < end; v += 3, j += 1) {
        if (vertices) {
            if (feature.normals) {
                up.fromArray(feature.normals, v).multiply(inverseScale);
            }

            const localCoord = context.setLocalCoordinatesFromArray(feature.vertices, v);
            const { base_altitude } = style.fill;

            coord.copy(localCoord)
                .applyMatrix4(context.collection.matrixWorld);
            if (coord.crs === 'EPSG:4978') {
                // altitude conversion from geocentered to elevation (from ground)
                coord.as('EPSG:4326', coord);
            }

            // Calculate the new coordinates using the elevation shift (baseCoord)
            baseCoord.copy(up)
                .multiplyScalar(base_altitude - coord.z).add(localCoord)
                // and update the geometry buffer (vertices).
                .toArray(vertices, v);
        }

        if (colors) {
            toColor(style.fill.color).multiplyScalar(255).toArray(colors, v);
        }

        if (batchIds) { batchIds[j] = id; }
    }
}

function area(contour, offset, count) {
    offset *= 3;
    const n = offset + count * 3;
    let a = 0.0;

    for (let p = n - 3, q = offset; q < n; p = q, q += 3) {
        a += contour[p] * contour[q + 1] - contour[q] * contour[p + 1];
    }

    return a * 0.5;
}

function featureToExtrudedPolygon(feature, options) {
    const ptsIn = feature.vertices;
    const vertices = new Float32Array(ptsIn.length * 2);
    const totalVertices = ptsIn.length / 3;

    const colors = new Uint8Array(ptsIn.length * 2);

    const indices = [];

    const batchIds = new Uint32Array(vertices.length / 3);
    const batchId = options.batchId || ((p, id) => id);

    let featureId = 0;

    context.setFeature(feature);
    inverseScale.setFromMatrixScale(context.collection.matrixWorldInverse);
    up.set(0, 0, 1).multiply(inverseScale);
    coord.setCrs(context.collection.crs);

    for (const geometry of feature.geometries) {
        context.setGeometry(geometry);

        const start = geometry.indices[0].offset;
        const lastIndice = geometry.indices.slice(-1)[0];
        const end = lastIndice.offset + lastIndice.count;
        const count = end - start;
        const isClockWise = geometry.indices[0].ccw ?? (area(ptsIn, start, count) < 0);

        const startTop = start + totalVertices;
        const id = batchId(geometry.properties, featureId);
        updateExtrudedPolygonVertices({ feature }, vertices, colors, batchIds, id);

        featureId++;

        const endTop = end + totalVertices;

        const geomVertices = vertices.slice(startTop * 3, endTop * 3);
        const holesOffsets = geometry.indices.map(i => i.offset - start).slice(1);
        const triangles = Earcut(geomVertices, holesOffsets, 3);

        const startIndice = indices.length;
        indices.length += triangles.length;

        for (let i = 0; i < triangles.length; i++) {
            indices[startIndice + i] = triangles[i] + startTop;
        }

        // add extruded contour
        addExtrudedPolygonSideFaces(
            indices,
            totalVertices,
            geometry.indices[0].offset,
            geometry.indices[0].count,
            isClockWise);

        // add extruded holes
        for (let i = 1; i < geometry.indices.length; i++) {
            const index = geometry.indices[i];
            addExtrudedPolygonSideFaces(
                indices,
                totalVertices,
                index.offset,
                index.count,
                !(index.ccw ?? isClockWise));
        }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
    geom.setAttribute('batchId', new THREE.BufferAttribute(batchIds, 1));

    geom.setIndex(new THREE.BufferAttribute(getIntArrayFromSize(indices, vertices.length / 3), 1));

    return new THREE.Mesh(geom, options.polygonMaterial);
}

/**
 * Update base and top vertex data for extruded polygons.
 *
 * @param {Object} featureMesh - The feature mesh providing feature and collection context.
 * @param {Float32Array} [vertices] - Optional target positions buffer (xyz) to write into.
 * @param {Uint8Array} [colors] - Optional target colors buffer (rgb, Uint8, normalized) to write into.
 * @param {Uint32Array} [batchIds] - Optional target per-vertex batch id buffer.
 * @param {number} [id] - Batch id value to assign to written vertices when batchIds is provided.
 */
function updateExtrudedPolygonVertices(featureMesh, vertices, colors, batchIds, id) {
    const feature = featureMesh.feature;
    const numVertices = feature.vertices?.length;
    if (!numVertices) {
        console.error('Feature has no vertices');
        return;
    }

    // context setup
    context.setFeature(feature);
    inverseScale.setFromMatrixScale(context.collection.matrixWorldInverse);
    up.set(0, 0, 1).multiply(inverseScale);
    coord.setCrs(context.collection.crs);
    style.setContext(context);

    // geometry range
    const geometry = context.getGeometry();
    const start = geometry.indices[0].offset;
    const lastIndex = geometry.indices.slice(-1)[0];
    const end = lastIndex.offset + lastIndex.count;
    const count = end - start;
    const startIn = start * 3;
    const endIn = startIn + count * 3;
    const { base_altitude, extrusion_height, color } = style.fill;
    let meshColor;
    if (colors) { meshColor = toColor(color).multiplyScalar(255); }

    for (let i = startIn; i < endIn; i += 3) {
        const t = numVertices + i;

        if (vertices) {
            if (feature.normals) {
                up.fromArray(feature.normals, i).multiply(inverseScale);
            }

            const localCoord = context.setLocalCoordinatesFromArray(feature.vertices, i);
            const worldCoord = coord.copy(localCoord).applyMatrix4(context.collection.matrixWorld);
            if (worldCoord.crs === 'EPSG:4978') {
                // altitude conversion from geocentered to elevation (from ground)
                worldCoord.as('EPSG:4326', worldCoord);
            }
            baseCoord.copy(up)
                .multiplyScalar(base_altitude - worldCoord.z).add(localCoord)
            // and update the geometry buffer (vertices).
                .toArray(vertices, i);

            // populate top geometry buffers
            topCoord.copy(up)
                .multiplyScalar(extrusion_height).add(baseCoord)
                .toArray(vertices, t);
        }

        if (batchIds) {
            batchIds[(i / 3) | 0] = id;
            batchIds[(t / 3) | 0] = id;
        }

        // coloring base and top mesh
        if (colors) {
            meshColor.toArray(colors, t); // top
            meshColor.multiplyScalar(0.5).toArray(colors, i); // base is half-dark
        }
    }
}

function updateLineVertices(featureMesh, vertices, colors, batchIds, id) {
    const feature = featureMesh.feature;
    const ptsIn = feature.vertices;
    if (!ptsIn?.length) {
        console.error('Feature has no vertices');
        return;
    }

    // context setup
    context.setFeature(feature);
    inverseScale.setFromMatrixScale(context.collection.matrixWorldInverse);
    up.set(0, 0, 1).multiply(inverseScale);
    coord.setCrs(context.collection.crs);
    style.setContext(context);

    // geometry range
    const geometry = context.getGeometry();
    const start = geometry.indices[0].offset;
    const count = geometry.indices[0].count;
    const end = start + count;
    const base_altitude = style.stroke.base_altitude;
    for (let v = start * 3, j = start; j < end; v += 3, j += 1) {
        if (vertices) {
            if (feature.normals) {
                up.fromArray(feature.normals, v).multiply(inverseScale);
            }

            const localCoord = context.setLocalCoordinatesFromArray(feature.vertices, v);

            coord.copy(localCoord)
                .applyMatrix4(context.collection.matrixWorld);
            if (coord.crs == 'EPSG:4978') {
                // altitude conversion from geocentered to elevation (from ground)
                coord.as('EPSG:4326', coord);
            }

            // Calculate the new coordinates using the elevation shift (baseCoord)
            baseCoord.copy(up)
                .multiplyScalar(base_altitude - coord.z).add(localCoord)
                // and update the geometry buffer (vertices).
                .toArray(vertices, v);
        }

        if (colors) { toColor(style.stroke.color).multiplyScalar(255).toArray(colors, v); }

        if (batchIds) { batchIds[j] = id; }
    }
}

function updateExtrudedLineVertices(featureMesh, vertices, colors, batchIds, id) {
    const feature = featureMesh.feature;
    const ptsIn = feature.vertices;
    if (!ptsIn?.length) {
        console.error('Feature has no vertices');
        return;
    }

    // context setup
    context.setFeature(feature);
    inverseScale.setFromMatrixScale(context.collection.matrixWorldInverse);
    up.set(0, 0, 1).multiply(inverseScale);
    coord.setCrs(context.collection.crs);
    style.setContext(context);

    // geometry range
    const geometry = context.getGeometry();
    const start = geometry.indices[0].offset;
    const count = geometry.indices[0].count;
    const end = start + count;
    const { base_altitude, extrusion_radius: radius } = style.stroke;

    // pre-allocated vectors
    const xAxis = new THREE.Vector3();
    const yAxis = new THREE.Vector3();
    const zAxis = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const vertex = new THREE.Vector3();

    // For each consecutive pair of points, make a cylinder centered on the segment
    for (let i = start; i < end - 1; i++) {
        const iVertIn = i * 3;

        // Base and top points in layer-local space with altitude shift
        if (feature.normals) {
            up.fromArray(feature.normals, iVertIn).multiply(inverseScale);
        }

        const p0Local = context.setLocalCoordinatesFromArray(ptsIn, iVertIn).clone();
        coord.copy(p0Local).applyMatrix4(context.collection.matrixWorld);
        if (coord.crs === 'EPSG:4978') { coord.as('EPSG:4326', coord); }
        baseCoord.copy(up).multiplyScalar(base_altitude - coord.z).add(p0Local);

        const p1Local = context.setLocalCoordinatesFromArray(ptsIn, iVertIn + 3).clone();
        coord.copy(p1Local).applyMatrix4(context.collection.matrixWorld);
        if (coord.crs === 'EPSG:4978') { coord.as('EPSG:4326', coord); }
        topCoord.copy(up).multiplyScalar(base_altitude - coord.z).add(p1Local);

        // Axis vector
        zAxis.subVectors(topCoord, baseCoord);
        const axisLen = zAxis.length();
        if (axisLen === 0) { continue; } // start and end are the same
        zAxis.divideScalar(axisLen);

        // Build a local frame: choose an arbitrary vector not parallel to Z axis
        if (Math.abs(zAxis.z) > 0.9) { xAxis.set(1, 0, 0); } else { xAxis.set(0, 0, 1); }
        yAxis.crossVectors(zAxis, xAxis);
        xAxis.crossVectors(yAxis, zAxis);

        // Create ring vertices around both ends
        let vShift = 0;
        const meshColor = toColor(style.stroke.color).multiplyScalar(255);
        for (let k = 0; k < SEGMENTS; k++) {
            const iVertOut = 2 * SEGMENTS * iVertIn + vShift;
            if (vertices) {
                const theta = (k / SEGMENTS) * Math.PI * 2;
                normal.copy(xAxis).multiplyScalar(Math.cos(theta))
                    .addScaledVector(yAxis, Math.sin(theta));
                vertex.copy(baseCoord).addScaledVector(normal, radius).toArray(vertices, iVertOut);
                vertex.copy(topCoord).addScaledVector(normal, radius).toArray(vertices, iVertOut + 3);
            }
            if (batchIds) {
                batchIds[SEGMENTS * i + k] = id;
                batchIds[SEGMENTS * i + k + 1] = id;
            }
            if (colors) {
                meshColor.toArray(colors, iVertOut);
                meshColor.toArray(colors, iVertOut + 3);
            }
            vShift += 6;
        }
    }
}

/**
 * Created Instanced object from mesh
 *
 * @param {THREE.MESH} mesh Model 3D to instanciate
 * @param {*} count number of instances to create (int)
 * @param {*} ptsIn positions of instanced (array double)
 * @returns {THREE.InstancedMesh} Instanced mesh
 */
function createInstancedMesh(mesh, count, ptsIn) {
    const instancedMesh = new THREE.InstancedMesh(mesh.geometry, mesh.material, count);
    let index = 0;
    for (let i = 0; i < count * 3; i += 3) {
        const mat = new THREE.Matrix4();
        mat.setPosition(ptsIn[i], ptsIn[i + 1], ptsIn[i + 2]);
        instancedMesh.setMatrixAt(index, mat);
        index++;
    }

    instancedMesh.instanceMatrix.needsUpdate = true;

    return instancedMesh;
}

/**
 * Convert a {@link Feature} of type POINT to a Instanced meshes
 *
 * @param {Object} feature
 * @returns {THREE.Mesh} mesh or GROUP of THREE.InstancedMesh
 */
function pointsToInstancedMeshes(feature) {
    const ptsIn = feature.vertices;
    const count = feature.geometries.length;
    const modelObject = style.point.model.object;

    if (modelObject instanceof THREE.Mesh) {
        return createInstancedMesh(modelObject, count, ptsIn);
    } else if (modelObject instanceof THREE.Object3D) {
        const group = new THREE.Group();
        // Get independent meshes from more complexe object
        const meshes = separateMeshes(modelObject);
        meshes.forEach(mesh => group.add(createInstancedMesh(mesh, count, ptsIn)));
        return group;
    } else {
        throw new Error('The format of the model object provided in the style (layer.style.point.model.object) is not supported. Only THREE.Mesh or THREE.Object3D are supported.');
    }
}

/**
 * Convert a {@link Feature} to a Mesh
 * @param {Feature} feature - the feature to convert
 * @param {Object} options - options controlling the conversion
 *
 * @return {THREE.Mesh} mesh or GROUP of THREE.InstancedMesh
 */
function featureToMesh(feature, options) {
    if (!feature.vertices) {
        return;
    }

    let mesh;
    switch (feature.type) {
        case FEATURE_TYPES.POINT:
            if (style.point?.model?.object) {
                try {
                    mesh = pointsToInstancedMeshes(feature);
                    mesh.isInstancedMesh = true;
                } catch (e) {
                    mesh = featureToPoint(feature, options);
                }
            } else {
                mesh = featureToPoint(feature, options);
            }
            break;
        case FEATURE_TYPES.LINE:
            if (style.stroke && Object.keys(style.stroke).includes('extrusion_radius')) {
                mesh = featureToExtrudedLine(feature, options);
            } else {
                mesh = featureToLine(feature, options);
            }
            break;
        case FEATURE_TYPES.POLYGON:
            if (style.isExtruded()) {
                mesh = featureToExtrudedPolygon(feature, options);
            } else {
                mesh = featureToPolygon(feature, options);
            }
            break;
        default:
    }

    if (!mesh.isInstancedMesh) {
        mesh.material.vertexColors = true;
        mesh.material.color = new THREE.Color(0xffffff);
    }
    mesh.feature = feature;

    return mesh;
}

/**
 * @module Feature2Mesh
 */
export default {
    /**
     * Return a function that converts [Features]{@link module:GeoJsonParser} to Meshes. Feature collection will be converted to a
     * a THREE.Group.
     *
     * @param {Object} options - options controlling the conversion
     * @param {function} [options.batchId] - optional function to create batchId attribute.
     * It is passed the feature property and the feature index. As the batchId is using an unsigned int structure on 32 bits,
     * the batchId could be between 0 and 4,294,967,295.
     * @param {StyleOptions} [options.style] - optional style properties. Only needed if the convert is used without instancing
     * a layer beforehand.
     * @return {function}
     * @example <caption>Example usage of batchId with featureId.</caption>
     * view.addLayer({
     *     id: 'WFS Buildings',
     *     type: 'geometry',
     *     update: itowns.FeatureProcessing.update,
     *     convert: itowns.Feature2Mesh.convert({
     *         batchId: (property, featureId) => featureId,
     *     }),
     *     filter: acceptFeature,
     *     source,
     * });
     *
     * @example <caption>Example usage of batchId with property.</caption>
     * view.addLayer({
     *     id: 'WFS Buildings',
     *     type: 'geometry',
     *     update: itowns.FeatureProcessing.update,
     *     convert: itowns.Feature2Mesh.convert({
     *         batchId: (property, featureId) => property.house ? 10 : featureId,
     *         }),
     *     filter: acceptFeature,
     *     source,
     * });
     */
    convert(options = {}) {
        deprecatedFeature2MeshOptions(options);
        return function _convert(collection) {
            if (!collection) { return; }

            if (!options.pointMaterial) {
                // Opacity and wireframe refered with layer properties
                // TODO: next step is move these properties to Style
                options.pointMaterial = ReferLayerProperties(new THREE.PointsMaterial(), this);
                options.lineMaterial = ReferLayerProperties(new THREE.LineBasicMaterial(), this);
                options.polygonMaterial = ReferLayerProperties(new THREE.MeshBasicMaterial(), this);
            }

            // In the case we didn't instanciate the layer (this) before the convert, we can pass
            // style properties (@link StyleOptions) using options.style.
            // This is usually done in some tests and if you want to use Feature2Mesh.convert()
            // as in examples/source_file_gpx_3d.html.
            style = this?.style || (options.style ? new Style(options.style) :  defaultStyle);

            context.setCollection(collection);

            const features = collection.features;
            if (!features || features.length == 0) { return; }

            const meshes = features.map((feature) => {
                const mesh = featureToMesh(feature, options);
                mesh.layer = this;
                return mesh;
            });
            const featureNode = new FeatureMesh(meshes, collection);

            return featureNode;
        };
    },

    updateStyle(featureMesh, options = {}) {
        const feature = featureMesh.feature;
        let vertSize = feature.vertices?.length;
        if (!vertSize) { return; }

        // only define attributes that need an update
        let newColor;
        let newExtrusionHeight = null;
        switch (feature.type) {
            case FEATURE_TYPES.POINT: {
                const pointStyle = options.style.point;
                if (pointStyle?.model?.object) { break; } // instanced mesh
                newColor = pointStyle?.color;
                break;
            }
            case FEATURE_TYPES.LINE: {
                const strokeStyle = options.style?.stroke;
                newColor = strokeStyle?.color;
                if (strokeStyle && 'extrusion_radius' in strokeStyle) {
                    vertSize = SEGMENTS * 2 * (vertSize - 3 * feature.geometries.length);
                    newExtrusionHeight = strokeStyle.extrusion_radius;
                }
                break;
            }
            case FEATURE_TYPES.POLYGON: {
                const fillStyle = options.style?.fill;
                newColor = fillStyle?.color;
                if (fillStyle && 'extrusion_height' in fillStyle) {
                    vertSize *= 2;
                    newExtrusionHeight = fillStyle.extrusion_height;
                }
                break;
            }
            default:
                console.error(`Trying to update style of unsupported feature type: ${feature.type}`);
                return;
        }
        let colors;
        if (newColor) {
            if (featureMesh.oldColor && !featureMesh.oldColor.equals(newColor)) {
                colors = new Uint8Array(vertSize);
                featureMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
            }
            featureMesh.oldColor = newColor;
        }
        let posAttr;
        if (newExtrusionHeight !== undefined) {
            if (featureMesh.oldExtrusionHeight !== undefined && featureMesh.oldExtrusionHeight !== newExtrusionHeight) {
                posAttr = featureMesh.geometry.getAttribute('position');
                posAttr.needsUpdate = true;
            }
            featureMesh.oldExtrusionHeight = newExtrusionHeight;
        }
        const vertices = posAttr?.array;
        for (const geometry of feature.geometries) {
            context.setGeometry(geometry);
            switch (feature.type) {
                case FEATURE_TYPES.POINT: {
                    const pointStyle = options.style.point;
                    if (pointStyle?.model?.object) { break; } // instanced mesh
                    updatePointVertices(featureMesh, vertices, colors);
                    break;
                }
                case FEATURE_TYPES.LINE: {
                    if (newExtrusionHeight !== null) {
                        updateExtrudedLineVertices(featureMesh, vertices, colors);
                    } else {
                        updateLineVertices(featureMesh, vertices, colors);
                    }
                    break;
                }
                case FEATURE_TYPES.POLYGON: {
                    if (newExtrusionHeight !== null) {
                        updateExtrudedPolygonVertices(featureMesh, vertices, colors);
                    } else {
                        updatePolygonVertices(featureMesh, vertices, colors);
                    }
                    break;
                }
                default: // unreachable (already returned)
            }
        }
    },
};
