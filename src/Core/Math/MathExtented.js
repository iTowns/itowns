/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Core/Math/MathExtented',[], function(){

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
    
    /**
    * pi*2
    *
    * @type {Number}
    * @constant
    */
    MathExt.TWO_PI  = Math.PI * 2.0;
    
    MathExt.LOG_TWO = Math.log(2.0);
    
    return MathExt;
    
});