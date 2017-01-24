/* global  Uint32Array */

/**
 * Generated On: 2015-10-5
 * Class: TileGeometry
 * Description: Tuile géométrique. Buffer des vertex et des faces
 */
/* global Float32Array*/
import * as THREE from 'three';
import CacheRessource from '../Core/Commander/Providers/CacheRessource';

// TODO Why? it's not necessary

var cache = CacheRessource(); // TODO /!\ singleton


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

    this.center = builder.Center(params);
    this.OBB = builder.OBB(params);

    // TODO : free array

    var bufferAttribs = this.computeBuffers(params, builder);

    this.setIndex(bufferAttribs.index);
    this.addAttribute('position', bufferAttribs.position);
    this.addAttribute('normal', bufferAttribs.normal);
    this.addAttribute('uv_wgs84', bufferAttribs.uv.wgs84);
    this.addAttribute('uv_pm', bufferAttribs.uv.pm);

    bufferAttribs.position = null;
    bufferAttribs.normal = null;
    bufferAttribs.uv.pm = null;

    // Update cache
    if (!cache.getRessource(params.segment)) {
        cache.addRessource(params.segment, bufferAttribs);
    }

    // ---> for SSE
    this.computeBoundingSphere();
}


TileGeometry.prototype = Object.create(THREE.BufferGeometry.prototype);

TileGeometry.prototype.constructor = TileGeometry;

