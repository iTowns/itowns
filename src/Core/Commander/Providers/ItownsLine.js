import THREE from 'THREE';
import ItownsLineMaterial from 'Renderer/ItownsLineMaterial';

var ItownsLine = function(options){

THREE.Mesh.call(this);

    this.positions = [];
    this.previous = [];
    this.next = [];
    this.side = [];
    this.width = [];
    this.indices_array = [];
    this.uvs = [];

    this.geometry = new THREE.BufferGeometry();
    this.material = new ItownsLineMaterial(options);
    this.widthCallback = null;

};

ItownsLine.prototype = Object.create(THREE.Mesh.prototype);
ItownsLine.prototype.constructor = ItownsLine;

ItownsLine.prototype.setGeometry = function( g, c ) {

    this.widthCallback = c;
    this.positions = [];

    var j;

    if( g instanceof THREE.Geometry ){
        for( j = 0; j < g.vertices.length; j++ ){
            var v = g.vertices[ j ];
            this.positions.push( v.x, v.y, v.z );
            this.positions.push( v.x, v.y, v.z );
        }
    }

    if( g instanceof THREE.BufferGeometry ){
        // read attribute positions ?
    }

    if( g instanceof Float32Array || g instanceof Array ){
        for( j = 0; j < g.length; j += 3 ){
            this.positions.push( g[ j ], g[ j + 1 ], g[ j + 2 ] );
            this.positions.push( g[ j ], g[ j + 1 ], g[ j + 2 ] );
        }
    }

    this.process();

};

ItownsLine.prototype.addPoint = function(v) {
    if( v instanceof THREE.Vector3){
        this.positions.push( v.x, v.y, v.z );
        this.positions.push( v.x, v.y, v.z );
    }
};

ItownsLine.prototype.compareV3 = function( a, b ) {

    var aa = a * 6;
    var ab = b * 6;
    return ( this.positions[ aa ] === this.positions[ ab ] ) && ( this.positions[ aa + 1 ] === this.positions[ ab + 1 ] ) && ( this.positions[ aa + 2 ] === this.positions[ ab + 2 ] );
};

ItownsLine.prototype.copyV3 = function( a ) {
    var aa = a * 6;
    return [ this.positions[ aa ], this.positions[ aa + 1 ], this.positions[ aa + 2 ] ];
};

ItownsLine.prototype.process = function() {

    var l = this.positions.length / 6;

    this.previous = [];
    this.next = [];
    this.side = [];
    this.width = [];
    this.indices_array = [];
    this.uvs = [];

    var j;

    for( j = 0; j < l; j++ ) {
            this.side.push( 1 );
            this.side.push( -1 );
    }

    var w;
    for( j = 0; j < l; j++ ) {
            if( this.widthCallback ) w = this.widthCallback( j / ( l -1 ) );
            else w = 1;
            this.width.push( w );
            this.width.push( w );
    }

    for( j = 0; j < l; j++ ) {
            this.uvs.push( j / ( l - 1 ), 0 );
            this.uvs.push( j / ( l - 1 ), 1 );
    }

    var v;

    if( this.compareV3( 0, l - 1 ) ){
            v = this.copyV3( l - 2 );
    }
    else{
            v = this.copyV3( 0 );
    }

    this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
    this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );

    for( j = 0; j < l - 1; j++ ) {
            v = this.copyV3( j );
            this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
            this.previous.push( v[ 0 ], v[ 1 ], v[ 2 ] );
    }

    for( j = 1; j < l; j++ ) {
            v = this.copyV3( j );
            this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );
            this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );
    }

    if( this.compareV3( l - 1, 0 ) ){
            v = this.copyV3( 1 );
    } else {
            v = this.copyV3( l - 1 );
    }

    this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );
    this.next.push( v[ 0 ], v[ 1 ], v[ 2 ] );

    for( j = 0; j < l - 1; j++ ) {
            var n = j * 2;
            this.indices_array.push( n, n + 1, n + 2 );
            this.indices_array.push( n + 2, n + 1, n + 3 );
    }

    this.geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( this.positions ), 3 ));
    this.geometry.addAttribute( 'previous', new THREE.BufferAttribute( new Float32Array( this.previous ), 3 ));
    this.geometry.addAttribute( 'next', new THREE.BufferAttribute( new Float32Array( this.next ), 3 ));
    this.geometry.addAttribute( 'side', new THREE.BufferAttribute( new Float32Array( this.side ), 1 ) );
    this.geometry.addAttribute( 'width', new THREE.BufferAttribute( new Float32Array( this.width ), 1 ));
    this.geometry.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array( this.uvs ), 2 ));
    this.geometry.setIndex( new THREE.BufferAttribute( new Uint16Array( this.indices_array ), 1 ) );

};

ItownsLine.prototype.createQuad = function(pt1,pt2){

		//Définition propre a chaque géométrie
		var geometry = new THREE.BufferGeometry();

		//les 6 points

                        //var indices  =  new Int16Array([0,1,2,3,4,5]);
		var vertices = new Float32Array( [
			pt1.x, pt1.y,  pt1.z, // -1
			pt2.x, pt2.y,  pt2.z, // -1
			pt2.x, pt2.y,  pt2.z, //  1

			pt2.x, pt2.y,  pt2.z, //  1
			pt1.x, pt1.y,  pt1.z, //  1
			pt1.x, pt1.y,  pt1.z  // -1
		] );

		//pour chacun des six points, le point opposé correspondant
		var vertices2 = new Float32Array( [
			pt2.x, pt2.y,  pt2.z,
			pt1.x, pt1.y,  pt1.z,
			pt1.x, pt1.y,  pt1.z,


			pt1.x, pt1.y,  pt1.z,
			pt2.x, pt2.y,  pt2.z,
			pt2.x, pt2.y,  pt2.z
		] );



		geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
                       // geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
		geometry.addAttribute( 'position2', new THREE.BufferAttribute( vertices2, 3 ) );

		var uv = new Float32Array( [
			-1, -1,
			1, -1,
			1,  1,

			1, 1,
			-1, 1,
			-1,-1
		] );


		geometry.addAttribute( 'uv', new THREE.BufferAttribute( uv, 2 ) );

		return geometry;
};

ItownsLine.prototype.createSegments = function(pt1,pt2, pt3){

		//Définition propre a chaque géométrie
		var geometry = new THREE.BufferGeometry();
                        var point1 = new Float32Array( [
			pt1.x, pt1.y,  pt1.z
		] );

                        var point2 = new Float32Array( [
			pt2.x, pt2.y,  pt2.z
		] );

                        var point3 = new Float32Array( [
			pt3.x, pt3.y,  pt3.z
		] );

		geometry.addAttribute( 'previousPoint', new THREE.BufferAttribute( point1, 3 ));
		geometry.addAttribute( 'position', new THREE.BufferAttribute(point2, 3 ) );
                        geometry.addAttribute( 'nextPoint', new THREE.BufferAttribute(point3, 3 ) );
		return geometry;
};

export default ItownsLine;

