/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

import ApiGlobe from 'Core/Commander/Interfaces/ApiInterface/ApiGlobe';
// browser execution or not ?
var scope = typeof window !== "undefined" ? window : {};
var itowns = scope.itowns || {
    viewer: new ApiGlobe()
};
scope.itowns = itowns;
export default scope.itowns;
