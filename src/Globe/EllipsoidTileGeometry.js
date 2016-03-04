/* global  Uint32Array */

/**
 * Generated On: 2015-10-5
 * Class: EllipsoidTileGeometry
 * Description: Tuile géométrique. Buffer des vertex et des faces
 */

define('Globe/EllipsoidTileGeometry', [
    'THREE',
    'Core/defaultValue',
    'Scene/BoundingBox',
    'Core/Math/Ellipsoid',
    'Core/Geographic/CoordCarto',
    'Core/Math/MathExtented',
    'Core/System/JavaTools',
    'Core/Commander/Providers/CacheRessource'
], function(
    THREE,
    defaultValue,
    BoundingBox,
    Ellipsoid,
    CoordCarto,
    MathExt,
    JavaTools,
    CacheRessource) {

    var cache = CacheRessource();

    function Buffers(nSegment)
    {                
        
        this.bufIndex = null;
        this.bufPosition = null;
        this.bufNormal = null;
        this.bufUV_0 = null;
        this.bufUV_1 = null;        
        
        var cBuff = cache.getRessource(nSegment);
        
        if(cBuff)
        {
            this.bufIndex = cBuff.bufIndex;
            this.bufUV_0 = cBuff.bufUV_0;            
        }        
    }

    function EllipsoidTileGeometry(bbox, segment, pellipsoid, zoom) {
        //Constructor
        THREE.BufferGeometry.call(this);

        var ellipsoid = defaultValue(pellipsoid, new Ellipsoid(6378137, 6356752.3142451793, 6378137));

        bbox = defaultValue(bbox, new BoundingBox());
        this.center = ellipsoid.cartographicToCartesian(new CoordCarto(bbox.center.x, bbox.center.y, 0));
        this.OBB = bbox.get3DBBox(ellipsoid, this.center);
                
        // TODO : free array
        
        var buffersAtt = this.computeBuffers(bbox,segment,ellipsoid,zoom);

        this.setIndex(buffersAtt.bufIndex);
        this.addAttribute('position', buffersAtt.bufPosition);
        this.addAttribute('normal', buffersAtt.bufNormal);
        this.addAttribute('uv', buffersAtt.bufUV_0);
        this.addAttribute('uv1', buffersAtt.bufUV_1);
        
        buffersAtt.bufPosition = null;
        buffersAtt.bufNormal= null;        
        buffersAtt.bufUV_1 = null;
        
        if(!cache.getRessource(segment))         
            cache.addRessource(segment, buffersAtt);
         
        // ---> for SSE
        this.computeBoundingSphere();

    }        

    EllipsoidTileGeometry.prototype = Object.create(THREE.BufferGeometry.prototype);

    EllipsoidTileGeometry.prototype.constructor = EllipsoidTileGeometry;
    
    EllipsoidTileGeometry.prototype.computeBuffers = function(bbox,segment,ellipsoid,zoom) 
    {
                
        var javToo = new JavaTools();

        var nbRow = Math.pow(2.0, zoom + 1.0);
        
        var buffersAtt = new Buffers(segment);
        
        var nSeg = defaultValue(segment, 32);
        var nVertex = (nSeg + 1) * (nSeg + 1) + 8 * (nSeg - 1); // correct pour uniquement les vertex
        var triangles = (nSeg) * (nSeg) + 16 * (nSeg - 1); // correct pour uniquement les vertex

        var bufferVertex = new Float32Array(nVertex * 3);
        var bufferIndex = buffersAtt.bufIndex === null ? new Uint32Array(triangles * 3 * 2) : null;
        var bufferNormal = new Float32Array(nVertex * 3);
        var bufferUV = buffersAtt.bufUV_0 === null ? new Float32Array(nVertex * 2) : null;
        var bufferUV2 = new Float32Array(nVertex);

        var widthSegments = Math.max(2, Math.floor(nSeg) || 2);
        var heightSegments = Math.max(2, Math.floor(nSeg) || 2);

        var phiStart = bbox.minCarto.longitude;
        var phiLength = bbox.dimension.x;
        var thetaStart = bbox.minCarto.latitude;
        var thetaLength = bbox.dimension.y;

        var idVertex = 0, id_m3 = 0;
        
        var x, y, vertices = [],
            skirt = [],
            skirtEnd = [];

        var st1 = 0.5 + Math.log(Math.tan(MathExt.PI_OV_FOUR + thetaStart * 0.5)) * MathExt.INV_TWO_PI;

        if (!isFinite(st1))
            st1 = 0;

        var sizeTexture = 1.0 / nbRow;

        var start = (st1 % (sizeTexture));

        var st = st1 - start;
       
        var buildUV = function(){};
         
        if(buffersAtt.bufUV_0 === null) 
            buildUV = function(u,v)
            {
                var i = idVertex * 2;
                bufferUV[i] = u;
                bufferUV[i + 1] = 1 - v;
            };

        for (y = 0; y <= heightSegments; y++) {

            var verticesRow = [];

            var v = y / heightSegments;
            var lati = thetaStart + v * thetaLength;
            var t = ((0.5 + Math.log(Math.tan(MathExt.PI_OV_FOUR + lati * 0.5)) * MathExt.INV_TWO_PI) - st) * nbRow;

            if (!isFinite(t))
                t = 0;
                                    
            bufferUV2.fill(t , idVertex, idVertex + widthSegments + 1);
            

            for (x = 0; x <= widthSegments; x++) {

                var u = x / widthSegments;

                var longi = phiStart + u * phiLength;

                var vertex = ellipsoid.cartographicToCartesian(new CoordCarto(longi, lati, 0));
                var normal = vertex.clone().normalize();
                                                 
                bufferVertex[id_m3 ] = vertex.x - this.center.x;
                bufferNormal[id_m3 ] = normal.x;
                id_m3++;
                bufferVertex[id_m3 ] = vertex.y - this.center.y;
                bufferNormal[id_m3 ] = normal.y;
                id_m3++;
                bufferVertex[id_m3 ] = vertex.z - this.center.z;                
                bufferNormal[id_m3 ] = normal.z;
                id_m3++;

                buildUV(u,v);
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
            bufferIndex[idVertex + 0] = va;
            bufferIndex[idVertex + 1] = vb;
            bufferIndex[idVertex + 2] = vc;
            return idVertex+3;
        }
  
        var idVertex2 = 0;
        
        if(buffersAtt.bufIndex === null)   
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

        start = idVertex;
        var rmax = 5000;
        var r = Math.max(rmax, Math.pow(rmax, 1 / zoom));

        r = isFinite(r) ? r : rmax;
        
        var buildIndexSkirt = function(){};
        var buildUVSkirt = function(){};
        
        
        if(buffersAtt.bufIndex === null)
        {
            buildIndexSkirt = function(id,v1,v2,v3,v4)
            {
                id = bufferize(v1, v2, v3, id);
                id = bufferize(v1, v3, v4, id);                
                return id;
            };
            
            buildUVSkirt = function(){
                bufferUV[idVertex * 2 ] = bufferUV[id * 2 ];
                bufferUV[idVertex * 2 + 1] = bufferUV[id * 2 + 1];                
            };
        }
    
        id_m3 = idVertex * 3;
        
        for (var i = 0; i < skirt.length; i++) {

            var id = skirt[i];
            
            var id2_m3 = id * 3;

            bufferVertex[id_m3 ] = bufferVertex[id2_m3 ] - bufferNormal[id2_m3 ] * r;
            bufferNormal[id_m3 ] = bufferNormal[id2_m3 ];
            id_m3++;id2_m3++;
            bufferVertex[id_m3 ] = bufferVertex[id2_m3 ] - bufferNormal[id2_m3 ] * r;
            bufferNormal[id_m3 ] = bufferNormal[id2_m3 ];
            id_m3++;id2_m3++;
            bufferVertex[id_m3 ] = bufferVertex[id2_m3 ] - bufferNormal[id2_m3 ] * r;
            bufferNormal[id_m3 ] = bufferNormal[id2_m3 ];
            id_m3++;id2_m3++;
            
            buildUVSkirt();
            
            bufferUV2[idVertex] = bufferUV2[id];

            var idf = (i + 1) % skirt.length;

            v1 = id;
            v2 = idVertex;
            v3 = idVertex + 1;
            v4 = skirt[idf];

            if (idf === 0)
                v3 = start;

            idVertex2 = buildIndexSkirt (idVertex2,v1,v2,v3,v4);

            idVertex++;

        }
         // TODO : free array
         
        if(buffersAtt.bufIndex === null)            
            buffersAtt.bufIndex = new THREE.BufferAttribute(bufferIndex, 1);        
        buffersAtt.bufPosition = new THREE.BufferAttribute(bufferVertex, 3);
        buffersAtt.bufNormal= new THREE.BufferAttribute(bufferNormal, 3);
        if(buffersAtt.bufUV_0 === null)            
            buffersAtt.bufUV_0 = new THREE.BufferAttribute(bufferUV, 2);
        buffersAtt.bufUV_1 = new THREE.BufferAttribute(bufferUV2, 1);
     
        javToo.freeArray(vertices);

        bufferVertex = null;
        bufferIndex = null;
        bufferNormal = null;
        bufferUV = null;
        bufferUV2 = null;
        
        return buffersAtt;
        
    };

    return EllipsoidTileGeometry;

});
