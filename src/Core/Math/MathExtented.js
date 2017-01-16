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
const MathExt = {};

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

MathExt.radToDeg = function radToDeg(rad) {
    return rad * MathExt.RADTODEG;
};

MathExt.degToRad = function degToRad(deg) {
    return deg * MathExt.DEGTORAD;
};

MathExt.arrayDegToRad = function arrayDegToRad(arrayDeg) {
    if (arrayDeg) {
        for (var i = 0; i < arrayDeg.length; i++) {
            arrayDeg[i] = MathExt.degToRad(arrayDeg[i]);
        }
    }
};

MathExt.arrayRadToDeg = function arrayRadToDeg(arrayDeg) {
    if (arrayDeg) {
        for (var i = 0; i < arrayDeg.length; i++) {
            arrayDeg[i] = MathExt.radToDeg(arrayDeg[i]);
        }
    }
};

// TODO: Function in test :
MathExt.step = function step(val, stepVal) {
    if (val < stepVal) {
        return 0.0;
    }
    else {
        return 1.0;
    }
};

MathExt.exp2 = function exp2(expo) {
    return Math.pow(2, expo);
};

export default MathExt;
