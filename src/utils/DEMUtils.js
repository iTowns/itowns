import * as THREE from 'three';
import Coordinates from '../Core/Geographic/Coordinates';

const FAST_READ_Z = 0;
const PRECISE_READ_Z = 1;

/**
 * Utility module to retrieve elevation at a given coordinates.
 * The returned value is read in the elevation textures used by the graphics card
 * to render the tiles (globe or plane).
 * This implies that the return value may change depending on the current tile resolution.
 */
export default {
    /**
     * Return current displayed elevation at coord in meters.
     * @param {GeometryLayer} layer The tile layer owning the elevation textures we're going to query.
     * This is typically the globeLayer or a planeLayer.
     * @param {Coordinates} coord The coordinates that we're interested in
     * @param {Number} method 2 available method: FAST_READ_Z (default) or PRECISE_READ_Z. Chosing between
     * the 2 is a compromise between performance and visual quality
     * @param {Array} tileHint Optional array of tiles to speed up the process. You can give candidates tiles
     * likely to contain 'coord'. Otherwise the lookup process starts from the root.
     * @return {object}  undefined if no result or z: displayed elevation in meters, texture: where the z value comes from, tile: owner of the texture
     */
    getElevationValueAt(layer, coord, method = FAST_READ_Z, tileHint) {
        const result = _readZ(layer, method, coord, tileHint || layer.level0Nodes);
        if (result) {
            return { z: result.coord._values[2], texture: result.texture, tile: result.tile };
        }
    },

    /**
     * Helper method that will position an object directly on the ground.
     * @param {GeometryLayer} layer The tile layer owning the elevation textures we're going to query.
     * This is typically the globeLayer or a planeLayer.
     * @param {string} objectCRS the CRS used by the object coordinates. You probably want to use view.referenceCRS here.
     * @param {Object3D} obj the object we want to modify.
     * @param {object} options
     * @param {number} options.method see getElevationValueAt documentation
     * @param {boolean} options.modifyGeometry if unset/false, this function will modify object.position. If true, it will
     * modify obj.geometry.vertices or obj.geometry.attributes.position
     * @param {Array} tileHint see getElevationValueAt documentation
     * @return {boolean} true if successful, false if we couldn't lookup the elevation at the given coords
     */
    placeObjectOnGround(layer, objectCRS, obj, options = {}, tileHint) {
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
                localFromWorld: obj.parent ? new THREE.Matrix4().getInverse(obj.parent.matrixWorld) : undefined,
            };
            const result = _updateVector3(
                layer,
                options.method || FAST_READ_Z,
                tiles,
                objectCRS,
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
                localFromWorld: new THREE.Matrix4().getInverse(obj.matrixWorld),
            };

            const geometry = obj.geometry;
            if (geometry.vertices) {
                if (options.cache) {
                    options.cache.length = geometry.vertices.length;
                }

                let success = true;
                const coord = new Coordinates(objectCRS);
                for (let i = 0; i < geometry.vertices.length; i++) {
                    const cached = options.cache ? options.cache[i] : undefined;

                    const result = _updateVector3(
                        layer,
                        options.method || FAST_READ_Z,
                        tiles,
                        objectCRS,
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
            } else if (geometry instanceof THREE.BufferGeometry) {
                if (options.cache) {
                    options.cache.length = geometry.attributes.position.count;
                }
                let success = true;

                const tmp = new THREE.Vector3();
                const coord = new Coordinates(objectCRS);
                for (let i = 0; i < geometry.attributes.position.count; i++) {
                    const cached = options.cache ? options.cache[i] : undefined;

                    tmp.fromBufferAttribute(geometry.attributes.position, i);
                    const prev = tmp.z;
                    const result = _updateVector3(
                        layer,
                        options.method || FAST_READ_Z,
                        tiles,
                        objectCRS,
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
    },
    FAST_READ_Z,
    PRECISE_READ_Z,
};

function tileAt(pt, tile) {
    if (tile.extent) {
        if (!tile.extent.isPointInside(pt)) {
            return undefined;
        }

        for (let i = 0; i < tile.children.length; i++) {
            const t = tileAt(pt, tile.children[i]);
            if (t) {
                return t;
            }
        }
        if (tile.material.isElevationLayerLoaded()) {
            return tile;
        }
        return undefined;
    }
}

let _canvas;
function _readTextureValueAt(layer, texture, ...uv) {
    for (let i = 0; i < uv.length; i += 2) {
        uv[i] = THREE.Math.clamp(uv[i], 0, texture.image.width - 1);
        uv[i + 1] = THREE.Math.clamp(uv[i + 1], 0, texture.image.height - 1);
    }

    if (texture.image.data) {
        // read a single value
        if (uv.length === 2) {
            return texture.image.data[uv[1] * texture.image.width + uv[0]];
        }
        // or read multiple values
        const result = [];
        for (let i = 0; i < uv.length; i += 2) {
            result.push(texture.image.data[uv[i + 1] * texture.image.width + uv[i]]);
        }
        return result;
    } else {
        if (!_canvas) {
            _canvas = document.createElement('canvas');
            _canvas.width = 2;
            _canvas.height = 2;
        }
        let minx = Infinity;
        let miny = Infinity;
        let maxx = -Infinity;
        let maxy = -Infinity;
        for (let i = 0; i < uv.length; i += 2) {
            minx = Math.min(uv[i], minx);
            miny = Math.min(uv[i + 1], miny);
            maxx = Math.max(uv[i], maxx);
            maxy = Math.max(uv[i + 1], maxy);
        }
        const dw = maxx - minx + 1;
        const dh = maxy - miny + 1;
        _canvas.width = Math.max(_canvas.width, dw);
        _canvas.height = Math.max(_canvas.height, dh);

        const ctx = _canvas.getContext('2d');
        ctx.drawImage(texture.image, minx, miny, dw, dh, 0, 0, dw, dh);
        const d = ctx.getImageData(0, 0, dw, dh);

        const result = [];
        for (let i = 0; i < uv.length; i += 2) {
            const ox = uv[i] - minx;
            const oy = uv[i + 1] - miny;

            // d is 4 bytes per pixel
            result.push(THREE.Math.lerp(
                layer.materialOptions.colorTextureElevationMinZ,
                layer.materialOptions.colorTextureElevationMaxZ,
                d.data[4 * oy * dw + 4 * ox] / 255));
        }
        if (uv.length === 2) {
            return result[0];
        } else {
            return result;
        }
    }
}

function _convertUVtoTextureCoords(texture, u, v) {
    const width = texture.image.width;
    const height = texture.image.height;

    const up = Math.max(0, u * width - 0.5);
    const vp = Math.max(0, v * height - 0.5);

    const u1 = Math.floor(up);
    const u2 = Math.ceil(up);
    const v1 = Math.floor(vp);
    const v2 = Math.ceil(vp);

    const wu = up - u1;
    const wv = vp - v1;

    return { u1, u2, v1, v2, wu, wv };
}

function _readTextureValueNearestFiltering(layer, texture, vertexU, vertexV) {
    const coords = _convertUVtoTextureCoords(texture, vertexU, vertexV);

    const u = (coords.wu <= 0) ? coords.u1 : coords.u2;
    const v = (coords.wv <= 0) ? coords.v1 : coords.v2;

    return _readTextureValueAt(layer, texture, u, v);
}

function _readTextureValueWithBilinearFiltering(layer, texture, vertexU, vertexV) {
    const coords = _convertUVtoTextureCoords(texture, vertexU, vertexV);

    const [z11, z21, z12, z22] = _readTextureValueAt(layer, texture,
        coords.u1, coords.v1,
        coords.u2, coords.v1,
        coords.u1, coords.v2,
        coords.u2, coords.v2);

    // horizontal filtering
    const zu1 = THREE.Math.lerp(z11, z21, coords.wu);
    const zu2 = THREE.Math.lerp(z12, z22, coords.wu);
    // then vertical filtering
    return THREE.Math.lerp(zu1, zu2, coords.wv);
}


function _readZFast(layer, texture, uv) {
    return _readTextureValueNearestFiltering(layer, texture, uv.x, uv.y);
}

function _readZCorrect(layer, texture, uv, tileDimensions, tileOwnerDimensions) {
    // We need to emulate the vertex shader code that does 2 thing:
    //   - interpolate (u, v) between triangle vertices: u,v will be multiple of 1/nsegments
    //     (for now assume nsegments == 16)
    //   - read elevation texture at (u, v) for

    // Determine u,v based on the vertices count.
    // 'modulo' is the gap (in [0, 1]) between 2 successive vertices in the geometry
    // e.g if you have 5 vertices, the only possible values for u (or v) are: 0, 0.25, 0.5, 0.75, 1
    // so modulo would be 0.25
    // note: currently the number of segments is hard-coded to 16 (see TileProvider) => 17 vertices
    const modulo = (tileDimensions.x / tileOwnerDimensions.x) / (17 - 1);
    let u = Math.floor(uv.x / modulo) * modulo;
    let v = Math.floor(uv.y / modulo) * modulo;

    if (u == 1) {
        u -= modulo;
    }
    if (v == 1) {
        v -= modulo;
    }

    // Build 4 vertices, 3 of them will be our triangle:
    //    11---21
    //    |   / |
    //    |  /  |
    //    | /   |
    //    21---22
    const u1 = u;
    const u2 = u + modulo;
    const v1 = v;
    const v2 = v + modulo;

    // Our multiple z-value will be weigh-blended, depending on the distance of the real point
    // so lu (resp. lv) are the weight. When lu -> 0 (resp. 1) the final value -> z at u1 (resp. u2)
    const lu = (uv.x - u) / modulo;
    const lv = (uv.y - v) / modulo;


    // Determine if we're going to read the vertices from the top-left or lower-right triangle
    // (low-right = on the line 21-22 or under the diagonal lu = 1 - lv)
    const lowerRightTriangle = (lv == 1) || lu / (1 - lv) >= 1;

    const tri = new THREE.Triangle(
        new THREE.Vector3(u1, v2),
        new THREE.Vector3(u2, v1),
        lowerRightTriangle ? new THREE.Vector3(u2, v2) : new THREE.Vector3(u1, v1));

    // bary holds the respective weight of each vertices of the triangles
    const bary = tri.barycoordFromPoint(new THREE.Vector3(uv.x, uv.y));

    // read the 3 interesting values
    const z1 = _readTextureValueWithBilinearFiltering(layer, texture, tri.a.x, tri.a.y);
    const z2 = _readTextureValueWithBilinearFiltering(layer, texture, tri.b.x, tri.b.y);
    const z3 = _readTextureValueWithBilinearFiltering(layer, texture, tri.c.x, tri.c.y);

    // Blend with bary
    return z1 * bary.x + z2 * bary.y + z3 * bary.z;
}

const temp = {
    v: new THREE.Vector3(),
    coord1: new Coordinates('EPSG:4978'),
    coord2: new Coordinates('EPSG:4978'),
    offset: new THREE.Vector2(),
};

function _readZ(layer, method, coord, nodes, cache) {
    const pt = coord.as(layer.extent.crs(), temp.coord1);

    let tileWithValidElevationTexture = null;
    // first check in cache
    if (cache && cache.tile && cache.tile.material) {
        tileWithValidElevationTexture = tileAt(pt, cache.tile);
    }
    for (let i = 0; !tileWithValidElevationTexture && i < nodes.length; i++) {
        tileWithValidElevationTexture = tileAt(pt, nodes[i]);
    }

    if (!tileWithValidElevationTexture) {
        // failed to find a tile, abort
        return;
    }

    const tile = tileWithValidElevationTexture;
    const texturesInfo = tileWithValidElevationTexture.material.getLayerTextures({ type: 'elevation' });

    const src = texturesInfo.textures[0];
    // check cache value if existing
    if (cache) {
        if (cache.id === src.id && cache.version === src.version) {
            return { coord: pt, texture: src, tile };
        }
    }

    // Assuming that tiles are split in 4 children, we lookup the parent that
    // really owns this texture
    const stepsUpInHierarchy = Math.round(Math.log2(1.0 /
        texturesInfo.offsetScales[0].z));
    for (let i = 0; i < stepsUpInHierarchy; i++) {
        tileWithValidElevationTexture = tileWithValidElevationTexture.parent;
    }

    // offset = offset from top-left
    const offset = pt.offsetInExtent(tileWithValidElevationTexture.extent, temp.offset);

    // At this point we have:
    //   - tileWithValidElevationTexture.texture.image which is the current image
    //     used for rendering
    //   - offset which is the offset in this texture for the coordinate we're
    //     interested in
    // We now have 2 options:
    //   - the fast one: read the value of tileWithValidElevationTexture.texture.image
    //     at (offset.x, offset.y) and we're done
    //   - the correct one: emulate the vertex shader code
    if (method == PRECISE_READ_Z) {
        pt._values[2] = _readZCorrect(layer, src, offset, tile.extent.dimensions(), tileWithValidElevationTexture.extent.dimensions());
    } else {
        pt._values[2] = _readZFast(layer, src, offset);
    }
    return { coord: pt, texture: src, tile };
}


function _updateVector3(layer, method, nodes, vecCRS, vec, offset, matrices = {}, coords, cache) {
    const coord = coords || new Coordinates(vecCRS);
    if (matrices.worldFromLocal) {
        coord.set(vecCRS, temp.v.copy(vec).applyMatrix4(matrices.worldFromLocal));
    } else {
        coord.set(vecCRS, vec);
    }
    const result = _readZ(layer, method, coord, nodes, cache);
    if (result) {
        result.coord._values[2] += offset;
        result.coord.as(vecCRS, temp.coord2).xyz(vec);
        if (matrices.localFromWorld) {
            vec.applyMatrix4(matrices.localFromWorld);
        }
        return { id: result.texture.id, version: result.texture.version, tile: result.tile };
    }
}

