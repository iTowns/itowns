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

	var radius = 1.0; 

        var ellipsoid  = new Ellipsoid(radius,radius,radius);
        
        var nSeg            = 8;       
        var nVertex         = (nSeg+1)*(nSeg+1); // correct pour uniquement les vertex
        var triangles       = (nSeg)*(nSeg); // correct pour uniquement les vertex
        
        var widthSegments   = nSeg;
        var heightSegments  = nSeg;
        
        var bufferVertex    = new Float32Array(nVertex * 3);
        var bufferIndex     = new Uint32Array( triangles * 3 * 2);       
        var bufferNormal    = new Float32Array( nVertex * 3);
        var bufferUV        = new Float32Array( nVertex * 3);
        
//        widthSegments       = Math.max( 2, Math.floor( widthSegments ) || 8 );
//        heightSegments      = Math.max( 2, Math.floor( heightSegments ) || 6 );


        widthSegments       = Math.max( 2, Math.floor( widthSegments ) || 2 );
        heightSegments      = Math.max( 2, Math.floor( heightSegments ) || 2 );

        var phiStart        = bbox.minCarto.longitude ;
        var phiLength       = bbox.dimension.x;

        var thetaStart      = bbox.minCarto.latitude ;
        var thetaLength     = bbox.dimension.y;

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

        //console.log(uvs);

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
/*
                    if ( Math.abs( this.vertices[ v1 ].z) === radius) { // TODO --> attention les chapeaux ne sont pas pris en compte dans l'ellispoid

                        bufferize(v4,v3,v1,idVertex);
                        //console.log(0);

                    } else if ( Math.abs( this.vertices[ v3 ].z) === radius ) {

                        bufferize(v1,v2,v3,idVertex);
                        //console.log(1);
                    } 
                    else */                 
                    {
                        //console.log(2);

                        bufferize(v4,v2,v1,idVertex);
                        
                        

                        idVertex +=3;

                        bufferize(v4,v3,v2,idVertex);
                        //bufferize(v2,v3,v4,idVertex);

                      }
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