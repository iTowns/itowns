/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/**
 * Math functions.
 *
 * @namespace
 * @alias MathExt
 */
var MathExt = {};

/**
 * pi
 *
 * @type {Number}
 * @constant
 */
MathExt.PI = Math.PI;


/**
 * pi/2
 *
 * @type {Number}
 * @constant
 */
MathExt.PI_OV_TWO = Math.PI * 0.5;


MathExt.PI_OV_FOUR = Math.PI * 0.25;

/**
 * pi*2
 *
 * @type {Number}
 * @constant
 */
MathExt.TWO_PI = Math.PI * 2.0;

MathExt.INV_TWO_PI = 1.0 / MathExt.TWO_PI;

MathExt.LOG_TWO = Math.log(2.0);

MathExt.RADTODEG = 180.0 / MathExt.PI;

MathExt.DEGTORAD = MathExt.PI / 180.0;

MathExt.radToDeg = function(rad)
{
	return rad * MathExt.RADTODEG;
};

MathExt.degToRad = function(deg)
{
	return deg * MathExt.DEGTORAD;
};

MathExt.arrayDegToRad = function(arrayDeg)
{
	if(arrayDeg)
	{
		for (var i = 0; i < arrayDeg.length; i++) {
			arrayDeg[i]= MathExt.degToRad(arrayDeg[i]);
		}
	}
};

MathExt.arrayRadToDeg = function(arrayDeg)
{
	if(arrayDeg)
	{
		for (var i = 0; i < arrayDeg.length; i++) {
			arrayDeg[i]= MathExt.radToDeg(arrayDeg[i]);
		}
	}
};

// TODO: Function in test :
MathExt.step = function(val,stepVal)
{
    if(val<stepVal)
        return 0.0;
    else
        return 1.0;

};

MathExt.exp2 = function(expo)
{
    return Math.pow(2,expo);
};

MathExt.parseFloat2= function(str) {
    var float = 0, sign, /*order,*/ mantissa,exp,
    int = 0, multi = 1;
    if (/^0x/.exec(str)) {
        int = parseInt(str,16);
    }else{
        for (var i = str.length -1; i >=0; i -= 1) {
            if (str.charCodeAt(i)>255) {
                //console.log('Wrong string parametr');
                return false;
            }
            int += str.charCodeAt(i) * multi;
            multi *= 256;
        }
    }
    sign = (int>>>31)?-1:1;
    exp = (int >>> 23 & 0xff) - 127;
    mantissa = ((int & 0x7fffff) + 0x800000).toString(2);
    for (i=0; i<mantissa.length; i+=1){
        float += parseInt(mantissa[i])? Math.pow(2,exp):0;
        exp--;
    }
    return float*sign;
}

MathExt.decode32= function(rgba) {
    var Sign = 1.0 - this.step(128.0,rgba[0])*2.0;
    var Exponent = 2.0 * (rgba[0]%128.0) + this.step(128.0,rgba[1]) - 127.0;
    var Mantissa = (rgba[1]%128.0)*65536.0 + rgba[2]*256.0 +rgba[3] + this.parseFloat2(0x800000);
    var Result =  Sign * this.exp2(Exponent) * (Mantissa * this.exp2(-23.0 ));
    return Result;
}

export default MathExt;
