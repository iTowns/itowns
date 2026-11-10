import assert from 'assert';
import * as THREE from 'three';
import GeometryLayer from 'Layer/GeometryLayer';
import ColorLayer from 'Layer/ColorLayer';

describe('GeometryLayer', function () {
    const geometry = new GeometryLayer('geometry', new THREE.Group(), { source: false });
    const color = new ColorLayer('color', { source: false });

    it('should attached a color layer', function () {
        geometry.attach(color);
        assert.equal(geometry.attachedLayers.length, 1);
    });

    it('should detached a color layer', function () {
        geometry.detach(color);
        assert.equal(geometry.attachedLayers.length, 0);
    });

    it('should clear its state on the parent tiles when deleted', function () {
        const layer = new GeometryLayer('features', new THREE.Group(), { source: false });
        const root = new THREE.Object3D();
        const child = new THREE.Object3D();
        root.add(child);
        for (const node of [root, child]) {
            node.layerUpdateState = { features: {}, other: {} };
            node.link = { features: [], other: [] };
        }
        const parentObject = new THREE.Group();
        parentObject.add(root);
        layer.parent = { object3d: parentObject };

        layer.delete();

        for (const node of [root, child]) {
            assert.deepEqual(Object.keys(node.layerUpdateState), ['other']);
            assert.deepEqual(Object.keys(node.link), ['other']);
        }
    });
});
