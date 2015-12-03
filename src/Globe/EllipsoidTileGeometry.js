/* global Uint16Array, Uint32Array */

/**
* Generated On: 2015-10-5
* Class: EllipsoidTileGeometry
* Description: Tuile géométrique. Buffer des vertex et des faces
*/

define('Globe/EllipsoidTileGeometry',[
    'THREE',
    'Core/defaultValue',
    'Scene/BoudingBox',
    'Core/Math/Ellipsoid',
    'Core/Geographic/CoordCarto',
    'Core/Math/MathExtented'
    ], function(
        THREE,
        defaultValue,
        BoudingBox,
        Ellipsoid,
        CoordCarto,
        MathExt){

    function EllipsoidTileGeometry(bbox,segment,pellipsoid,zoom){
        //Constructor
        THREE.BufferGeometry.call( this );
        
        var nbRow           = Math.pow(2.0,zoom + 1.0 );
        
        bbox = defaultValue(bbox,new BoudingBox());

        var ellipsoid       = defaultValue(pellipsoid,new Ellipsoid(6378137, 6378137, 6356752.3142451793));         
        
        var nSeg            = defaultValue(segment,32);       
        var nVertex         = (nSeg+1)*(nSeg+1); // correct pour uniquement les vertex
        var triangles       = (nSeg)*(nSeg); // correct pour uniquement les vertex
        
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

//        this.normals        = [];
//        this.HeightPoints    = [];        
//        this.normals.push(this.carto2Normal(phiStart, thetaStart));
//        this.normals.push(this.carto2Normal(phiStart + phiLength, thetaStart+ thetaLength));
//        this.normals.push(this.carto2Normal(phiStart, thetaStart+ thetaLength));
//        this.normals.push(this.carto2Normal(phiStart + phiLength, thetaStart));        
//        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart                        , thetaStart    ,0)));
//        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + bbox.halfDimension.x , thetaStart    ,0)));
//        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + phiLength            , thetaStart    ,0)));
//        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + phiLength            , thetaStart + bbox.halfDimension.y,0)));        
//        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + phiLength            , thetaStart + thetaLength  ,0)));
//        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + bbox.halfDimension.x , thetaStart + thetaLength  ,0)));        
//        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart                        , thetaStart + thetaLength  ,0)));
//        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart                        , thetaStart + bbox.halfDimension.y,0)));        
     
        var ccarto  = new CoordCarto(bbox.center.x,bbox.center.y,0);               
        var center  = ellipsoid.cartographicToCartesian(ccarto);
        
        this.OBB    = bbox.get3DBBox(ellipsoid,center);
        
        var idVertex        = 0;
        var x, y, verticees = [];//, uvs = [];

        this.vertices = [];
        
        var st1          = 0.5 + Math.log(Math.tan(MathExt.PI_OV_FOUR + thetaStart*0.5))* MathExt.INV_TWO_PI;
        
        if(!isFinite(st1))
            st1 = 0;
       
        var sizeTexture = 1.0 / nbRow;
        
        var start       = (st1%(sizeTexture));
        
        var st = st1 - start;
//        
//        if(isNaN(st))
//        {
//            console.log('---');
//            console.log('nb row : '+  nbRow);
//            console.log('zoom : '+  zoom);
//            console.log('start : '+  start);
//            console.log('sizeTexture : '+  sizeTexture);
//            console.log('st : '+  st1);
//           
//        }
        
        // console.log('st : '+  st +  '/' + thetaStart + ' ' + start + ' ' + sizeTexture);
//        if(zoom === 2)
//            console.log('--------------------');
        
        for ( y = 0; y <= heightSegments; y ++ ) 
        {

            var verticesRow = [];
            //var uvsRow  = [];
            //var uvsRow2 = [];
            
            var v = y / heightSegments;
            var lati    = thetaStart    + v * thetaLength;
            
            var t = ((0.5 + Math.log(Math.tan(MathExt.PI_OV_FOUR + lati*0.5))* MathExt.INV_TWO_PI) - st) * nbRow;
                    
            if(!isFinite(t))
                t = 0;
            
//            if(zoom === 2)
//                console.log(t + ' / ' + lati);
            
            for ( x = 0; x <= widthSegments; x ++ ) 
            {

                    var u = x / widthSegments;
                    
                    var longi   = phiStart      + u * phiLength;                    

                    var vertex = ellipsoid.cartographicToCartesian(new CoordCarto(longi,lati,0));
                   
                    var id3     = idVertex*3 ;
//                    
                    bufferVertex[id3+ 0] = vertex.x - center.x;
                    bufferVertex[id3+ 1] = vertex.y - center.y;
                    bufferVertex[id3+ 2] = vertex.z - center.z;
//                    
//                    bufferVertex[id3+ 0] = vertex.x ;
//                    bufferVertex[id3+ 1] = vertex.y ;
//                    bufferVertex[id3+ 2] = vertex.z ;

                    var normal = vertex.clone().normalize();

                    bufferNormal[id3+ 0] = normal.x;
                    bufferNormal[id3+ 1] = normal.y;
                    bufferNormal[id3+ 2] = normal.z;      
/*
                    if ( Math.abs( vertex.y) === radius) {

                          u = u + 1 / (2* widthSegments );


                    } else if ( Math.abs( vertex.y) === radius ) {

                          u = u + 1 / (2* widthSegments );

                    } 
*/
                    bufferUV[idVertex*2 + 0] = u;
                    bufferUV[idVertex*2 + 1] = 1-v;
                    
                    bufferUV2[idVertex]      = t;                         
                    
                    
                    idVertex ++;

                    this.vertices.push(vertex);                
                    verticesRow.push( this.vertices.length - 1 );
                    //uvsRow.push( new THREE.Vector2( u, 1-v ));
            }

            verticees.push( verticesRow );
            //uvs.push( uvsRow );

        }

        function bufferize(va,vb,vc,idVertex) 
        {
            bufferIndex[idVertex+ 0] = va;
            bufferIndex[idVertex+ 1] = vb;
            bufferIndex[idVertex+ 2] = vc;                               
        }

        idVertex = 0;

        for ( y = 0; y < heightSegments; y ++ ) {

              for ( x = 0; x < widthSegments; x ++ ) {

                    var v1 = verticees[ y ][ x + 1 ];
                    var v2 = verticees[ y ][ x ];
                    var v3 = verticees[ y + 1 ][ x ];
                    var v4 = verticees[ y + 1 ][ x + 1 ];

                    bufferize(v4,v2,v1,idVertex);
                    
                    idVertex +=3;

                    bufferize(v4,v3,v2,idVertex);
                    
                    idVertex +=3;
                }
        }
        
        // TODO : free array
        
        this.setIndex( new THREE.BufferAttribute( bufferIndex, 1 ) );
        this.addAttribute( 'position',  new THREE.BufferAttribute( bufferVertex, 3 ) );
        this.addAttribute( 'normal',    new THREE.BufferAttribute( bufferNormal, 3 ) );
        this.addAttribute( 'uv',        new THREE.BufferAttribute( bufferUV, 2) );
        this.addAttribute( 'uv2',       new THREE.BufferAttribute( bufferUV2, 1) );
        
        // ---> for SSE
        this.computeBoundingSphere();
        
    }

    EllipsoidTileGeometry.prototype = Object.create( THREE.BufferGeometry.prototype );

    EllipsoidTileGeometry.prototype.constructor = EllipsoidTileGeometry;

    return EllipsoidTileGeometry;
    
});