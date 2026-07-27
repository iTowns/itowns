// This test guards against silent breakage of shader string patches applied in
// SkyManager. If a hash mismatch occurs after updating @takram/three-atmosphere,
// review the corresponding replace() calls in SkyManager and update the hash.
import assert from 'assert';
import { createHash } from 'crypto';
import * as THREE from 'three';
import { SkyMaterial, AerialPerspectiveEffect } from '@takram/three-atmosphere';

function sha256(str) {
    return createHash('sha256').update(str).digest('hex');
}

describe('SkyManager shader patch guards', function () {
    it('SkyMaterial fragmentShader hash matches expected', () => {
        const expected = 'b39871691f6d86260b2f9845e257b87490a0c64543c8e48c7e2afc758b1b028a';
        const actual = sha256(new SkyMaterial().fragmentShader);
        assert.strictEqual(
            actual,
            expected,
            'SkyMaterial.fragmentShader has changed — review the outputColor patch in SkyManager',
        );
    });

    it('AerialPerspectiveEffect fragmentShader hash matches expected', () => {
        const expected = '05d18937f03fbbcd2eae54bd249296adab3c6ce2b33a47da952f7c8125cd14e5';
        const actual = sha256(new AerialPerspectiveEffect(new THREE.PerspectiveCamera()).fragmentShader);
        assert.strictEqual(
            actual,
            expected,
            'AerialPerspectiveEffect.fragmentShader has changed — review the inscatter patch in SkyManager',
        );
    });
});
