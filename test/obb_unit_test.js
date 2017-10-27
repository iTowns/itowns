import * as THREE from 'three';
import OBB from '../src/Renderer/ThreeExtended/OBB';
/* global describe, it */

const assert = require('assert');

const max = new THREE.Vector3(10, 10, 10);
const min = new THREE.Vector3(-10, -10, -10);
const lookAt = new THREE.Vector3(1, 0, 0);
const translate = new THREE.Vector3(0, 0, 20);
const obb = new OBB(min, max, lookAt, translate);

describe('OBB', function () {
    it('should correctly instance obb', () => {
        assert.equal(obb.natBox.min.x, min.x);
        assert.equal(obb.natBox.max.x, max.x);
    });
    it('isSphereAboveXYBox should work properly', () => {
        const sphere = { radius: 5, position: new THREE.Vector3(23, 0, 0) };
        assert.equal(obb.isSphereAboveXYBox(sphere), true);
    });
});
