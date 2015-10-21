/* global Uint16Array, Uint32Array */

/**
* Generated On: 2015-10-5
* Class: EllipsoidTileGeometry
* Description: Tuile géométrique. Buffer des vertex et des faces
*/

define('Globe/EllipsoidTileGeometry',['THREE','Core/defaultValue','Scene/BoudingBox','Core/Math/Ellipsoid','Core/Geographic/CoordCarto'], function(THREE,defaultValue,BoudingBox,Ellipsoid,CoordCarto){

    function EllipsoidTileGeometry(bbox){
        //Constructor
        THREE.BufferGeometry.call( this );
        
        bbox = defaultValue(bbox,new BoudingBox());

	var radius = 6.3567523142451793; 

        //var ellipsoid       = new Ellipsoid(6.378137, 6.378137, 6.3567523142451793);
        
        var ellipsoid       = new Ellipsoid(6, 6, 6);
        
        var nSeg            = 16;       
        var nVertex         = (nSeg+1)*(nSeg+1); // correct pour uniquement les vertex
        var triangles       = (nSeg)*(nSeg); // correct pour uniquement les vertex
        
        var widthSegments   = nSeg;
        var heightSegments  = nSeg;
        
        var bufferVertex    = new Float32Array(nVertex * 3);
        var bufferIndex     = new Uint32Array( triangles * 3 * 2);       
        var bufferNormal    = new Float32Array( nVertex * 3);
        var bufferUV        = new Float32Array( nVertex * 3);
        
        widthSegments       = Math.max( 2, Math.floor( widthSegments ) || 2 );
        heightSegments      = Math.max( 2, Math.floor( heightSegments ) || 2 );
        
//        widthSegments       = 1;
//        heightSegments      = 1;

        var phiStart        = bbox.minCarto.longitude ;
        var phiLength       = bbox.dimension.x;

        var thetaStart      = bbox.minCarto.latitude ;
        var thetaLength     = bbox.dimension.y;
        
        //-----------
        this.normals        = [];
        this.HeightPoints    = [];
        
        this.carto2Normal = function(phi,theta)
        {                           
            return ellipsoid.geodeticSurfaceNormalCartographic(new CoordCarto( phi, theta,0));                
        };
        
        this.normals.push(this.carto2Normal(phiStart, thetaStart));
        this.normals.push(this.carto2Normal(phiStart + phiLength, thetaStart+ thetaLength));
        this.normals.push(this.carto2Normal(phiStart, thetaStart+ thetaLength));
        this.normals.push(this.carto2Normal(phiStart + phiLength, thetaStart));
        
        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart                        , thetaStart    ,0)));
        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + bbox.halfDimension.x , thetaStart    ,0)));
        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + phiLength            , thetaStart    ,0)));
        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + phiLength            , thetaStart + bbox.halfDimension.y,0)));        
        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + phiLength            , thetaStart + thetaLength  ,0)));
        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart + bbox.halfDimension.x , thetaStart + thetaLength  ,0)));        
        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart                        , thetaStart + thetaLength  ,0)));
        this.HeightPoints.push(ellipsoid.cartographicToCartesian(new CoordCarto(phiStart                        , thetaStart + bbox.halfDimension.y,0)));
        
      
        this.normal = this.carto2Normal(bbox.center.x,bbox.center.y);        
        var ccarto  = new CoordCarto(bbox.center.x,bbox.center.y,0);        
        
        this.center = ellipsoid.cartographicToCartesian(ccarto) ;
        
        var color   = new THREE.Color( Math.random(), Math.random(), Math.random());
        
        var plane   = new THREE.Plane(this.normal); 
        
        this.HeightPointsProj   = [];
        this.HeightPointsProj2  = [];
        
        this.HeightPointsProj.push(plane.projectPoint(this.HeightPoints[0]));
        this.HeightPointsProj.push(plane.projectPoint(this.HeightPoints[1]));
        this.HeightPointsProj.push(plane.projectPoint(this.HeightPoints[2]));
        this.HeightPointsProj.push(plane.projectPoint(this.HeightPoints[3]));
        this.HeightPointsProj.push(plane.projectPoint(this.HeightPoints[4]));
        this.HeightPointsProj.push(plane.projectPoint(this.HeightPoints[5]));
        this.HeightPointsProj.push(plane.projectPoint(this.HeightPoints[6]));
        this.HeightPointsProj.push(plane.projectPoint(this.HeightPoints[7]));
        
        var geometryVertex  = new THREE.BufferGeometry();        
        var quaternion      = new THREE.Quaternion();
        
        quaternion.setFromUnitVectors(this.normal,new THREE.Vector3(0,1,0));
        
        var maxH = 0;
        
        function applyQuaternion(original,tab,quat,angle,copyTab,center)
        {
            var maxh = 0;
            var quaternion      = new THREE.Quaternion();
            quaternion.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), -angle );
            for ( var i = 0; i < tab.length; i++ )
            {
                    var vec = new  THREE.Vector3();
                    vec.subVectors(original[i],center);
                    maxh    = Math.max(maxh,tab[i].distanceTo(vec));
                    copyTab.push(tab[i].clone());
                    tab[i].applyQuaternion( quat );
                    tab[i].applyQuaternion( quaternion );
            }
            
           return maxh;
        }
        
        function toBuffer(tab)
        {                       
            var vertices = new Float32Array( (tab.length) * 3 ); 

            for ( var i = 0; i < tab.length; i++ )
            {
                    vertices[ i*3 + 0 ] = tab[i].x;
                    vertices[ i*3 + 1 ] = tab[i].y;
                    vertices[ i*3 + 2 ] = tab[i].z; 
            }
                        
            return vertices;
        }
        
        var maxH = applyQuaternion(this.HeightPoints,this.HeightPointsProj,quaternion,bbox.center.x,this.HeightPointsProj2,this.center);
        
        var vertices = toBuffer(this.HeightPointsProj2,this.center);

        geometryVertex.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );        

        var materialVertex  = new THREE.PointsMaterial( {size:0.3,vertexColors:false});
        var meshVertex      = new THREE.Points( geometryVertex, materialVertex );
        
        var maxV        = new THREE.Vector3(-1000,-1000,-1000);
        var minV        = new THREE.Vector3(1000,1000,1000);
        
        for ( var i = 0; i < this.HeightPointsProj.length; i++ )
        {
            maxV.max(this.HeightPointsProj[i]);
            minV.min(this.HeightPointsProj[i]);
        }
        
        var width       = Math.abs(maxV.z - minV.z);
        var height      = Math.abs(maxV.x - minV.x);
        
        var tran        = height * 0.5 - Math.abs(this.HeightPointsProj[5].x);
                
           
        var geometry    = new THREE.BoxGeometry(width,height,maxH);        
        var material    = new THREE.MeshBasicMaterial( {color: color.getHex(), wireframe : true} );
        this.cube       = new THREE.Mesh( geometry, material );
        
        this.cube.lookAt(this.normal);
        this.cube.translateZ(-maxH*0.5);
        this.cube.translateY(tran);
        
        this.helper         = new THREE.Object3D();
        this.helper.position.copy(this.center);
        this.helper.add(meshVertex);
        this.helper.add(this.cube);
        
        //--------
    
        var idVertex        = 0;
        var x, y, verticees = [], uvs = [];

        this.vertices = [];

        for ( y = 0; y <= heightSegments; y ++ ) 
        {

            var verticesRow = [];
            var uvsRow = [];

            for ( x = 0; x <= widthSegments; x ++ ) 
            {

                    var u = x / widthSegments;
                    var v = y / heightSegments;

                    var longi   = phiStart      + u * phiLength;
                    var lati    = thetaStart    + v * thetaLength;

                    var vertex = ellipsoid.cartographicToCartesian(new CoordCarto(longi,lati,0)) ;                                                         
                    var id3     = idVertex*3 ;
                    
                    bufferVertex[id3+ 0] = vertex.x;
                    bufferVertex[id3+ 1] = vertex.y;
                    bufferVertex[id3+ 2] = vertex.z;

                    var normal = vertex.clone().normalize();

                    bufferNormal[id3+ 0] = normal.x;
                    bufferNormal[id3+ 1] = normal.y;
                    bufferNormal[id3+ 2] = normal.z;      

                    if ( Math.abs( vertex.y) === radius) {

                          u = u + 1 / (2* widthSegments );


                    } else if ( Math.abs( vertex.y) === radius ) {

                          u = u + 1 / (2* widthSegments );

                    } 

                    bufferUV[idVertex*2 + 0] = u;
                    bufferUV[idVertex*2 + 1] = 1-v;
                    idVertex ++;

                    this.vertices.push(vertex);                
                    verticesRow.push( this.vertices.length - 1 );
                    uvsRow.push( new THREE.Vector2( u, 1-v ));
            }

            verticees.push( verticesRow );
            uvs.push( uvsRow );

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
        
        this.setIndex( new THREE.BufferAttribute( bufferIndex, 1 ) );
        this.addAttribute( 'position',  new THREE.BufferAttribute( bufferVertex, 3 ) );
        this.addAttribute( 'normal',    new THREE.BufferAttribute( bufferNormal, 3 ) );
        this.addAttribute( 'uv',        new THREE.BufferAttribute( bufferUV, 2) );

    }

    EllipsoidTileGeometry.prototype = Object.create( THREE.BufferGeometry.prototype );

    EllipsoidTileGeometry.prototype.constructor = EllipsoidTileGeometry;

    return EllipsoidTileGeometry;
    
});

