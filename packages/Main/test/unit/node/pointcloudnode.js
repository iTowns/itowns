import assert from 'assert';
import sinon from 'sinon';
import PointCloudNode from 'Core/PointCloudNode';
import { Box3, Vector3 } from 'three';

const crs = 'EPSG:4978';
function newPtCloudNodeWithSource(depth, numPoints, source) {
    const node = new PointCloudNode(depth, numPoints);
    node.source = source;// might be moved to constructor ?
    node.crs = crs;// might be moved to constructor ?
    return node;
}

function newPtCloudNodeWithKey(depth, numPoints, key) {
    const node = new PointCloudNode(depth, numPoints);
    node.x = key.x;
    node.y = key.y;
    node.z = key.z;
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
            const node = new PointCloudNode(depth, numPoints);
            assert.ok(node instanceof PointCloudNode);
            assert.equal(node.numPoints, numPoints);
        });
    });

    describe('getters', () => {
        let root;
        before('instanciate a root node', function () {
            root = newPtCloudNodeWithSource(0, -1, source);
        });

        it('get pointSpacing', () => {
            assert.equal(root.pointSpacing, source.spacing);
        });

        it('get hierarchyIsLoaded', () => {
            assert.equal(root.hierarchyIsLoaded, false);
        });

        it('get id', () => {
            const node = newPtCloudNodeWithKey(0, -1, { x: 5, y: 12, z: 2 });
            assert.equal(node.id, '0051202');
        });
    });

    describe('methods', () => {
        let root;
        let rootWithId;
        let child;
        let childWithId;
        const boundsBox3 = new Box3().setFromArray(source.bounds);
        let spy;
        let stub;
        before('instanciate nodes', function () {
            root = new PointCloudNode(0, 0);
            rootWithId = new newPtCloudNodeWithKey(0, 0, { x: 0, y: 0, z: 0 });

            child = new PointCloudNode(1, 0);
            childWithId = new newPtCloudNodeWithKey(1, 0, { x: 0, y: 1, z: 0 });
        });

        afterEach('restore spies', function () {
            Object.keys(spy).forEach((s) => {
                spy[s].restore();
            });
            if (stub) {
                Object.keys(stub).forEach((s) => {
                    stub[s].restore();
                });
            }
        });

        it('createChildren()', async () => {
            rootWithId.loadHierarchy = () => {
                root.hierarchy = {};
                return {};
            };
            rootWithId.findAndCreateChild = (d, x, y, z) => {};
            spy = {
                loadHierarchy: sinon.spy(rootWithId, 'loadHierarchy'),
                findAndCreateChild: sinon.spy(rootWithId, 'findAndCreateChild'),
            };

            await rootWithId.createChildren();
            assert.ok(spy.loadHierarchy.calledOnce);
            assert.equal(spy.findAndCreateChild.callCount, 8);

            assert.ok(rootWithId._childrenCreated);
        });

        it('load()', async () => {
            root.source = source;
            root._childrenCreated = false;
            root.loadHierarchy = () => {
                root.hierarchy = {};
                return {};
            };
            root.findAndCreateChild = (d, x, y, z) => {};
            spy = {
                createChildren: sinon.spy(root, 'createChildren'),
                loadHierarchy: sinon.spy(root, 'loadHierarchy'),
            };
            root.fetcher = () => Promise.resolve('fetched');
            source.parser = buffer => Promise.resolve(`${buffer ? `${buffer} and ` : ''}parsed`);
            const data = await root.load();
            assert.ok(spy.createChildren.calledOnce);
            assert.ok(spy.loadHierarchy.calledOnce);
            assert.equal(data, 'fetched and parsed');
        });

        it('add()', () => {
            const mock = sinon.mock(child);
            mock.expects('setOBBes').once();
            root.add(child);

            mock.verify();
            assert.equal(root.children.length, 1);
            assert.deepStrictEqual(child.parent, root);
        });

        it('setOBBes()', () => {
            assert.deepStrictEqual(child.parent, root, 'root not declared as parent');
            child.source = source;
            child.crs = child.source.crs;

            stub = {
                computeBBoxFromParent: sinon.stub(child, 'computeBBoxFromParent')
                    .callsFake(() => boundsBox3),
            };

            child.setOBBes();

            assert.deepStrictEqual(child.voxelOBB.natBox, boundsBox3, 'voxelOBB.natBox');
            assert.deepStrictEqual(child.voxelOBB.box3D.min, new Vector3().fromArray([-5, -5, source.bounds[2]]), 'voxelOBB.box3D.min');
            assert.deepStrictEqual(child.voxelOBB.box3D.max, new Vector3().fromArray([5, 5, source.bounds[5]]), 'voxelOBB.box3D.max');

            assert.deepStrictEqual(child.clampOBB.natBox, boundsBox3, 'clampOBB.natBox');
            assert.deepStrictEqual(child.clampOBB.box3D.min, new Vector3().fromArray([-5, -5, source.zmin]));
            assert.deepStrictEqual(child.clampOBB.box3D.max, new Vector3().fromArray([5, 5, source.zmax]));
        });

        it('computeBBoxFromParent()', () => {
            childWithId.parent = rootWithId;
            assert.deepStrictEqual(childWithId.parent, rootWithId, 'root not declared as parent');
            rootWithId.voxelOBB.natBox = boundsBox3;
            const childVoxelBBox = childWithId.computeBBoxFromParent();

            const boundsXMin = source.bounds[0];
            const boundsXMax = source.bounds[3];
            const valueToTest = [boundsXMin, (boundsXMin + boundsXMax) * 0.5, boundsXMax];
            Object.values(childVoxelBBox.min).forEach((v) => {
                assert.ok(valueToTest.includes(v));
            });
            Object.values(childVoxelBBox.max).forEach((v) => {
                assert.ok(valueToTest.includes(v));
            });
        });

        describe('findCommonAncestor()', () => {
            let root;
            before('instantiate the nodes', function () {
                function newPtCloudNodeWithId(depth, numPoints, key) {
                    const node = newPtCloudNodeWithKey(depth, numPoints, key);
                    node.setOBBes = () => {};
                    return node;
                }

                root = newPtCloudNodeWithId(0, 4000, { x: 0, y: 0, z: 0 });

                root.add(newPtCloudNodeWithId(1, 3000, { x: 0, y: 0, z: 0 }));
                root.add(newPtCloudNodeWithId(1, 3000, { x: 0, y: 0, z: 1 }));
                root.add(newPtCloudNodeWithId(1, 3000, { x: 0, y: 1, z: 1 }));

                root.children[0].add(newPtCloudNodeWithId(2, 2000, { x: 0, y: 0, z: 0 }));
                root.children[0].add(newPtCloudNodeWithId(2, 2000, { x: 0, y: 1, z: 0 }));
                root.children[1].add(newPtCloudNodeWithId(2, 2000, { x: 0, y: 1, z: 3 }));
                root.children[2].add(newPtCloudNodeWithId(2, 2000, { x: 0, y: 2, z: 2 }));
                root.children[2].add(newPtCloudNodeWithId(2, 2000, { x: 0, y: 3, z: 3 }));

                root.children[0].children[0].add(newPtCloudNodeWithId(3, 2000, { x: 0, y: 0, z: 0 }));
                root.children[0].children[0].add(newPtCloudNodeWithId(3, 2000, { x: 0, y: 1, z: 0 }));
                root.children[1].children[0].add(newPtCloudNodeWithId(3, 2000, { x: 0, y: 2, z: 7 }));
                root.children[2].children[0].add(newPtCloudNodeWithId(3, 2000, { x: 0, y: 5, z: 4 }));
                root.children[2].children[1].add(newPtCloudNodeWithId(3, 0, { x: 1, y: 6, z: 7 }));
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
