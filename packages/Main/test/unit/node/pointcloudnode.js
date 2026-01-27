import assert from 'assert';
import PointCloudNode from 'Core/PointCloudNode';

const crs = 'EPSG:4978';
function newPtCloudNode(depth, numPoints, source) {
    const node = new PointCloudNode(depth, numPoints);
    node.source = source;// might be moved to constructor ?
    node.crs = crs;// might be moved to constructor ?
    return node;
}

function newPtCloudNodeWithID(depth, numPoints, source, id) {
    const node = new PointCloudNode(depth, numPoints, source);
    node.id = id;
    node.createChildAABB = () => {};
    return node;
}

describe('Point Cloud Node', function () {
    const bounds = [0, 0, 0, 10, 10, 10];
    const zmin = 1;
    const zmax = 9;
    const source = {
        spacing: 10,
        crs,
        bounds,
        zmin,
        zmax,
    };

    describe('constructor', () => {
        it('instanciate a node', () => {
            const depth = 2;
            const numPoints = 5000;
            const node = newPtCloudNode(depth, numPoints, source);
            assert.equal(node.pointSpacing, source.spacing / 2 ** depth);
        });
    });

    describe('getters', () => {
        let root;
        before('instanciate a root node', function () {
            root = newPtCloudNode(0, 0, source);
        });

        it('get pointSpacing', () => {
            assert.equal(root.pointSpacing, source.spacing);
        });

        describe('get center/origin/rotation', () => {
        // will be moved to OBB
        });
    });

    describe('methods', () => {
        let root;
        let child;
        before('instanciate nodes', function () {
            root = newPtCloudNode(0, 0, source);
            root.createChildAABB = () => {};
            child = newPtCloudNode(1, 0, source);
        });

        it.skip('setOBBes()', () => {
            // will be move to OBB
        });

        it('add()', () => {
            root.add(child);
            assert.equal(root.children.length, 1);
            assert.deepStrictEqual(child.parent, root);
        });

        it('load()', async () => {
            // will be rewrite as load will be refactor
            root.octreeIsLoaded = true;// to be replace later on
            root.fetcher = () => Promise.resolve('fetched');
            source.parser = buffer => Promise.resolve(`${buffer ? `${buffer} and ` : ''}parsed`);
            const data = await root.load();
            assert.equal(data, 'fetched and parsed');
        });

        describe('findCommonAncestor()', () => {
            let root;
            before('instantiate the nodes', function () {
                const source = {
                    url: 'http://server.geo',
                    extension: 'laz',
                    bounds: [1000, 1000, 1000, 0, 0, 0],
                };

                root = newPtCloudNodeWithID(0, 4000, source, '0000');

                root.add(newPtCloudNodeWithID(1, 3000, source, '1000'));
                root.add(newPtCloudNodeWithID(1, 3000, source, '1001'));
                root.add(newPtCloudNodeWithID(1, 3000, source, '1011'));

                root.children[0].add(newPtCloudNodeWithID(2, 2000, source, '2000'));
                root.children[0].add(newPtCloudNodeWithID(2, 2000, source, '2010'));
                root.children[1].add(newPtCloudNodeWithID(2, 2000, source, '2013'));
                root.children[2].add(newPtCloudNodeWithID(2, 2000, source, '2022'));
                root.children[2].add(newPtCloudNodeWithID(2, 2000, source, '2033'));

                root.children[0].children[0].add(newPtCloudNodeWithID(3, 2000, source, '3000'));
                root.children[0].children[0].add(newPtCloudNodeWithID(3, 2000, source, '3010'));
                root.children[1].children[0].add(newPtCloudNodeWithID(3, 2000, source, '3027'));
                root.children[2].children[0].add(newPtCloudNodeWithID(3, 2000, source, '3054'));
                root.children[2].children[1].add(newPtCloudNodeWithID(3, 0, source, '3167'));
            });

            let ancestor;
            it('cousins => grand parent', () => {
                ancestor = root.children[2].children[1].children[0].findCommonAncestor(root.children[2].children[0].children[0]);
                assert.deepStrictEqual(ancestor, root.children[2]);
            });

            it('brothers => parent', () => {
                ancestor = root.children[0].children[0].children[0].findCommonAncestor(root.children[0].children[0].children[1]);
                assert.deepStrictEqual(ancestor, root.children[0].children[0]);
            });

            it('grand child and grand grand child => root', () => {
                ancestor = root.children[0].children[1].findCommonAncestor(root.children[2].children[1].children[0]);
                assert.deepStrictEqual(ancestor, root);
            });

            it('parent and child => parent', () => {
                ancestor = root.children[1].findCommonAncestor(root.children[1].children[0].children[0]);
                assert.deepStrictEqual(ancestor, root.children[1]);
            });

            it('child and parent => parent', () => {
                ancestor = root.children[2].children[0].findCommonAncestor(root.children[2]);
                assert.deepStrictEqual(ancestor, root.children[2]);
            });
        });
    });
});
