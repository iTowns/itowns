import * as THREE from 'three';
import CacheRessource from './Scheduler/Providers/CacheRessource';

const cache = CacheRessource(); // TODO /!\ singleton

function Buffers() {
    this.index = null;
    this.position = null;
    this.normal = null;
    // 2 UV set per tile: wgs84 and pm
    //    - wgs84: 1 texture per tile because tiles are using wgs84 projection
    //    - pm: use multiple textures per tile.
    //      +-------------------------+
    //      |                         |
    //      |     Texture 0           |
    //      +-------------------------+
    //      |                         |
    //      |     Texture 1           |
    //      +-------------------------+
    //      |                         |
    //      |     Texture 2           |
    //      +-------------------------+
    //        * u = wgs84.u
    //        * v = textureid + v in this texture
    this.uv = {
        wgs84: null,
        pm: null,
    };
}

function TileGeometry(params, builder) {
    // Constructor
    THREE.BufferGeometry.call(this);

    this.center = builder.Center(params.extent).clone();
    this.extent = params.extent;

    const bufferAttribs = this.computeBuffers(params, builder);

    this.setIndex(bufferAttribs.index);
    this.addAttribute('position', bufferAttribs.position);
    this.addAttribute('normal', bufferAttribs.normal);
    this.addAttribute('uv_wgs84', bufferAttribs.uv.wgs84);
    this.addAttribute('uv_pm', bufferAttribs.uv.pm);

    this.computeBoundingBox();
    this.OBB = builder.OBB(this.boundingBox);
}


TileGeometry.prototype = Object.create(THREE.BufferGeometry.prototype);

TileGeometry.prototype.constructor = TileGeometry;

