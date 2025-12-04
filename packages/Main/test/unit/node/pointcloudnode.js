import assert from 'assert';
import { Box3 } from 'three';
import OBB from 'Renderer/OBB';
import PointCloudNode from 'Core/PointCloudNode';
import sinon from 'sinon';

const crs = 'EPSG:4978';
function instanceNode(depth, numPoints, source) {
    const node = new PointCloudNode(depth, numPoints, source);
    node.crs = crs; // might be moved to constructor ?
    return node;
}

function PointCloudNodeWthID(depth, numPoints, source, id) {
    const node = new PointCloudNode(depth, numPoints, source);
    sinon.stub(node, 'id').get(() => id);
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
            const node = instanceNode(depth, numPoints, source);
            assert.equal(node.pointSpacing, source.spacing / 2 ** depth);
        });
    });

    describe('getters', () => {
        let root;
        const expectedNatBox = new Box3().setFromArray(bounds);
        const expectedBox3 = new Box3().setFromArray([-5, -5, 0, 5, 5, 10]);
        const expectedClampBox3 = new Box3().setFromArray([-5, -5, zmin, 5, 5, zmax]);
        before('instanciate a root node', function () {
            root = instanceNode(0, 0, source);
        });

        it('get id -> return Error', () => {
            assert.throws(() => root.id, Error);
        });

        it('get octreeIsLoaded', () => {
            assert.equal(root.octreeIsLoaded, true);
        });

        it('get the voxel OBB', () => {
            const voxelOBB = root.voxelOBB;
            assert.deepStrictEqual(voxelOBB.natBox, expectedNatBox);
            assert.deepStrictEqual(voxelOBB.box3D, expectedBox3);
        });

        describe('get the clamped OBB', () => {
            it('from the voxel OBB', () => {
                const clampOBB = root.clampOBB;
                // natBox is not changed when clamped
                assert.deepStrictEqual(clampOBB.natBox, expectedNatBox);
                assert.deepStrictEqual(clampOBB.box3D, expectedClampBox3);
                delete root._clampOBB;
            });

            it('from source.boundsConforming', () => {
                const boundsConforming = [5, 5, 5, 15, 15, 15];
                source.boundsConforming = boundsConforming;
                const expectedNatBox = new Box3().setFromArray(boundsConforming);
                const expectedBox3 = new Box3().setFromArray([-5, -5, boundsConforming[2], 5, 5, boundsConforming[5]]);
                const clampOBB = root.clampOBB;
                assert.deepStrictEqual(clampOBB.natBox, expectedNatBox);
                assert.deepStrictEqual(clampOBB.box3D, expectedBox3);
            });
        });

        describe('get center/origin/rotation', () => {
        // to be moved to OBB or somewhere else ?
        });
    });

    describe('methods', () => {
        let root;
        let child;
        before('instanciate nodes', function () {
            root = instanceNode(0, 0, source);
            child = instanceNode(1, 0, source);
        });

        it('add()', () => {
            root.add(child);
            assert.equal(root.children.length, 1);
            assert.deepStrictEqual(child.parent, root);
        });

        it('setVoxelOBBFromParent()', () => {
            // x, y, z not defined for a raw PointCloudNode...
            root.x = 0; root.y = 0; root.z = 0;
            child.x = 1; child.y = 1; child.z = 1;

            child._voxelOBB = new OBB();
            child.setVoxelOBBFromParent();
            assert.deepStrictEqual(child._voxelOBB.box3D.min.toArray(), [0, 0, 5]);
            assert.deepStrictEqual(child._voxelOBB.box3D.max.toArray(), [5, 5, 10]);
        });

        it('loadOctree()', () => root.loadOctree()
            .then(function () { throw new Error('loadOctree() was not supposed to succeed'); })
            .catch(function (m) { assert.ok(m instanceof Error); }));

        it('load()', async () => {
            source.fetcher = () => Promise.resolve('fetched');
            source.parser = () => Promise.resolve('parsed');
            assert.equal(await root.load(), 'parsed');
        });

        describe('findCommonAncestor()', () => {
            let root;
            before('instantiate the nodes', function () {
                const source = {
                    url: 'http://server.geo',
                    extension: 'laz',
                    bounds: [1000, 1000, 1000, 0, 0, 0],
                };

                root = PointCloudNodeWthID(0, 4000, source, '0000');

                root.add(new PointCloudNodeWthID(1, 3000, source, '1000'));
                root.add(new PointCloudNodeWthID(1, 3000, source, '1001'));
                root.add(new PointCloudNodeWthID(1, 3000, source, '1011'));

                root.children[0].add(new PointCloudNodeWthID(2, 2000, source, '2000'));
                root.children[0].add(new PointCloudNodeWthID(2, 2000, source, '2010'));
                root.children[1].add(new PointCloudNodeWthID(2, 2000, source, '2013'));
                root.children[2].add(new PointCloudNodeWthID(2, 2000, source, '2022'));
                root.children[2].add(new PointCloudNodeWthID(2, 2000, source, '2033'));

                root.children[0].children[0].add(new PointCloudNodeWthID(3, 2000, source, '3000'));
                root.children[0].children[0].add(new PointCloudNodeWthID(3, 2000, source, '3010'));
                root.children[1].children[0].add(new PointCloudNodeWthID(3, 2000, source, '3027'));
                root.children[2].children[0].add(new PointCloudNodeWthID(3, 2000, source, '3054'));
                root.children[2].children[1].add(new PointCloudNodeWthID(3, 0, source, '3167'));
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
