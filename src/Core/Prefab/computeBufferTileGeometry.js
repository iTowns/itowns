import * as THREE from 'three';

export default function computeBuffers(params) {
    // Create output buffers.
    const outBuffers = {
        index: null,
        position: null,
        normal: null,
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
        //        * v = textureid + v in builder texture
        uv: {
            wgs84: null,
            pm: null,
        },
    };

    const builder = params.builder;

    const nSeg = params.segment;
    // segments count :
    // Tile : (nSeg + 1) * (nSeg + 1)
    // Skirt : 8 * (nSeg - 1)
    const nVertex = (nSeg + 1) * (nSeg + 1) + (params.disableSkirt ? 0 : 4 * nSeg);
    const triangles = (nSeg) * (nSeg) * 2 + (params.disableSkirt ? 0 : 4 * nSeg * 2);

    outBuffers.position = new Float32Array(nVertex * 3);
    outBuffers.normal = new Float32Array(nVertex * 3);
    outBuffers.uv.pm = new Float32Array(nVertex);

    if (params.buildIndexAndWGS84) {
        outBuffers.index = new Uint32Array(triangles * 3);
        outBuffers.uv.wgs84 = new Float32Array(nVertex * 2);
    }

    const widthSegments = Math.max(2, Math.floor(nSeg) || 2);
    const heightSegments = Math.max(2, Math.floor(nSeg) || 2);

    let idVertex = 0;
    const vertices = [];
    let skirt = [];
    const skirtEnd = [];

    builder.prepare(params);

    let UV_WGS84 = function UV_WGS84() { };
    let UV_PM = function UV_PM() { };

    // Define UV computation functions if needed
    if (params.buildIndexAndWGS84) {
        UV_WGS84 = function UV_WGS84(out, id, u, v) {
            out.uv.wgs84[id * 2 + 0] = u;
            out.uv.wgs84[id * 2 + 1] = v;
        };
    }
    if (builder.getUV_PM) {
        UV_PM = function UV_PM(out, id, u) {
            out.uv.pm[id] = u;
        };
    }

    for (let y = 0; y <= heightSegments; y++) {
        const verticesRow = [];
        const v = y / heightSegments;

        builder.vProjecte(v, params);

        const uv_pm = builder.getUV_PM ? builder.getUV_PM(params) : undefined;

        for (let x = 0; x <= widthSegments; x++) {
            const u = x / widthSegments;
            const id_m3 = idVertex * 3;

            builder.uProjecte(u, params);

            const vertex = builder.vertexPosition(params, params.projected);
            const normal = builder.vertexNormal(params);

            // move geometry to center world
            vertex.sub(params.center);

            // align normal to z axis
            if (params.quatNormalToZ) {
                vertex.applyQuaternion(params.quatNormalToZ);
                normal.applyQuaternion(params.quatNormalToZ);
            }

            vertex.toArray(outBuffers.position, id_m3);
            normal.toArray(outBuffers.normal, id_m3);

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
        outBuffers.index[idVertex + 0] = va;
        outBuffers.index[idVertex + 1] = vb;
        outBuffers.index[idVertex + 2] = vc;
        return idVertex + 3;
    }

    let idVertex2 = 0;

    if (params.buildIndexAndWGS84) {
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
        const segmentSize = new THREE.Vector3().fromArray(outBuffers.position).distanceTo(
            new THREE.Vector3().fromArray(outBuffers.position, 3));

        let buildIndexSkirt = function buildIndexSkirt() { };
        let buildUVSkirt = function buildUVSkirt() { };

        if (params.buildIndexAndWGS84) {
            buildIndexSkirt = function buildIndexSkirt(id, v1, v2, v3, v4) {
                id = bufferize(v1, v2, v3, id);
                id = bufferize(v1, v3, v4, id);
                return id;
            };

            buildUVSkirt = function buildUVSkirt(id) {
                outBuffers.uv.wgs84[idVertex * 2 + 0] = outBuffers.uv.wgs84[id * 2 + 0];
                outBuffers.uv.wgs84[idVertex * 2 + 1] = outBuffers.uv.wgs84[id * 2 + 1];
            };
        }

        for (let i = 0; i < skirt.length; i++) {
            const id = skirt[i];
            const id_m3 = idVertex * 3;
            const id2_m3 = id * 3;

            outBuffers.position[id_m3 + 0] = outBuffers.position[id2_m3 + 0]
                - outBuffers.normal[id2_m3 + 0] * segmentSize;
            outBuffers.position[id_m3 + 1] = outBuffers.position[id2_m3 + 1]
                - outBuffers.normal[id2_m3 + 1] * segmentSize;
            outBuffers.position[id_m3 + 2] = outBuffers.position[id2_m3 + 2]
                - outBuffers.normal[id2_m3 + 2] * segmentSize;

            outBuffers.normal[id_m3 + 0] = outBuffers.normal[id2_m3 + 0];
            outBuffers.normal[id_m3 + 1] = outBuffers.normal[id2_m3 + 1];
            outBuffers.normal[id_m3 + 2] = outBuffers.normal[id2_m3 + 2];

            buildUVSkirt(id);

            outBuffers.uv.pm[idVertex] = outBuffers.uv.pm[id];

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
}
