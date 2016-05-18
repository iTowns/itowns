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
        this.uv_0 = null;
        this.uv_1 = null;

        var cBuff = cache.getRessource(nSegment);

        if(cBuff)
        {
            this.index = cBuff.index;
            this.uv_0 = cBuff.uv_0;
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
        this.addAttribute('uv', buffersAttrib.uv_0);
        this.addAttribute('uv1', buffersAttrib.uv_1);

        buffersAttrib.position = null;
        buffersAttrib.normal= null;
        buffersAttrib.uv_1 = null;

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
        buffers.uv_0 = buffersAttrib.uv_0 === null ? new Float32Array(nVertex * 2) : null;
        buffers.uv_1 = new Float32Array(nVertex);

        var widthSegments = Math.max(2, Math.floor(nSeg) || 2);
        var heightSegments = Math.max(2, Math.floor(nSeg) || 2);

        var idVertex = 0;
        var x, y, vertices = [],
            skirt = [],
            skirtEnd = [];
        var u,v;

        builder.Prepare(params);

        var UV_0 = function(){};
        var UV_1 = function(){};

        if(buffersAttrib.uv_0 === null)
            UV_0 = function(u,v)
            {
                buffers.uv_0[idVertex * 2 + 0] = u;
                buffers.uv_0[idVertex * 2 + 1] = 1 - v;
            };

        if(buffersAttrib.uv_1 === null && builder.getUV_1)
            UV_1 = function(u)
            {
                buffers.uv_1[idVertex] = u;
            };

        for (y = 0; y <= heightSegments; y++) {

            var verticesRow = [];

            v = y / heightSegments;

            builder.vProjecte(v,params);

            var uv_1 = builder.getUV_1(params);

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

                UV_0(u,v);
                UV_1(uv_1);

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
                buffers.uv_0[idVertex * 2 + 0] = buffers.uv_0[id * 2 + 0];
                buffers.uv_0[idVertex * 2 + 1] = buffers.uv_0[id * 2 + 1];
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

            buffers.uv_1[idVertex] = buffers.uv_1[id];

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
        if(buffersAttrib.uv_0 === null)
            buffersAttrib.uv_0 = new THREE.BufferAttribute(buffers.uv_0, 2);
        buffersAttrib.uv_1 = new THREE.BufferAttribute(buffers.uv_1, 1);

        javToo.freeArray(vertices);

        buffers.position = null;
        buffers.bufferIndex = null;
        buffers.normal = null;
        buffers.uv_0 = null;
        buffers.uv_1 = null;

        return buffersAttrib;

    };

    return TileGeometry;

});
