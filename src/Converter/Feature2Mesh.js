import * as THREE from 'three';
import Earcut from 'earcut';
import { FEATURE_TYPES } from 'Core/Feature';
import ReferLayerProperties from 'Layer/ReferencingLayerProperties';
import { deprecatedFeature2MeshOptions } from 'Core/Deprecated/Undeprecator';
import Extent from 'Core/Geographic/Extent';
import OrientationUtils from 'Utils/OrientationUtils';
import Coordinates from 'Core/Geographic/Coordinates';
import Style, { StyleContext } from 'Core/Style';

const coord = new Coordinates('EPSG:4326', 0, 0, 0);
const context = new StyleContext();
const defaultStyle = new Style();
let style;

const dim_ref = new THREE.Vector2();
const dim = new THREE.Vector2();
const normal = new THREE.Vector3();
const baseCoord = new THREE.Vector3();
const topCoord = new THREE.Vector3();
const inverseScale = new THREE.Vector3();
const extent = new Extent('EPSG:4326', 0, 0, 0, 0);

const _color = new THREE.Color();
const maxValueUint8 = 2 ** 8 - 1;
const maxValueUint16 = 2 ** 16 - 1;
const maxValueUint32 = 2 ** 32 - 1;
const crsWGS84 = 'EPSG:4326';

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
    normal.set(0, 0, 1).multiply(inverseScale);

    const pointMaterialSize = [];
    context.setFeature(feature);

    for (const geometry of feature.geometries) {
        const start = geometry.indices[0].offset;
        const count = geometry.indices[0].count;
        const end = start + count;
        const id = batchId(geometry.properties, featureId);
        context.setGeometry(geometry);

        for (let v = start * 3, j = start; j < end; v += 3, j += 1) {
            if (feature.normals) {
                normal.fromArray(feature.normals, v).multiply(inverseScale);
            }

            const localCoord = context.setLocalCoordinatesFromArray(feature.vertices, v);
            style.setContext(context);
            const { base_altitude, color, radius } = style.point;

            coord.copy(localCoord)
                .applyMatrix4(context.collection.matrixWorld);
            if (coord.crs == 'EPSG:4978') {
            // altitude convertion from geocentered to elevation (from ground)
                coord.as('EPSG:4326', coord);
            }

            // Calculate the new coordinates using the elevation shift (baseCoord)
            baseCoord.copy(normal)
                .multiplyScalar(base_altitude - coord.z).add(localCoord)
            // and update the geometry buffer (vertices).
                .toArray(vertices, v);

            toColor(color).multiplyScalar(255).toArray(colors, v);

            if (!pointMaterialSize.includes(radius)) {
                pointMaterialSize.push(radius);
            }
            batchIds[j] = id;
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
        console.warn('Too many differents point.radius, only the first one will be used');
    }

    return new THREE.Points(geom, options.pointMaterial);
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
    normal.set(0, 0, 1).multiply(inverseScale);
    // Multi line case
    for (const geometry of feature.geometries) {
        context.setGeometry(geometry);
        const id = batchId(geometry.properties, featureId);

        const start = geometry.indices[0].offset;
        // To avoid integer overflow with indice value (16 bits)
        if (start > 0xffff) {
            console.warn('Feature to Line: integer overflow, too many points in lines');
            break;
        }
        const count = geometry.indices[0].count;
        const end = start + count;

        for (let v = start * 3, j = start; j < end; v += 3, j += 1) {
            if (j < end - 1) {
                if (j < 0xffff) {
                    indices[i++] = j;
                    indices[i++] = j + 1;
                } else {
                    break;
                }
            }
            if (feature.normals) {
                normal.fromArray(feature.normals, v).multiply(inverseScale);
            }

            const localCoord = context.setLocalCoordinatesFromArray(feature.vertices, v);
            style.setContext(context);
            const { base_altitude, color, width } = style.stroke;

            coord.copy(localCoord)
                .applyMatrix4(context.collection.matrixWorld);
            if (coord.crs == 'EPSG:4978') {
            // altitude convertion from geocentered to elevation (from ground)
                coord.as('EPSG:4326', coord);
            }

            // Calculate the new coordinates using the elevation shift (baseCoord)
            baseCoord.copy(normal)
                .multiplyScalar(base_altitude - coord.z).add(localCoord)
            // and update the geometry buffer (vertices).
                .toArray(vertices, v);

            toColor(color).multiplyScalar(255).toArray(colors, v);

            if (!lineMaterialWidth.includes(width)) {
                lineMaterialWidth.push(width);
            }
            batchIds[j] = id;
        }
        featureId++;
    }
    options.lineMaterial.linewidth = lineMaterialWidth[0];
    if (lineMaterialWidth.length > 1) {
        // TODO CREATE material for each feature
        console.warn('Too many differents stroke.width, only the first one will be used');
    }
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
    geom.setAttribute('batchId', new THREE.BufferAttribute(batchIds, 1));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));

    return new THREE.LineSegments(geom, options.lineMaterial);
}

