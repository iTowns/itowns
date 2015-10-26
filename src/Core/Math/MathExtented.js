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
    
    
     MathExt.PI_OV_FOUR = Math.PI * 0.25;
    
    /**
    * pi*2
    *
    * @type {Number}
    * @constant
    */
    MathExt.TWO_PI  = Math.PI * 2.0;
    
    MathExt.INV_TWO_PI  = 1.0/MathExt.TWO_PI;
    
    MathExt.LOG_TWO = Math.log(2.0);
    
    return MathExt;
    
});