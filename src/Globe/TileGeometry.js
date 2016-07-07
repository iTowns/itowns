"use strict";
/* global  Uint32Array */

/**
 * Generated On: 2015-10-5
 * Class: TileGeometry
 * Description: Tuile géométrique. Buffer des vertex et des faces
 */
 /* global Float32Array*/
define('Globe/TileGeometry', [
    'THREE',
    'Core/defaultValue',
    'Core/Math/MathExtented',
    'Core/System/JavaTools',
    'Core/Commander/Providers/CacheRessource'
], function(
    THREE,
    defaultValue,
    MathExt,
    JavaTools,
    CacheRessource
    ) {

    // TODO Why? it's not necessary
    "use strict";
    var cache = CacheRessource(); // TODO /!\ singleton


    function Buffers(nSegment)
    {

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
            'wgs84': null,
            'pm': null
        };

        var cBuff = cache.getRessource(nSegment);

        if(cBuff)
        {
            this.index = cBuff.index;
            this.uv.wgs84 = cBuff.uv.wgs84;
        }
    }

    function TileGeometry(params, builder) {
        //Constructor
        THREE.BufferGeometry.call(this);

        this.center = builder.Center(params);
        this.OBB = builder.OBB(params);

        // TODO : free array

        var buffersAttrib = this.computeBuffers(params,builder);

        this.setIndex(buffersAttrib.index);
        this.addAttribute('position', buffersAttrib.position);
        this.addAttribute('normal', buffersAttrib.normal);
        this.addAttribute('uv_wgs84', buffersAttrib.uv.wgs84);
        this.addAttribute('uv_pm', buffersAttrib.uv.pm);

        buffersAttrib.position = null;
        buffersAttrib.normal= null;
        buffersAttrib.uv.pm = null;

        if(!cache.getRessource(params.segment))
            cache.addRessource(params.segment, buffersAttrib);

        // ---> for SSE
        this.computeBoundingSphere();

    }


    TileGeometry.prototype = Object.create(THREE.BufferGeometry.prototype);

    TileGeometry.prototype.constructor = TileGeometry;

    TileGeometry.prototype.computeBuffers = function(params,builder)
    {
        var javToo = new JavaTools();
        var buffersAttrib = new Buffers(params.segment);
        var buffers = new Buffers();

        var nSeg = defaultValue(params.segment, 32);
        var nVertex = (nSeg + 1) * (nSeg + 1) + 8 * (nSeg - 1); // correct pour uniquement les vertex
        var triangles = (nSeg) * (nSeg) + 16 * (nSeg - 1); // correct pour uniquement les vertex

        buffers.position = new Float32Array(nVertex * 3);
        buffers.bufferIndex = buffersAttrib.index === null ? new Uint32Array(triangles * 3 * 2) : null;
        buffers.normal = new Float32Array(nVertex * 3);
        buffers.uv.wgs84 = buffersAttrib.uv.wgs84 === null ? new Float32Array(nVertex * 2) : null;
        buffers.uv.pm = new Float32Array(nVertex);

        var widthSegments = Math.max(2, Math.floor(nSeg) || 2);
        var heightSegments = Math.max(2, Math.floor(nSeg) || 2);

        var idVertex = 0;
        var x, y, vertices = [],
            skirt = [],
            skirtEnd = [];
        var u,v;

        builder.Prepare(params);

        var UV_WGS84 = function(){};
        var UV_PM = function(){};

        if(buffersAttrib.uv.wgs84 === null) {
            UV_WGS84 = function(u,v) {
                buffers.uv.wgs84[idVertex * 2 + 0] = u;
                buffers.uv.wgs84[idVertex * 2 + 1] = v;
            };
        }

        if(buffersAttrib.uv.pm === null && builder.getUV_PM) {
            UV_PM = function(u) {
                buffers.uv.pm[idVertex] = u;
            };
        }

        for (y = 0; y <= heightSegments; y++) {

            var verticesRow = [];

            v = y / heightSegments;

            builder.vProjecte(v,params);

            var uv_pm = builder.getUV_PM(params);

            for (x = 0; x <= widthSegments; x++) {

                u = x / widthSegments;

                builder.uProjecte(u,params);

                var vertex = builder.VertexPosition(params);

                var id_m3 = idVertex * 3;
                //
                buffers.position[id_m3 + 0] = vertex.x - this.center.x;
                buffers.position[id_m3 + 1] = vertex.y - this.center.y;
                buffers.position[id_m3 + 2] = vertex.z - this.center.z;

                var normal = builder.VertexNormal(params);

                buffers.normal[id_m3 + 0] = normal.x;
                buffers.normal[id_m3 + 1] = normal.y;
                buffers.normal[id_m3 + 2] = normal.z;

                UV_WGS84(u,v);
                UV_PM(uv_pm);

                if (y !== 0 && y !== heightSegments)
                    if (x === widthSegments)
                        skirt.push(idVertex);
                    else if (x === 0)
                    skirtEnd.push(idVertex);

                verticesRow.push(idVertex);

                idVertex++;

            }

            vertices.push(verticesRow);

            if (y === 0)
                skirt = skirt.concat(verticesRow);
            else if (y === heightSegments)
                skirt = skirt.concat(verticesRow.slice().reverse());

        }

        skirt = skirt.concat(skirtEnd.reverse());

        function bufferize(va, vb, vc, idVertex) {
            buffers.bufferIndex[idVertex + 0] = va;
            buffers.bufferIndex[idVertex + 1] = vb;
            buffers.bufferIndex[idVertex + 2] = vc;
            return idVertex+3;
        }

        var idVertex2 = 0;

        if(buffersAttrib.index === null)
            for (y = 0; y < heightSegments; y++) {

                for (x = 0; x < widthSegments; x++) {

                    var v1 = vertices[y][x + 1];
                    var v2 = vertices[y][x];
                    var v3 = vertices[y + 1][x];
                    var v4 = vertices[y + 1][x + 1];

                    idVertex2 = bufferize(v4, v2, v1, idVertex2);
                    idVertex2 = bufferize(v4, v3, v2, idVertex2);

                }
            }

        var iStart = idVertex;
        var rmax = 5000;
        var r = Math.max(rmax, Math.pow(rmax, 1 / params.zoom));

        r = isFinite(r) ? r : rmax;

        var buildIndexSkirt = function(){};
        var buildUVSkirt = function(){};


        if(buffersAttrib.index === null)
        {
            buildIndexSkirt = function(id,v1,v2,v3,v4)
            {
                id = bufferize(v1, v2, v3, id);
                id = bufferize(v1, v3, v4, id);
                return id;
            };

            buildUVSkirt = function(){
                buffers.uv.wgs84[idVertex * 2 + 0] = buffers.uv.wgs84[id * 2 + 0];
                buffers.uv.wgs84[idVertex * 2 + 1] = buffers.uv.wgs84[id * 2 + 1];
            };
        }


        for (var i = 0; i < skirt.length; i++) {

            var id = skirt[i];
            id_m3 = idVertex * 3;
            var id2_m3 = id * 3;

            buffers.position[id_m3 + 0] = buffers.position[id2_m3 + 0] - buffers.normal[id2_m3 + 0] * r;
            buffers.position[id_m3 + 1] = buffers.position[id2_m3 + 1] - buffers.normal[id2_m3 + 1] * r;
            buffers.position[id_m3 + 2] = buffers.position[id2_m3 + 2] - buffers.normal[id2_m3 + 2] * r;

            buffers.normal[id_m3 + 0] = buffers.normal[id2_m3 + 0];
            buffers.normal[id_m3 + 1] = buffers.normal[id2_m3 + 1];
            buffers.normal[id_m3 + 2] = buffers.normal[id2_m3 + 2];

            buildUVSkirt();

            buffers.uv.pm[idVertex] = buffers.uv.pm[id];

            var idf = (i + 1) % skirt.length;

            v1 = id;
            v2 = idVertex;
            v3 = idVertex + 1;
            v4 = skirt[idf];

            if (idf === 0)
                v3 = iStart;

            idVertex2 = buildIndexSkirt (idVertex2,v1,v2,v3,v4);

            idVertex++;

        }
         // TODO : free array

        if(buffersAttrib.index === null)
            buffersAttrib.index = new THREE.BufferAttribute(buffers.bufferIndex, 1);
        buffersAttrib.position = new THREE.BufferAttribute(buffers.position, 3);
        buffersAttrib.normal= new THREE.BufferAttribute(buffers.normal, 3);
        if(buffersAttrib.uv.wgs84 === null)
            buffersAttrib.uv.wgs84 = new THREE.BufferAttribute(buffers.uv.wgs84, 2);
        buffersAttrib.uv.pm = new THREE.BufferAttribute(buffers.uv.pm, 1);

        javToo.freeArray(vertices);

        buffers.position = null;
        buffers.bufferIndex = null;
        buffers.normal = null;
        buffers.uv.wgs84 = null;
        buffers.uv.pm = null;

        return buffersAttrib;

    };

    return TileGeometry;

});
