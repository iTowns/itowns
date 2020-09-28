/**
 * @author zz85 / https://github.com/zz85
 *
 * Based on "A Practical Analytic Model for Daylight"
 * aka The Preetham Model, the de facto standard analytic skydome model
 * http://www.cs.utah.edu/~shirley/papers/sunsky/sunsky.pdf
 *
 * First implemented by Simon Wallner
 * http://www.simonwallner.at/projects/atmospheric-scattering
 *
 * Improved by Martin Upitis
 * http://blenderartists.org/forum/showthread.php?245954-preethams-sky-impementation-HDR
 *
 * Three.js integration by zz85 http://twitter.com/blurspline
 */

import * as THREE from 'three';
import realisticSkyVS from 'Core/Prefab/Globe/Shaders/RealisticSkyVS.glsl';
import realisticSkyFS from 'Core/Prefab/Globe/Shaders/RealisticSkyFS.glsl';

const uniforms = {
    luminance: new THREE.Uniform(1.0),
    turbidity: new THREE.Uniform(2.0),
    reileigh: new THREE.Uniform(1.0),
    mieCoefficient: new THREE.Uniform(0.005),
    mieDirectionalG: new THREE.Uniform(0.8),
    v3LightPosition: new THREE.Uniform(new THREE.Vector3()),
    up: new THREE.Uniform(THREE.Vector3(0.0, 1.0, 0.0)),
    sizeDome: new THREE.Uniform(1.0),
};

class Sky extends THREE.Mesh {
    constructor() {
        var skyMat = new THREE.ShaderMaterial({
            fragmentShader: realisticSkyFS,
            vertexShader: realisticSkyVS,
            uniforms,
            side: THREE.BackSide,
            transparent: true,
            depthWrite: false,
        });

        var skyGeo = new THREE.SphereBufferGeometry(1.0, 32, 15);
        super(skyGeo, skyMat);
    }
}

export default Sky;
