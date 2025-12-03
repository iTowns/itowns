import assert from 'assert';
import PotreeLayer from 'Layer/PotreeLayer';
import PotreeNode from 'Core/PotreeNode';

describe('preUpdate PotreeLayer', function () {
    let context;
    let source;
    let layer;
    const crs = 'EPSG:4978';
    before(function () {
        context = { camera: { height: 1, camera3D: { fov: 1 } } };
        source = {
            baseurl: 'server.geo',
            bounds: [1000, 1000, 1000, 0, 0, 0],
            crs,
        };
        layer = {
            id: 'a',
            source,
            hierarchyStepSize: 1,
        };
        layer.root = new PotreeNode(0, -1, 4000, 0, source, crs);

        layer.root.add(new PotreeNode(1, 0, 3000, 0, source, crs), 1, layer.root);
        layer.root.children[0].obj = { layer, isPoints: true };
        layer.root.add(new PotreeNode(1, 1, 3000, 0, source, crs), 2, layer.root);
        layer.root.children[1].obj = { layer, isPoints: true };
        layer.root.add(new PotreeNode(1, 2, 3000, 0, source, crs), 3, layer.root);
        layer.root.children[2].obj = { layer, isPoints: true };

        layer.root.children[0].add(new PotreeNode(2, 0, 2000, 0, source, crs), 1, layer.root);
        layer.root.children[0].children[0].obj = { layer, isPoints: true };
        layer.root.children[0].add(new PotreeNode(2, 1, 2000, 0, source, crs), 2, layer.root);
        layer.root.children[0].children[1].obj = { layer, isPoints: true };
        layer.root.children[1].add(new PotreeNode(2, 2, 2000, 0, source, crs), 1, layer.root);
        layer.root.children[1].children[0].obj = { layer, isPoints: true };
        layer.root.children[2].add(new PotreeNode(2, 3, 2000, 0, source, crs), 2, layer.root);
        layer.root.children[2].children[0].obj = { layer, isPoints: true };
        layer.root.children[2].add(new PotreeNode(2, 4, 2000, 0, source, crs), 3, layer.root);
        layer.root.children[2].children[1].obj = { layer, isPoints: true };

        layer.root.children[0].children[0].add(new PotreeNode(3, 0, 1000, 0, source, crs), 1, layer.root);
        layer.root.children[0].children[0].children[0].obj = { layer, isPoints: true };
        layer.root.children[0].children[0].add(new PotreeNode(3, 1, 1000, 0, source, crs), 5, layer.root);
        layer.root.children[0].children[0].children[1].obj = { layer, isPoints: true };
        layer.root.children[0].children[1].add(new PotreeNode(3, 2, 1000, 0, source, crs), 4, layer.root);
        layer.root.children[0].children[1].children[0].obj = { layer, isPoints: true };
        layer.root.children[2].children[1].add(new PotreeNode(3, 3, 1000, 0, source, crs), 1, layer.root);
        layer.root.children[2].children[1].children[0].obj = { layer, isPoints: true };
        layer.root.children[2].children[1].add(new PotreeNode(3, 4, 1000, 0, source, crs), 2, layer.root);
        layer.root.children[2].children[1].children[1].obj = { layer, isPoints: true };
        layer.root.children[2].children[1].add(new PotreeNode(3, 5, 1000, 0, source, crs), 3, layer.root);
        layer.root.children[2].children[1].children[2].obj = { layer, isPoints: true };
        layer.root.children[2].children[1].add(new PotreeNode(3, 6, 1000, 0, source, crs), 4, layer.root);
        layer.root.children[2].children[1].children[3].obj = { layer, isPoints: true };
    });

    it('should return root if no change source', () => {
        const sources = new Set();
        assert.deepStrictEqual(
            layer.root,
            PotreeLayer.prototype.preUpdate.call(layer, context, sources)[0]);
    });

    it('should return root if no common ancestors', () => {
        const sources = new Set();
        sources.add(layer.root.children[0].children[0]);
        sources.add(layer.root.children[2].children[1]);
        assert.deepStrictEqual(
            layer.root,
            PotreeLayer.prototype.preUpdate.call(layer, context, sources)[0]);
    });

    it('should return common ancestor', () => {
        const sources = new Set();
        sources.add(layer.root.children[2].children[0]);
        sources.add(layer.root.children[2].children[1]);
        sources.add(layer.root.children[2].children[1].children[2]);
        sources.add(layer.root.children[2].children[1].children[3]);
        assert.deepStrictEqual(
            layer.root.children[2],
            PotreeLayer.prototype.preUpdate.call(layer, context, sources)[0]);
    });

    it('should not search ancestors if layer are different root if no common ancestors', () => {
        const sources = new Set();
        sources.add(layer.root.children[2].children[0]);
        sources.add(layer.root.children[2].children[1].children[3]);
        layer.root.children[2].children[1].children[3].obj = { layer: {}, isPoints: true };
        assert.deepStrictEqual(
            layer.root.children[2].children[0],
            PotreeLayer.prototype.preUpdate.call(layer, context, sources)[0]);
    });
});