TileGeometry.prototype.computeBuffers = function computeBuffers(params, builder) {
    // Create output buffers.
    var outBuffers = new Buffers();
    // Create temp buffers
    var scratchBuffers = new Buffers();

    var nSeg = params.segment || 32;
    var nVertex = (nSeg + 1) * (nSeg + 1) + 8 * (nSeg - 1); // correct pour uniquement les vertex
    var triangles = (nSeg) * (nSeg) + 16 * (nSeg - 1); // correct pour uniquement les vertex

    scratchBuffers.position = new Float32Array(nVertex * 3);
    scratchBuffers.normal = new Float32Array(nVertex * 3);
    scratchBuffers.uv.pm = new Float32Array(nVertex);

    // Read previously cached values
    var cachedBuffers = cache.getRessource(params.segment);
    if (cachedBuffers) {
        outBuffers.index = cachedBuffers.index;
        outBuffers.uv.wgs84 = cachedBuffers.uv.wgs84;
    } else {
        scratchBuffers.index = new Uint32Array(triangles * 3 * 2);
        scratchBuffers.uv.wgs84 = new Float32Array(nVertex * 2);
    }

    var widthSegments = Math.max(2, Math.floor(nSeg) || 2);
    var heightSegments = Math.max(2, Math.floor(nSeg) || 2);

    var idVertex = 0;
    let x;
    let y;
    const vertices = [];
    let skirt = [];
    const skirtEnd = [];
    let u;
    let v;

    builder.Prepare(params);

    var UV_WGS84 = function UV_WGS84() {};
    var UV_PM = function UV_PM() {};

    // Define UV computation functions if needed
    if (outBuffers.uv.wgs84 === null) {
        UV_WGS84 = function UV_WGS84(out, id, u, v) {
            out.uv.wgs84[id * 2 + 0] = u;
            out.uv.wgs84[id * 2 + 1] = v;
        };
    }
    if (outBuffers.uv.pm === null && builder.getUV_PM) {
        UV_PM = function UV_PM(out, id, u) {
            out.uv.pm[id] = u;
        };
    }

    let id_m3;
    let v1;
    let v2;
    let v3;
    let v4;

    for (y = 0; y <= heightSegments; y++) {
        var verticesRow = [];

        v = y / heightSegments;

        builder.vProjecte(v, params);

        var uv_pm = builder.getUV_PM ? builder.getUV_PM(params) : undefined;

        for (x = 0; x <= widthSegments; x++) {
            u = x / widthSegments;

            builder.uProjecte(u, params);

            var vertex = builder.VertexPosition(params, params.projected);

            id_m3 = idVertex * 3;

            scratchBuffers.position[id_m3 + 0] = vertex.x() - this.center.x;
            scratchBuffers.position[id_m3 + 1] = vertex.y() - this.center.y;
            scratchBuffers.position[id_m3 + 2] = vertex.z() - this.center.z;

            var normal = builder.VertexNormal(params);

            scratchBuffers.normal[id_m3 + 0] = normal.x;
            scratchBuffers.normal[id_m3 + 1] = normal.y;
            scratchBuffers.normal[id_m3 + 2] = normal.z;

            UV_WGS84(scratchBuffers, idVertex, u, v);
            UV_PM(scratchBuffers, idVertex, uv_pm);

            if (y !== 0 && y !== heightSegments) {
                if (x === widthSegments) {
                    skirt.push(idVertex);
                } else if (x === 0) {
                    skirtEnd.push(idVertex);
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

    skirt = skirt.concat(skirtEnd.reverse());

    function bufferize(va, vb, vc, idVertex) {
        scratchBuffers.index[idVertex + 0] = va;
        scratchBuffers.index[idVertex + 1] = vb;
        scratchBuffers.index[idVertex + 2] = vc;
        return idVertex + 3;
    }

    var idVertex2 = 0;

    if (outBuffers.index === null) {
        for (y = 0; y < heightSegments; y++) {
            for (x = 0; x < widthSegments; x++) {
                v1 = vertices[y][x + 1];
                v2 = vertices[y][x];
                v3 = vertices[y + 1][x];
                v4 = vertices[y + 1][x + 1];

                idVertex2 = bufferize(v4, v2, v1, idVertex2);
                idVertex2 = bufferize(v4, v3, v2, idVertex2);
            }
        }
    }

    var iStart = idVertex;

    // TODO: WARNING beware skirt's size influences performance
    // Fix Me: Compute correct the skirt's size : minimize the size without crack between tiles
    // This size must be take into account the bbox's size
    // For the moment, I reduce the size to increase performance (pixel shader performance)

    const r = 5 * ((20 - params.level) + 10);

    var buildIndexSkirt = function buildIndexSkirt() {};
    var buildUVSkirt = function buildUVSkirt() {};

    if (outBuffers.index === null) {
        buildIndexSkirt = function buildIndexSkirt(id, v1, v2, v3, v4) {
            id = bufferize(v1, v2, v3, id);
            id = bufferize(v1, v3, v4, id);
            return id;
        };

        buildUVSkirt = function buildUVSkirt(id) {
            scratchBuffers.uv.wgs84[idVertex * 2 + 0] = scratchBuffers.uv.wgs84[id * 2 + 0];
            scratchBuffers.uv.wgs84[idVertex * 2 + 1] = scratchBuffers.uv.wgs84[id * 2 + 1];
        };
    }

    for (var i = 0; i < skirt.length; i++) {
        var id = skirt[i];
        id_m3 = idVertex * 3;
        var id2_m3 = id * 3;

        scratchBuffers.position[id_m3 + 0] = scratchBuffers.position[id2_m3 + 0] - scratchBuffers.normal[id2_m3 + 0] * r;
        scratchBuffers.position[id_m3 + 1] = scratchBuffers.position[id2_m3 + 1] - scratchBuffers.normal[id2_m3 + 1] * r;
        scratchBuffers.position[id_m3 + 2] = scratchBuffers.position[id2_m3 + 2] - scratchBuffers.normal[id2_m3 + 2] * r;

        scratchBuffers.normal[id_m3 + 0] = scratchBuffers.normal[id2_m3 + 0];
        scratchBuffers.normal[id_m3 + 1] = scratchBuffers.normal[id2_m3 + 1];
        scratchBuffers.normal[id_m3 + 2] = scratchBuffers.normal[id2_m3 + 2];

        buildUVSkirt(id);

        scratchBuffers.uv.pm[idVertex] = scratchBuffers.uv.pm[id];

        var idf = (i + 1) % skirt.length;

        v1 = id;
        v2 = idVertex;
        v3 = idVertex + 1;
        v4 = skirt[idf];

        if (idf === 0) {
            v3 = iStart;
        }

        idVertex2 = buildIndexSkirt(idVertex2, v1, v2, v3, v4);

        idVertex++;
    }

    // Copy missing buffer in outBuffers from scratchBuffers
    // TODO : free array
    if (outBuffers.index === null) {
        outBuffers.index = new THREE.BufferAttribute(scratchBuffers.index, 1);
    }
    outBuffers.position = new THREE.BufferAttribute(scratchBuffers.position, 3);
    outBuffers.normal = new THREE.BufferAttribute(scratchBuffers.normal, 3);
    if (outBuffers.uv.wgs84 === null) {
        outBuffers.uv.wgs84 = new THREE.BufferAttribute(scratchBuffers.uv.wgs84, 2);
    }
    outBuffers.uv.pm = new THREE.BufferAttribute(scratchBuffers.uv.pm, 1);

    scratchBuffers.position = null;
    scratchBuffers.bufferIndex = null;
    scratchBuffers.normal = null;
    scratchBuffers.uv.wgs84 = null;
    scratchBuffers.uv.pm = null;

    return outBuffers;
};

export default TileGeometry;
