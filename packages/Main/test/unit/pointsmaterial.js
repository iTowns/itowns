import assert from 'assert';
import {
    Color,
    Matrix3,
    PointsMaterial as TPointsMaterial,
    Texture,
} from 'three';
import PointsMaterial, { PNTS_SIZE_MODE } from 'Renderer/PointsMaterial';

const uvTransform = new Matrix3().setUvTransform(
    4, 4, // offset
    2, 2, // repeat
    Math.PI, 0, 0, // center
);

function assertPointsMaterialEqual(m1, m2) {
    assert.deepEqual(m1.color, m2.color);
    assert.equal(m1.fog, m2.fog);
    assert.equal(m1.map, m2.map);
    assert.equal(m1.size, m2.size);
    assert.equal(m1.sizeAttenuation, m2.sizeAttenuation);
}

describe('PointsMaterial', function () {
    describe('.constructor()', function () {
        it('should default like a THREE.PointsMaterial', function () {
            assertPointsMaterialEqual(
                new TPointsMaterial(),
                new PointsMaterial(),
            );
        });
    });

    describe('#copy()', function () {
        it('should copy a THREE.PointsMaterial', function () {
            const material = new TPointsMaterial();

            // THREE.Material properties
            material.vertexColors = true;
            material.transparent = true;
            material.depthWrite = false;

            // THREE.PointsMaterial properties
            material.color = new Color(0, 0, 1);
            material.fog = false;
            material.map = new Texture();
            material.size = 10;
            material.sizeAttenuation = false;

            const copiedMaterial = new PointsMaterial().copy(material);
            assertPointsMaterialEqual(copiedMaterial, material);
            assert.equal(copiedMaterial.vertexColors, material.vertexColors);
            assert.equal(copiedMaterial.transparent, material.transparent);
            assert.equal(copiedMaterial.depthWrite, material.depthWrite);
        });
    });

    describe('#map', function () {
        it('should update uvTransform from texture matrix', function () {
            const material = new PointsMaterial();
            const texture = new Texture();

            texture.matrix = uvTransform;
            material.map = texture;

            const uniforms = material.uniforms;
            assert.equal(uniforms.map.value, texture);
            assert.deepEqual(uniforms.uvTransform.value, texture.matrix);
        });
    });

    describe('#alphaMap', function () {
        it('should update alphaMapTransform from texture matrix', function () {
            const material = new PointsMaterial();
            const texture = new Texture();

            texture.matrix = uvTransform;
            material.alphaMap = texture;

            const uniforms = material.uniforms;
            assert.equal(uniforms.alphaMap.value, texture);
            assert.deepEqual(uniforms.alphaMapTransform.value, texture.matrix);
        });
    });

    describe('#sizeAttenuation', function () {
        it('should sync with sizeMode', function () {
            const material = new PointsMaterial();

            material.sizeAttenuation = false;
            assert.equal(material.sizeMode, PNTS_SIZE_MODE.VALUE);

            material.sizeMode = PNTS_SIZE_MODE.ATTENUATED;
            assert.equal(material.sizeAttenuation, true);
        });
    });

    describe('#recomputeClassification', function () {
        const material = new PointsMaterial();
        const { classificationTexture } = material;

        it('should recompute the opaque classification texture', function () {
            const scheme = {
                0: { visible: true, color: new Color(0.5, 0.25, 0.125), opacity: 1 },
            };
            material.classificationScheme = scheme;

            material.recomputeClassification();

            const data = classificationTexture.source.data.data;
            assert.deepEqual(
                data.slice(0, 3),
                new Uint8Array(scheme[0].color.toArray().map(c => c * 255)),
            );
            assert.deepEqual(data[3], Math.floor(scheme[0].opacity * 255));
            assert.equal(classificationTexture.userData.transparent, false);
        });

        it('should recompute the transparent classification texture', function () {
            const scheme = {
                0: { visible: true, color: new Color(0.5, 0.25, 0.125), opacity: 0.5 },
            };
            material.classificationScheme = scheme;

            material.recomputeClassification();

            const data = classificationTexture.source.data.data;
            assert.deepEqual(
                data.slice(0, 3),
                new Uint8Array(scheme[0].color.toArray().map(c => c * 255)),
            );
            assert.deepEqual(data[3], Math.floor(scheme[0].opacity * 255));
            assert.equal(classificationTexture.userData.transparent, true);
        });
    });
});
