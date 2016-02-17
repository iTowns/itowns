/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

define(['Core/Commander/Interfaces/ApiInterface/ApiGlobe'],
    function(ApiGlobe) {
        // browser execution or not ?
        var scope = typeof window !== "undefined" ? window : {};
        var itowns = scope.itowns || {
            viewer: ApiGlobe
        };
        scope.itowns = itowns;
        return scope.itowns;

    }
);
