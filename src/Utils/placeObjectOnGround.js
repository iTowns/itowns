import * as THREE from 'three';
import DEMUtils from 'Utils/DEMUtils';
import Coordinates from 'Core/Geographic/Coordinates';

const temp = {
    v: new THREE.Vector3(),
    coord1: new Coordinates('EPSG:4978'),
    coord2: new Coordinates('EPSG:4978'),
    offset: new THREE.Vector2(),
};

function _updateVector3(layer, method, nodes, vecCRS, vec, offset, matrices = {}, coords, cache) {
    const coord = coords || new Coordinates(vecCRS);
    if (matrices.worldFromLocal) {
        coord.setFromVector3(temp.v.copy(vec).applyMatrix4(matrices.worldFromLocal));
    } else {
        coord.setFromVector3(vec);
    }

    const result = DEMUtils.getTerrainObjectAt(layer, coord, method, nodes, cache);
    if (result) {
        result.coord.z += offset;
        result.coord.as(vecCRS, temp.coord2).toVector3(vec);
        if (matrices.localFromWorld) {
            vec.applyMatrix4(matrices.localFromWorld);
        }
        return { id: result.texture.id, version: result.texture.version, tile: result.tile };
    }
}

/**
 * @deprecated
 * Helper method that will position an object directly on the ground.
 *
 * @param {TiledGeometryLayer} layer - The tile layer owning the elevation
 * textures we're going to query. This is typically a `GlobeLayer` or
 * `PlanarLayer` (accessible through `view.tileLayer`).
 * @param {string} crs - The CRS used by the object coordinates. You
 * probably want to use `view.referenceCRS` here.
 * @param {Object3D} obj - the object we want to modify.
 * @param {Object} options
 * @param {number} [options.method=FAST_READ_Z] - There are two available methods:
 * `FAST_READ_Z` (default) or `PRECISE_READ_Z`. The first one is faster,
 * while the second one is slower but gives better precision.
 * @param {boolean} options.modifyGeometry - if unset/false, this function
 * will modify object.position. If true, it will modify
 * `obj.geometry.vertices` or `obj.geometry.attributes.position`.
 * @param {TileMesh[]} [tileHint] - Optional array of tiles to speed up the
 * process. You can give candidates tiles likely to contain `coord`.
 * Otherwise the lookup process starts from the root of `layer`.
 *
 * @return {boolean} true if successful, false if we couldn't lookup the elevation at the given coords
 */
/* istanbul ignore next */
function placeObjectOnGround(layer, crs, obj, options = {}, tileHint) {
    console.warn('placeObjectOnGround has been deprecated because it needs review and test');
    let tiles;
    if (tileHint) {
        tiles = tileHint.concat(layer.level0Nodes);
    } else {
        tiles = layer.level0Nodes;
    }

    if (!options.modifyGeometry) {
        if (options.cache) {
            options.cache.length = 1;
        }
        const matrices = {
            worldFromLocal: obj.parent ? obj.parent.matrixWorld : undefined,
            localFromWorld: obj.parent ? new THREE.Matrix4().copy(obj.parent.matrixWorld).invert() : undefined,
        };
        const result = _updateVector3(
            layer,
            options.method || DEMUtils.FAST_READ_Z,
            tiles,
            crs,
            obj.position,
            options.offset || 0,
            matrices,
            undefined,
            options.cache ? options.cache[0] : undefined);

        if (result) {
            if (options.cache) {
                options.cache[0] = result;
            }
            obj.updateMatrix();
            obj.updateMatrixWorld();
            return true;
        }
    } else {
        const matrices = {
            worldFromLocal: obj.matrixWorld,
            localFromWorld: new THREE.Matrix4().copy(obj.matrixWorld).invert(),
        };

        const geometry = obj.geometry;
        if (geometry.vertices) {
            if (options.cache) {
                options.cache.length = geometry.vertices.length;
            }

            let success = true;
            const coord = new Coordinates(crs);
            for (let i = 0; i < geometry.vertices.length; i++) {
                const cached = options.cache ? options.cache[i] : undefined;

                const result = _updateVector3(
                    layer,
                    options.method || DEMUtils.FAST_READ_Z,
                    tiles,
                    crs,
                    geometry.vertices[i],
                    options.offset || 0,
                    matrices,
                    coord,
                    cached);

                if (options.cache) {
                    options.cache[i] = result;
                }
                if (!result) {
                    success = false;
                }
            }
            geometry.verticesNeedUpdate = true;
            return success;
        } else if (geometry.isBufferGeometry) {
            if (options.cache) {
                options.cache.length = geometry.attributes.position.count;
            }
            let success = true;

            const tmp = new THREE.Vector3();
            const coord = new Coordinates(crs);
            for (let i = 0; i < geometry.attributes.position.count; i++) {
                const cached = options.cache ? options.cache[i] : undefined;

                tmp.fromBufferAttribute(geometry.attributes.position, i);
                const prev = tmp.z;
                const result = _updateVector3(
                    layer,
                    options.method || DEMUtils.FAST_READ_Z,
                    tiles,
                    crs,
                    tmp,
                    options.offset || 0,
                    matrices,
                    coord,
                    cached);
                if (options.cache) {
                    options.cache[i] = result;
                }
                if (!result) {
                    success = false;
                }
                if (prev != tmp.z) {
                    geometry.attributes.position.needsUpdate = true;
                }
                geometry.attributes.position.setXYZ(i, tmp.x, tmp.y, tmp.z);
            }
            return success;
        }
    }
}

export default placeObjectOnGround;
