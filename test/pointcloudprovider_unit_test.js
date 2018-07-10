/* global describe, it */
import assert from 'assert';
import { _testing } from '../src/Provider/PointCloudProvider';


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

        _testing.setLayerMetadata(metadata, layer);
        const normalDefined = layer.material.defines.NORMAL || layer.material.defines.NORMAL_SPHEREMAPPED || layer.material.defines.NORMAL_OCT16;
        assert.ok(!normalDefined);

        // normals as vector
        layer.material = { defines: {} };
        metadata.pointAttributes = ['POSITION', 'NORMAL', 'CLASSIFICATION'];
        _testing.setLayerMetadata(metadata, layer);
        assert.ok(layer.material.defines.NORMAL);
        assert.ok(!layer.material.defines.NORMAL_SPHEREMAPPED);
        assert.ok(!layer.material.defines.NORMAL_OCT16);

        // spheremapped normals
        layer.material = { defines: {} };
        metadata.pointAttributes = ['POSITION', 'COLOR_PACKED', 'NORMAL_SPHEREMAPPED'];
        _testing.setLayerMetadata(metadata, layer);
        assert.ok(!layer.material.defines.NORMAL);
        assert.ok(layer.material.defines.NORMAL_SPHEREMAPPED);
        assert.ok(!layer.material.defines.NORMAL_OCT16);

        // oct16 normals
        layer.material = { defines: {} };
        metadata.pointAttributes = ['POSITION', 'COLOR_PACKED', 'CLASSIFICATION', 'NORMAL_OCT16'];
        _testing.setLayerMetadata(metadata, layer);
        assert.ok(!layer.material.defines.NORMAL);
        assert.ok(!layer.material.defines.NORMAL_SPHEREMAPPED);
        assert.ok(layer.material.defines.NORMAL_OCT16);
    });
});

