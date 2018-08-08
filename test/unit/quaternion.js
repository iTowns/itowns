import * as THREE from 'three';
import assert from 'assert';
/* global describe, it */

describe('Quaternion', function () {
    it('should compare imprecise Quaternion.slerp with Quaternion.slerpFlat with close values', () => {
        const angleA = Math.PI * 0.3330;
        const angleB = Math.PI * 0.3329;
        const A = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angleA);
        const B = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angleB);

        const slerp = 0.25;
        const slerpResult = [];
        THREE.Quaternion.slerpFlat(slerpResult, 0, A.toArray(), 0, B.toArray(), 0, slerp);
        const R = new THREE.Quaternion().fromArray(slerpResult);
        const O = A.clone().slerp(B, slerp);

        const F = new THREE.Euler().setFromQuaternion(R);
        const S = new THREE.Euler().setFromQuaternion(O);

        const result = (angleA * (1 - slerp)) + (angleB * (slerp));
        assert.ok(result - F.z < 1e-15);
        assert.ok(result - S.z > 1e-5);
        if (result - S.z < 1e-15) {
            // eslint-disable-next-line no-console
            console.log(`If this failed, so itowns uses a version greater than or equal to 94. You could replace, itowns code, the
                Quaternion.slerpFlat by Quaternion.slerp. And you can remove the tests on quaternions`);
        }
    });
    it('should compare precise Quaternion.slerp with Quaternion.slerpFlat', () => {
        const A = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 0.333);
        const B = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 0.332);

        const slerpValue = 0.00001;
        const slerpResult = [];
        THREE.Quaternion.slerpFlat(slerpResult, 0, A.toArray(), 0, B.toArray(), 0, slerpValue);
        const R = new THREE.Quaternion().fromArray(slerpResult);
        const O = A.clone().slerp(B, slerpValue);

        assert.equal(R.z, O.z);
        assert.equal(R.w, O.w);
    });
});