function featureToPolygon(feature, options) {
    const vertices = new Float32Array(feature.vertices);
    const colors = new Uint8Array(feature.vertices.length);
    const indices = [];

    const batchIds = new Uint32Array(vertices.length / 3);
    const batchId = options.batchId || ((p, id) => id);
    context.setFeature(feature);

    inverseScale.setFromMatrixScale(context.collection.matrixWorldInverse);
    normal.set(0, 0, 1).multiply(inverseScale);
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
        const count = end - start;
        const startIn = start * 3;
        const endIn = startIn + count * 3;
        const id = batchId(geometry.properties, featureId);

        for (let i = startIn, b = start; i < endIn; i += 3, b += 1) {
            if (feature.normals) {
                normal.fromArray(feature.normals, i).multiply(inverseScale);
            }

            const localCoord = context.setLocalCoordinatesFromArray(feature.vertices, i);
            style.setContext(context);
            const { base_altitude, color } = style.fill;

            coord.copy(localCoord)
                .applyMatrix4(context.collection.matrixWorld);
            if (coord.crs == 'EPSG:4978') {
            // altitude convertion from geocentered to elevation (from ground)
                coord.as('EPSG:4326', coord);
            }

            // Calculate the new coordinates using the elevation shift (baseCoord)
            baseCoord.copy(normal)
                .multiplyScalar(base_altitude - coord.z).add(localCoord)
            // and update the geometry buffer (vertices).
                .toArray(vertices, i);

            toColor(color).multiplyScalar(255).toArray(colors, i);
            batchIds[b] = id;
        }
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
    normal.set(0, 0, 1).multiply(inverseScale);
    coord.setCrs(context.collection.crs);

    for (const geometry of feature.geometries) {
        context.setGeometry(geometry);

        const start = geometry.indices[0].offset;
        const lastIndice = geometry.indices.slice(-1)[0];
        const end = lastIndice.offset + lastIndice.count;
        const count = end - start;
        const isClockWise = geometry.indices[0].ccw ?? (area(ptsIn, start, count) < 0);

        const startIn = start * 3;
        const startTop = start + totalVertices;
        const endIn = startIn + count * 3;
        const id = batchId(geometry.properties, featureId);

        for (let i = startIn, t = startIn + ptsIn.length, b = start; i < endIn; i += 3, t += 3, b += 1) {
            if (feature.normals) {
                normal.fromArray(feature.normals, i).multiply(inverseScale);
            }

            const localCoord = context.setLocalCoordinatesFromArray(ptsIn, i);
            style.setContext(context);
            const { base_altitude, extrusion_height, color } = style.fill;

            coord.copy(localCoord)
                .applyMatrix4(context.collection.matrixWorld);
            if (coord.crs == 'EPSG:4978') {
            // altitude convertion from geocentered to elevation (from ground)
                coord.as('EPSG:4326', coord);
            }

            // Calculate the new base coordinates using the elevation shift (baseCoord)
            baseCoord.copy(normal)
                .multiplyScalar(base_altitude - coord.z).add(localCoord)
            // and update the geometry buffer (vertices).
                .toArray(vertices, i);
            batchIds[b] = id;

            // populate top geometry buffers
            topCoord.copy(normal)
                .multiplyScalar(extrusion_height).add(baseCoord)
                .toArray(vertices, t);
            batchIds[b + totalVertices] = id;

            // coloring base and top mesh
            const meshColor = toColor(color).multiplyScalar(255);
            meshColor.toArray(colors, t); // top
            meshColor.multiplyScalar(0.5).toArray(colors, i); // base is half dark
        }

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
            const indice = geometry.indices[i];
            addExtrudedPolygonSideFaces(
                indices,
                totalVertices,
                indice.offset,
                indice.count,
                !(indice.ccw ?? isClockWise));
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
            mesh = featureToLine(feature, options);
            break;
        case FEATURE_TYPES.POLYGON:
            if (style.fill && Object.keys(style.fill).includes('extrusion_height')) {
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
};
