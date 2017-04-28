/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

import ApiGlobe from './Core/Commander/Interfaces/ApiInterface/ApiGlobe';
// browser execution or not ?
const scope = typeof window !== 'undefined' ? window : {};
const itowns = scope.itowns || {
    viewer: new ApiGlobe(),
};
scope.itowns = itowns;

export const viewer = itowns.viewer;
export { INITIALIZED_EVENT } from './Core/Commander/Interfaces/ApiInterface/ApiGlobe';
export { C } from './Core/Geographic/Coordinates';
export { Coordinates } from './Core/Geographic/Coordinates';
export default scope.itowns;