/*
 
 var width           = bbox.dimension.x;
	var height          = bbox.dimension.y;
	var widthSegments   = 32;
	var heightSegments  = 32;
        
	var width_half  = bbox.halfDimension.x;
	var height_half = bbox.halfDimension.y;

	var gridX = Math.floor( widthSegments ) || 1;
	var gridY = Math.floor( heightSegments ) || 1;

	var gridX1 = gridX + 1;
	var gridY1 = gridY + 1;

	var segment_width   = width / gridX;
	var segment_height  = height / gridY;

	var vertices    = new Float32Array( gridX1 * gridY1 * 3 );
	var normals     = new Float32Array( gridX1 * gridY1 * 3 );
	var uvs         = new Float32Array( gridX1 * gridY1 * 2 );

	var offset = 0;
	var offset2 = 0;

	for ( var iy = 0; iy < gridY1; iy ++ ) {

		var y = iy * segment_height - height_half;

		for ( var ix = 0; ix < gridX1; ix ++ ) {

			var x = ix * segment_width - width_half;

			vertices[ offset ] = x;
			vertices[ offset + 1 ] = - y;

			normals[ offset + 2 ] = 1;

			uvs[ offset2 ] = ix / gridX;
                        
                        //TODO ATTENTION inversion des uv Y
			//uvs[ offset2 + 1 ] = 1 - ( iy / gridY );
                        uvs[ offset2 + 1 ] = ( iy / gridY );

			offset += 3;
			offset2 += 2;

		}

	}

	offset = 0;

	var indices = new ( ( vertices.length / 3 ) > 65535 ? Uint32Array : Uint16Array )( gridX * gridY * 6 );

	for ( var iy = 0; iy < gridY; iy ++ ) {

		for ( var ix = 0; ix < gridX; ix ++ ) {

			var a = ix + gridX1 * iy;
			var b = ix + gridX1 * ( iy + 1 );
			var c = ( ix + 1 ) + gridX1 * ( iy + 1 );
			var d = ( ix + 1 ) + gridX1 * iy;

			indices[ offset ] = a;
			indices[ offset + 1 ] = b;
			indices[ offset + 2 ] = d;

			indices[ offset + 3 ] = b;
			indices[ offset + 4 ] = c;
			indices[ offset + 5 ] = d;

			offset += 6;

		}

	}

	this.setIndex( new THREE.BufferAttribute( indices, 1 ) );
	this.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
	this.addAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );
	this.addAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );
 
 */