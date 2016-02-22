/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Core/defaultValue', [], function() {

    var defaultValue = function(value, def) {
        return value === undefined ? def : value;
    };

    defaultValue.waterHeight = 0.05;
    
    return defaultValue;

});
