import assert from 'assert';
import { getObjectToUpdateForAttachedLayers, _testing } from 'Provider/PointCloudProvider';

describe('PointCloudProvider', function () {
    it('should correctly parse normal information in metadata', function () {
        const layer = {
            material: { defines: {} },
        };

        // no normals
        const metadata = {
            boundingBox: {
                lx: 0,
                ly: 1,
                ux: 2,
                uy: 3,
            },
            scale: 1.0,
            pointAttributes: ['POSITION', 'RGB'],
        };

        _testing.parseMetadata(metadata, layer);
        const normalDefined = layer.material.defines.NORMAL || layer.material.defines.NORMAL_SPHEREMAPPED || layer.material.defines.NORMAL_OCT16;
        assert.ok(!normalDefined);

        // normals as vector
        layer.material = { defines: {} };
        metadata.pointAttributes = ['POSITION', 'NORMAL', 'CLASSIFICATION'];
        _testing.parseMetadata(metadata, layer);
        assert.ok(layer.material.defines.NORMAL);
        assert.ok(!layer.material.defines.NORMAL_SPHEREMAPPED);
        assert.ok(!layer.material.defines.NORMAL_OCT16);

        // spheremapped normals
        layer.material = { defines: {} };
        metadata.pointAttributes = ['POSITION', 'COLOR_PACKED', 'NORMAL_SPHEREMAPPED'];
        _testing.parseMetadata(metadata, layer);
        assert.ok(!layer.material.defines.NORMAL);
        assert.ok(layer.material.defines.NORMAL_SPHEREMAPPED);
        assert.ok(!layer.material.defines.NORMAL_OCT16);

        // oct16 normals
        layer.material = { defines: {} };
        metadata.pointAttributes = ['POSITION', 'COLOR_PACKED', 'CLASSIFICATION', 'NORMAL_OCT16'];
        _testing.parseMetadata(metadata, layer);
        assert.ok(!layer.material.defines.NORMAL);
        assert.ok(!layer.material.defines.NORMAL_SPHEREMAPPED);
        assert.ok(layer.material.defines.NORMAL_OCT16);
    });
});


describe('getObjectToUpdateForAttachedLayers', function () {
    it('should correctly no-parent for the root', function () {
        const meta = {
            obj: 'a',
        };
        assert.equal(getObjectToUpdateForAttachedLayers(meta).element, 'a');
    });
    it('should correctly return the element and its parent', function () {
        const meta = {
            obj: 'a',
            parent: {
                obj: 'b',
            },
        };
        const result = getObjectToUpdateForAttachedLayers(meta);
        assert.equal(result.element, 'a');
        assert.equal(result.parent, 'b');
    });
});
