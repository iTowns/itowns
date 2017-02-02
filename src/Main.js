/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

import ApiGlobe from 'Core/Commander/Interfaces/ApiInterface/ApiGlobe';
import Scene from 'Scene/Scene';

// browser execution or not ?
const scope = typeof window !== 'undefined' ? window : {};
const itowns = scope.itowns || {
    viewer: new ApiGlobe(),
};
scope.itowns = itowns;
export const viewer = itowns.viewer;
export { Scene };
export default scope.itowns;
