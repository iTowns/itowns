/* global Uint16Array, Uint32Array */

/**
* Generated On: 2015-10-5
* Class: EllipsoidTileGeometry
* Description: Tuile géométrique. Buffer des vertex et des faces
*/

define('Globe/EllipsoidTileGeometry',[
    'THREE',
    'Core/defaultValue',
    'Scene/BoundingBox',
    'Core/Math/Ellipsoid',
    'Core/Geographic/CoordCarto',
    'Core/Math/MathExtented',
    'Core/System/JavaTools'
    ], function(
        THREE,
        defaultValue,
        BoundingBox,
        Ellipsoid,
        CoordCarto,
        MathExt,
        JavaTools){

    function EllipsoidTileGeometry(bbox,segment,pellipsoid,zoom){
        //Constructor
        THREE.BufferGeometry.call( this );
        
        var javToo          = new JavaTools();
        
        var nbRow           = Math.pow(2.0,zoom + 1.0 );
        
        bbox = defaultValue(bbox,new BoundingBox());

        var ellipsoid       = defaultValue(pellipsoid,new Ellipsoid(6378137, 6378137, 6356752.3142451793));         
        
        var nSeg            = defaultValue(segment,32);       
        var nVertex         = (nSeg+1)*(nSeg+1) + 8 * (nSeg-1); // correct pour uniquement les vertex
        var triangles       = (nSeg)*(nSeg)     + 16 * (nSeg-1); // correct pour uniquement les vertex
        
        var widthSegments   = nSeg;
        var heightSegments  = nSeg;
        
        var bufferVertex    = new Float32Array(nVertex * 3);
        var bufferIndex     = new Uint32Array( triangles * 3 * 2);       
        var bufferNormal    = new Float32Array( nVertex * 3);
        var bufferUV        = new Float32Array( nVertex * 2);
        var bufferUV2       = new Float32Array( nVertex);
        
        widthSegments       = Math.max( 2, Math.floor( widthSegments ) || 2 );
        heightSegments      = Math.max( 2, Math.floor( heightSegments ) || 2 );

        var phiStart        = bbox.minCarto.longitude ;
        var phiLength       = bbox.dimension.x;
        
        this.cLongi         = bbox.center.x;

        var thetaStart      = bbox.minCarto.latitude ;
        var thetaLength     = bbox.dimension.y;
                
        this.carto2Normal = function(phi,theta)
        {                           
            return ellipsoid.geodeticSurfaceNormalCartographic(new CoordCarto( phi, theta,0));                
        };
        
//        this.tops        = [];
//        this.tops.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart, thetaStart,0)));
//        this.tops.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + phiLength, thetaStart+ thetaLength,0)));
//        this.tops.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart, thetaStart+ thetaLength,0)));
//        this.tops.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + phiLength, thetaStart,0)));   
//
//        this.normals        = [];
//
//        this.normals.push(this.carto2Normal(phiStart, thetaStart));
//        this.normals.push(this.carto2Normal(phiStart + phiLength, thetaStart+ thetaLength));
//        this.normals.push(this.carto2Normal(phiStart, thetaStart+ thetaLength));
//        this.normals.push(this.carto2Normal(phiStart + phiLength, thetaStart));        

//        this.HeightPoints    = [];                
//        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart                        , thetaStart    ,0)));
//        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + bbox.halfDimension.x , thetaStart    ,0)));
//        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + phiLength            , thetaStart    ,0)));
//        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + phiLength            , thetaStart + bbox.halfDimension.y,0)));        
//        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + phiLength            , thetaStart + thetaLength  ,0)));
//        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + bbox.halfDimension.x , thetaStart + thetaLength  ,0)));        
//        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart                        , thetaStart + thetaLength  ,0)));
//        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart                        , thetaStart + bbox.halfDimension.y,0)));        
     
        var ccarto  = new CoordCarto(bbox.center.x,bbox.center.y,0);               
        this.center  = ellipsoid.cartographicToCartesian(ccarto);
        
        this.OBB    = bbox.get3DBBox(ellipsoid,this.center);
        
        var idVertex        = 0;
        var x, y, vertices  = [], skirt = [],skirtEnd = [];

        var st1             = 0.5 + Math.log(Math.tan(MathExt.PI_OV_FOUR + thetaStart*0.5))* MathExt.INV_TWO_PI;
        
        if(!isFinite(st1))
            st1 = 0;
       
        var sizeTexture = 1.0 / nbRow;
        
        var start       = (st1%(sizeTexture));
        
        var st = st1 - start;

        for ( y = 0; y <= heightSegments; y ++ ) 
        {

            var verticesRow = [];

            var v       = y / heightSegments;
            var lati    = thetaStart    + v * thetaLength;           
            var t       = ((0.5 + Math.log(Math.tan(MathExt.PI_OV_FOUR + lati*0.5))* MathExt.INV_TWO_PI) - st) * nbRow;
                    
            if(!isFinite(t))
                t = 0;
                        
            for ( x = 0; x <= widthSegments; x ++ ) 
            {

                    var u = x / widthSegments;
                    
                    var longi   = phiStart      + u * phiLength;                    

                    var vertex = ellipsoid.cartographicToCartesian(new CoordCarto(longi,lati,0));
                   
                    var id3     = idVertex*3 ;
//                    
                    bufferVertex[id3+ 0] = vertex.x - this.center.x;
                    bufferVertex[id3+ 1] = vertex.y - this.center.y;
                    bufferVertex[id3+ 2] = vertex.z - this.center.z;
                    
                                      
//                    bufferVertex[id3+ 0] = vertex.x ;
//                    bufferVertex[id3+ 1] = vertex.y ;
//                    bufferVertex[id3+ 2] = vertex.z ;

                    var normal = vertex.clone().normalize();                                        

                    bufferNormal[id3+ 0] = normal.x;
                    bufferNormal[id3+ 1] = normal.y;
                    bufferNormal[id3+ 2] = normal.z;      

                    bufferUV[idVertex*2 + 0] = u;
                    bufferUV[idVertex*2 + 1] = 1-v;
                    
                    bufferUV2[idVertex]      = t;                                  
                    
                    if(y !== 0 && y !== heightSegments)
                        if(x === widthSegments  )
                           skirt.push(idVertex);
                        else if(x === 0 )
                           skirtEnd.push(idVertex);
                    
                    verticesRow.push( idVertex );
                    
                    idVertex ++;
                    
            }

            vertices.push( verticesRow ); 
            
            if(y===0)
               skirt = skirt.concat(verticesRow);
            else if(y===heightSegments)
               skirt = skirt.concat(verticesRow.slice().reverse());
           
        }
    
        skirt = skirt.concat(skirtEnd.reverse());

        function bufferize(va,vb,vc,idVertex) 
        {
            bufferIndex[idVertex+ 0] = va;
            bufferIndex[idVertex+ 1] = vb;
            bufferIndex[idVertex+ 2] = vc;                               
        }

        var idVertex2 = 0;

        for ( y = 0; y < heightSegments; y ++ ) {

              for ( x = 0; x < widthSegments; x ++ ) {

                    var v1 = vertices[ y ][ x + 1 ];
                    var v2 = vertices[ y ][ x ];
                    var v3 = vertices[ y + 1 ][ x ];
                    var v4 = vertices[ y + 1 ][ x + 1 ];

                    bufferize(v4,v2,v1,idVertex2);
                    
                    idVertex2 +=3;

                    bufferize(v4,v3,v2,idVertex2);
                    
                    idVertex2 +=3;
                }
        }

        var start   = idVertex;
        var rmax    = 5000;
        var r       = Math.max(rmax,Math.pow(rmax,1/zoom)) ;
        
        r =  isFinite(r) ? r : rmax;
        
        for ( i = 0; i < skirt.length ; i ++ ) 
        {
           
            var id    = skirt[i];
            var id3   = idVertex*3;
            var id23  = id*3;                   
                   
            bufferVertex[id3+ 0] = bufferVertex[id23+ 0] - bufferNormal[id23+ 0] * r;
            bufferVertex[id3+ 1] = bufferVertex[id23+ 1] - bufferNormal[id23+ 1] * r;
            bufferVertex[id3+ 2] = bufferVertex[id23+ 2] - bufferNormal[id23+ 2] * r;
            
            bufferNormal[id3+ 0] = bufferNormal[id23+ 0];
            bufferNormal[id3+ 1] = bufferNormal[id23+ 1];
            bufferNormal[id3+ 2] = bufferNormal[id23+ 2];
            
            bufferUV[idVertex*2 + 0] = bufferUV[id*2 + 0];
            bufferUV[idVertex*2 + 1] = bufferUV[id*2 + 1];
            bufferUV2[idVertex]      = bufferUV2[id]; 
            
            var idf = (i+1)%skirt.length;
            
            var v1 = id;
            var v2 = idVertex;
            var v3 = idVertex+1;
            var v4 = skirt[idf];
            
            if(idf === 0)
                v3 = start;
            
            bufferize(v1,v2,v3,idVertex2);

            idVertex2 +=3;

            bufferize(v1,v3,v4,idVertex2);

            idVertex2 +=3;

            idVertex++;
            
        }
        
        // TODO : free array
        
        this.setIndex( new THREE.BufferAttribute( bufferIndex, 1 ) );
        this.addAttribute( 'position',  new THREE.BufferAttribute( bufferVertex, 3 ) );
        this.addAttribute( 'normal',    new THREE.BufferAttribute( bufferNormal, 3 ) );
        this.addAttribute( 'uv',      new THREE.BufferAttribute( bufferUV, 2) );
        this.addAttribute( 'uv1',      new THREE.BufferAttribute( bufferUV2, 1) );
        
        // ---> for SSE
        this.computeBoundingSphere();
        
        javToo.freeArray(vertices);
        
        // TODO how free typedArray
        bufferVertex    = null;
        bufferIndex     = null;       
        bufferNormal    = null;
        bufferUV        = null;
        bufferUV2       = null;
        
    }

    EllipsoidTileGeometry.prototype = Object.create( THREE.BufferGeometry.prototype );

    EllipsoidTileGeometry.prototype.constructor = EllipsoidTileGeometry;
    
    return EllipsoidTileGeometry;
    
});