TileGeometry.prototype.computeBuffers = function computeBuffers(params, builder) {
    // Create output buffers.
    const outBuffers = new Buffers();

    const nSeg = params.segment;
    // segments count :
    // Tile : (nSeg + 1) * (nSeg + 1)
    // Skirt : 8 * (nSeg - 1)
    const nVertex = (nSeg + 1) * (nSeg + 1) + (params.disableSkirt ? 0 : 4 * nSeg);
    const triangles = (nSeg) * (nSeg) * 2 + (params.disableSkirt ? 0 : 4 * nSeg * 2);

    outBuffers.position = new THREE.BufferAttribute(new Float32Array(nVertex * 3), 3);
    outBuffers.normal = new THREE.BufferAttribute(new Float32Array(nVertex * 3), 3);
    outBuffers.uv.pm = new THREE.BufferAttribute(new Float32Array(nVertex), 1);

    // Read previously cached values (index and uv.wgs84 only depend on the # of triangles)
    const cacheKey = `${builder.type}_${params.disableSkirt ? 0 : 1}_${params.segment}`;
    const cachedBuffers = cache.getRessource(cacheKey);
    const mustBuildIndexAndWGS84 = !cachedBuffers;
    if (cachedBuffers) {
        outBuffers.index = cachedBuffers.index;
        outBuffers.uv.wgs84 = cachedBuffers.uvwgs84;
    } else {
        outBuffers.index = new THREE.BufferAttribute(
            new Uint32Array(triangles * 3), 1);
        outBuffers.uv.wgs84 = new THREE.BufferAttribute(
            new Float32Array(nVertex * 2), 2);

        // Update cache
        cache.addRessource(cacheKey, {
            index: outBuffers.index,
            uvwgs84: outBuffers.uv.wgs84,
        });
    }

    var widthSegments = Math.max(2, Math.floor(nSeg) || 2);
    var heightSegments = Math.max(2, Math.floor(nSeg) || 2);

    var idVertex = 0;
    const vertices = [];
    let skirt = [];
    const skirtEnd = [];

    builder.Prepare(params);

    var UV_WGS84 = function UV_WGS84() {};
    var UV_PM = function UV_PM() {};

    // Define UV computation functions if needed
    if (mustBuildIndexAndWGS84) {
        UV_WGS84 = function UV_WGS84(out, id, u, v) {
            out.uv.wgs84.array[id * 2 + 0] = u;
            out.uv.wgs84.array[id * 2 + 1] = v;
        };
    }
    if (builder.getUV_PM) {
        UV_PM = function UV_PM(out, id, u) {
            out.uv.pm.array[id] = u;
        };
    }

    for (let y = 0; y <= heightSegments; y++) {
        var verticesRow = [];

        const v = y / heightSegments;

        builder.vProjecte(v, params);

        var uv_pm = builder.getUV_PM ? builder.getUV_PM(params) : undefined;

        for (let x = 0; x <= widthSegments; x++) {
            const u = x / widthSegments;
            const id_m3 = idVertex * 3;

            builder.uProjecte(u, params);

            const vertex = builder.VertexPosition(params, params.projected);
            const normal = builder.VertexNormal(params);

            // move geometry to center world
            vertex.sub(this.center);

            // align normal to z axis
            if (params.quatNormalToZ) {
                vertex.applyQuaternion(params.quatNormalToZ);
                normal.applyQuaternion(params.quatNormalToZ);
            }

            vertex.toArray(outBuffers.position.array, id_m3);
            normal.toArray(outBuffers.normal.array, id_m3);

            UV_WGS84(outBuffers, idVertex, u, v);
            UV_PM(outBuffers, idVertex, uv_pm);

            if (!params.disableSkirt) {
                if (y !== 0 && y !== heightSegments) {
                    if (x === widthSegments) {
                        skirt.push(idVertex);
                    } else if (x === 0) {
                        skirtEnd.push(idVertex);
                    }
                }
            }

            verticesRow.push(idVertex);

            idVertex++;
        }

        vertices.push(verticesRow);

        if (y === 0) {
            skirt = skirt.concat(verticesRow);
        } else if (y === heightSegments) {
            skirt = skirt.concat(verticesRow.slice().reverse());
        }
    }

    if (!params.disableSkirt) {
        skirt = skirt.concat(skirtEnd.reverse());
    }

    function bufferize(va, vb, vc, idVertex) {
        outBuffers.index.array[idVertex + 0] = va;
        outBuffers.index.array[idVertex + 1] = vb;
        outBuffers.index.array[idVertex + 2] = vc;
        return idVertex + 3;
    }

    let idVertex2 = 0;

    if (mustBuildIndexAndWGS84) {
        for (let y = 0; y < heightSegments; y++) {
            for (let x = 0; x < widthSegments; x++) {
                const v1 = vertices[y][x + 1];
                const v2 = vertices[y][x];
                const v3 = vertices[y + 1][x];
                const v4 = vertices[y + 1][x + 1];

                idVertex2 = bufferize(v4, v2, v1, idVertex2);
                idVertex2 = bufferize(v4, v3, v2, idVertex2);
            }
        }
    }

    const iStart = idVertex;

    // TODO: WARNING beware skirt's size influences performance
    // The size of the skirt is now a ratio of the size of the tile.
    // To be perfect it should depend on the real elevation delta but too heavy to compute
    if (!params.disableSkirt) {
        // We compute the actual size of tile segment to use later for the skirt.
        const segmentSize = new THREE.Vector3().fromArray(outBuffers.position.array).distanceTo(
            new THREE.Vector3().fromArray(outBuffers.position.array, 3));

        var buildIndexSkirt = function buildIndexSkirt() {};
        var buildUVSkirt = function buildUVSkirt() {};

        if (mustBuildIndexAndWGS84) {
            buildIndexSkirt = function buildIndexSkirt(id, v1, v2, v3, v4) {
                id = bufferize(v1, v2, v3, id);
                id = bufferize(v1, v3, v4, id);
                return id;
            };

            buildUVSkirt = function buildUVSkirt(id) {
                outBuffers.uv.wgs84.array[idVertex * 2 + 0] = outBuffers.uv.wgs84.array[id * 2 + 0];
                outBuffers.uv.wgs84.array[idVertex * 2 + 1] = outBuffers.uv.wgs84.array[id * 2 + 1];
            };
        }

        for (let i = 0; i < skirt.length; i++) {
            const id = skirt[i];
            const id_m3 = idVertex * 3;
            const id2_m3 = id * 3;

            outBuffers.position.array[id_m3 + 0] = outBuffers.position.array[id2_m3 + 0]
                - outBuffers.normal.array[id2_m3 + 0] * segmentSize;
            outBuffers.position.array[id_m3 + 1] = outBuffers.position.array[id2_m3 + 1]
                - outBuffers.normal.array[id2_m3 + 1] * segmentSize;
            outBuffers.position.array[id_m3 + 2] = outBuffers.position.array[id2_m3 + 2]
                - outBuffers.normal.array[id2_m3 + 2] * segmentSize;

            outBuffers.normal.array[id_m3 + 0] = outBuffers.normal.array[id2_m3 + 0];
            outBuffers.normal.array[id_m3 + 1] = outBuffers.normal.array[id2_m3 + 1];
            outBuffers.normal.array[id_m3 + 2] = outBuffers.normal.array[id2_m3 + 2];

            buildUVSkirt(id);

            outBuffers.uv.pm.array[idVertex] = outBuffers.uv.pm.array[id];

            const idf = (i + 1) % skirt.length;

            const v1 = id;
            const v2 = idVertex;
            const v3 = (idf === 0) ? iStart : idVertex + 1;
            const v4 = skirt[idf];

            idVertex2 = buildIndexSkirt(idVertex2, v1, v2, v3, v4);

            idVertex++;
        }
    }

    return outBuffers;
};

export default TileGeometry;
