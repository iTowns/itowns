const Binary = {};

// For documentation see http://www.2ality.com/2012/02/js-integers.html


// Unsigned right-shifting is simple: just move the bits,
// while shifting in zeros from the left.
// The sign is not preserved, the result is always a Uint32
Binary.ToUint32 = function ToUint32(x) {
    return x >>> 0;
};

Binary.ToInt32 = function ToInt32(x) {
    return x >> 0;
};


// Convert flag to char
Binary.toChar = function toChar(nMask) {
    let nFlag;
    let nShifted = nMask;
    let sMask = '';
    for (nFlag = 0; nFlag < 32; nFlag++) {
        sMask += String(nShifted >>> 31);
        nShifted <<= 1;
    }
    return sMask;
};

// / ! \ WARNING is not supported on WebGl Glsl !!!

// Example  Flag in javascript
// offset Textures | Projection | Visible | Opacity
//     2^5/32      |   2^2/4    |  2^1/2  | 2^8/256   ---> 16
//       0               5           7          8
/* Example to write flag and read flag

var offset = 5;
var projection = 1;
var visible = 0;
var opacity = 0.2;

var flag = 0;

flag = flag | (offset);
flag = flag | ((projection) << 5);
flag = flag | ((visible) << 7 );
flag = flag | (Binary.ToUint32(Math.floor(opacity * 255)) << 8);

var g_offset= Binary.ToInt32(flag & Binary.ToUint32(32-1));
var g_projection = Binary.ToInt32((flag >> 5) & Binary.ToUint32(4-1));
var g_visible = Binary.ToInt32((flag >> 7) & Binary.ToUint32(2-1));
var g_opacity = Binary.ToInt32((flag >> 8) & Binary.ToUint32(256-1));

*/

export default Binary;
