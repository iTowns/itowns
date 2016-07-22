/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


import THREE from 'THREE';

var defaultValue = function(value, def) {
    return value === undefined ? def : value;
};

defaultValue.lightingPos = new THREE.Vector3(1, 0, 0);

export default defaultValue;
