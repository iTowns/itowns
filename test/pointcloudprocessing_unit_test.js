import PointCloudProcessing from '../src/Process/PointCloudProcessing';
/* global describe, it */

const assert = require('assert');

describe('preUpdate', function () {
    it('should return root if no change source', () => {
        const layer = { root: {} };
        const sources = new Set();
        assert.equal(
            layer.root,
            PointCloudProcessing.preUpdate(null, layer, sources)[0]);
    });

    it('should return root if no common ancestors', () => {
        const layer = { root: {}, id: 'a' };
        const elt1 = { name: '12', obj: { layer: 'a', isPoints: true } };
        const elt2 = { name: '345', obj: { layer: 'a', isPoints: true } };
        const sources = new Set();
        sources.add(elt1);
        sources.add(elt2);
        assert.equal(
            layer.root,
            PointCloudProcessing.preUpdate(null, layer, sources)[0]);
    });

    it('should return common ancestor', () => {
        const layer = { root: {}, id: 'a' };
        const elt1 = { name: '123', obj: { layer: 'a', isPoints: true } };
        const elt2 = { name: '12567', obj: { layer: 'a', isPoints: true } };
        const elt3 = { name: '122', obj: { layer: 'a', isPoints: true } };
        const sources = new Set();
        sources.add(elt1);
        sources.add(elt2);
        sources.add(elt3);
        layer.root.findChildrenByName = (name) => {
            assert.equal('12', name);
        };
        PointCloudProcessing.preUpdate(null, layer, sources);
    });

    it('should not search ancestors if layer are different root if no common ancestors', () => {
        const layer = { root: {}, id: 'a' };
        const elt1 = { name: '12', obj: { layer: 'a', isPoints: true } };
        const elt2 = { name: '13', obj: { layer: 'b', isPoints: true } };
        const sources = new Set();
        sources.add(elt1);
        sources.add(elt2);
        layer.root.findChildrenByName = (name) => {
            assert.equal('12', name);
        };
        PointCloudProcessing.preUpdate(null, layer, sources);
    });
});
