import assert from 'assert';
import * as THREE from 'three';
import disposeThreeMaterial from 'Utils/ThreeUtils';

describe('ThreeJS Utils', function () {
    it('Should dispose material and textures', function () {
        // Testing if material and textures are correctly disposed is not easy since dispose dispatches an event to
        // indicate that some WebGLRenderer GPU resources should be remove. A way to test that is to check the
        // WebGLRenderer.info value which lists used GPU resources but WebGLRenderer is not available for unit tests.
        // Another way, that is implemented here, is to create a material and a all possible textures and to count the
        // number of dispatched 'dispose' events
        const disposeCounter = {
            nb: 0,
        };
        const increment = function () {
            this.nb++;
        };

        const material = new THREE.MeshStandardMaterial();
        material.addEventListener('dispose', increment.bind(disposeCounter));

        material.alphaMap = new THREE.Texture();
        material.alphaMap.addEventListener('dispose', increment.bind(disposeCounter));

        material.aoMap = new THREE.Texture();
        material.aoMap.addEventListener('dispose', increment.bind(disposeCounter));

        material.bumpMap = new THREE.Texture();
        material.bumpMap.addEventListener('dispose', increment.bind(disposeCounter));

        material.displacementMap = new THREE.Texture();
        material.displacementMap.addEventListener('dispose', increment.bind(disposeCounter));

        material.emissiveMap = new THREE.Texture();
        material.emissiveMap.addEventListener('dispose', increment.bind(disposeCounter));

        material.envMap = new THREE.Texture();
        material.envMap.addEventListener('dispose', increment.bind(disposeCounter));

        material.lightMap = new THREE.Texture();
        material.lightMap.addEventListener('dispose', increment.bind(disposeCounter));

        material.map = new THREE.Texture();
        material.map.addEventListener('dispose', increment.bind(disposeCounter));

        material.metalnessMap = new THREE.Texture();
        material.metalnessMap.addEventListener('dispose', increment.bind(disposeCounter));

        material.normalMap = new THREE.Texture();
        material.normalMap.addEventListener('dispose', increment.bind(disposeCounter));

        material.roughnessMap = new THREE.Texture();
        material.roughnessMap.addEventListener('dispose', increment.bind(disposeCounter));

        material.specularMap = new THREE.Texture();
        material.specularMap.addEventListener('dispose', increment.bind(disposeCounter));

        disposeThreeMaterial(material);

        assert.equal(disposeCounter.nb, 13);
    });
});
