import assert from 'assert';
import PotreeNode from 'Core/PotreeNode';
import sinon from 'sinon';
import { buildVoxelKey } from 'Core/PointCloudNode';

const crs = 'EPSG:4978';

describe('Potree Node', function () {
    const bounds = [0, 0, 0, 10, 10, 10];
    const zmin = 1;
    const zmax = 9;
    const source = {
        spacing: 10,
        crs,
        bounds,
        zmin,
        zmax,
        baseurl: 'sourceBaseUrl',
        extensionOctree: 'hrc',
        networkOptions: 'networkOptions',
        fetcher: () => 'fetcher',
    };

    describe('constructor', () => {
        it('instanciate a node (without hierarchy)', () => {
            const depth = 2;
            const key = { x: 5, y: 12, z: 2 };
            const node = new PotreeNode(depth, ...Object.values(key), source, crs);
            assert.ok(node instanceof PotreeNode);
            assert.equal(node.numPoints, -1);
            assert.deepStrictEqual(node.hierarchy, {});
            assert.equal(node.hierarchyKey, 'r');
            assert.equal(node.url, `${node.source.baseurl}/${node.hierarchyKey}.bin`);
        });

        it('instanciate a node (deeper than hierarchy step size)', () => {
            const depth = 6;
            const key = { x: 6, y: 66, z: 33 };
            const source2 = { ...source, hierarchyStepSize: 5 };
            const voxelKey = [buildVoxelKey(depth, ...Object.values(key))];
            const hierarchyKey = 'r12345';
            const hierarchy = {
                [voxelKey]: {
                    hierarchyKey,
                    childrenBitField: 1,
                    numPoints: -1, // for it to load the hierarchy
                },
            };
            const node = new PotreeNode(depth, ...Object.values(key), source2, crs, hierarchy);
            assert.ok(node instanceof PotreeNode);
            assert.equal(node.numPoints, -1);
            assert.deepStrictEqual(node.hierarchy, hierarchy);
            assert.equal(node.hierarchyKey, hierarchyKey);
            assert.equal(node.url, `${node.source.baseurl}/${hierarchyKey.slice(1)}/${node.hierarchyKey}.bin`);
        });
    });

    describe('getters', () => {
        let root;
        before('instanciate a root node', function () {
            root = new PotreeNode(0, 0, 0, 0, source, crs);
        });

        it('get networkOptions', () => {
            assert.equal(root.networkOptions, source.networkOptions);
        });
    });

    describe('methods', () => {
        let node;
        const depth = 2;
        const key = { x: 5, y: 12, z: 2 };
        const numPoints = 5000;

        // childNode;
        const childKey = { x: 10, y: 24, z: 4 };// as childIndex 0
        const childNumPoints = numPoints * 0.5;

        let hierarchyParent;
        let hierarchyChild;

        const spy = {};
        const stub = {};
        before('instanciate node', function () {
            const voxelKey = [buildVoxelKey(depth, ...Object.values(key))];
            hierarchyParent = {
                [voxelKey]: {
                    hierarchyKey: 'r',
                    childrenBitField: 1,
                    numPoints: -1, // for it to load the hierarchy
                },
            };
            node = new PotreeNode(depth, ...Object.values(key), source, crs, hierarchyParent);

            hierarchyChild = { ...hierarchyParent };
            hierarchyChild[voxelKey].numPoints = numPoints;
            hierarchyChild[buildVoxelKey(depth + 1, ...Object.values(childKey))] = {
                hierarchyKey: 'r0',
                childrenBitField: 0,
                numPoints: childNumPoints,
            };
        });

        afterEach('restore spies', function () {
            Object.keys(spy).forEach((s) => {
                spy[s].restore();
                delete spy[s];
            });

            Object.keys(stub).forEach((s) => {
                stub[s].restore();
                delete stub[s];
            });
        });

        describe('fetcher()', () => {
            it('basique', () => {
                const mockSource = sinon.mock(source);
                mockSource.expects('fetcher').once().withArgs('url', 'networkOptions');

                node.fetcher('url', 'networkOptions');
                mockSource.verify();
            });

            it('bug v1.7', async () => {
                const nbNodes = 5;
                const bytesPerNode = 16;// data
                stub.fetcherSource = sinon.stub(source, 'fetcher')
                    .returns(Promise.resolve(new ArrayBuffer(nbNodes * bytesPerNode)));

                node.numPoints = 9999;

                await node.fetcher('url.bin', 'networkOptions');

                assert.ok(stub.fetcherSource.calledOnceWith('url.bin', 'networkOptions'));
                assert.equal(node.numPoints, nbNodes);
                // restore
                node.numPoints = -1;
            });
        });

        describe('loadHierarchy()', () => {
            function createHierarchyBuff(url, hierarchyUrl, v17bug) {
                if (url === hierarchyUrl) {
                    const bytesPerNode = 5;// hierarchy
                    const arrayBuf = new ArrayBuffer(2 * bytesPerNode);
                    const view = new DataView(arrayBuf);
                    // root
                    view.setUint8(0, 1);// childrenBitField
                    view.setUint32(1, v17bug ? 0 : numPoints, true);// numPoints
                    // child
                    view.setUint8(5, 0);// childrenBitField
                    view.setUint32(6, childNumPoints, true);// numPoints
                    return Promise.resolve(arrayBuf);
                }
                return Promise.reject(`${url}: url not valid`);
            }

            beforeEach(function () {
                const hierarchyUrl = `${source.baseurl}/${node.hierarchyKey}.${source.extensionOctree}`;
                stub.fetcherNode = sinon.stub(node, 'fetcher')
                    .callsFake(url => createHierarchyBuff(url, hierarchyUrl));
            });

            it('hierarchy not yet loaded', async () => {
                assert.ok(!node.hierarchyIsLoaded);

                await node.loadHierarchy();

                assert.equal(node.numPoints, numPoints);

                assert.deepStrictEqual(node.hierarchy, hierarchyChild);
            });

            it('hierarchy already loaded', async () => {
                assert.ok(node.hierarchyIsLoaded);

                const callCountBefore = stub.fetcherNode.callCount;
                await node.loadHierarchy();
                const callCountAfter = stub.fetcherNode.callCount;

                assert.equal(callCountAfter - callCountBefore, 0, 'fetching called!');
                assert.deepStrictEqual(node.hierarchy, hierarchyChild);
            });

            it('Special cases: v1.7 bug and hierarchyStepSize', async () => {
                const depth = 6;
                const key = { x: 6, y: 66, z: 33 };
                const source2 = { ...source, hierarchyStepSize: 1 };
                const voxelKey = [buildVoxelKey(depth, ...Object.values(key))];
                const hierarchyKey = 'r12345';
                const hierarchyParent = {
                    [voxelKey]: {
                        hierarchyKey,
                        childrenBitField: 1,
                        numPoints: -1, // for it to load the hierarchy
                    },
                };
                const nodeBug = new PotreeNode(depth, ...Object.values(key), source2, crs, hierarchyParent);
                const hierarchyUrl = `${nodeBug.source.baseurl}/1/${nodeBug.hierarchyKey}.${source.extensionOctree}`;
                stub.fetcherNodeBug = sinon.stub(nodeBug, 'fetcher')
                    .callsFake(url => createHierarchyBuff(url, hierarchyUrl, true));

                const childKey = { x: 12, y: 132, z: 66 };// as childIndex 0
                const hierarchyChild = hierarchyParent;
                hierarchyChild[voxelKey].numPoints = 9999;// default value

                hierarchyChild[buildVoxelKey(depth + 1, ...Object.values(childKey))] = {
                    hierarchyKey: hierarchyKey + 0,
                    childrenBitField: 0,
                    numPoints: -1, // to reload hierarchy
                };

                assert.ok(!nodeBug.hierarchyIsLoaded);

                const callCountBefore = stub.fetcherNodeBug.callCount;
                await nodeBug.loadHierarchy();
                const callCountAfter = stub.fetcherNodeBug.callCount;

                assert.equal(callCountAfter - callCountBefore, 1, 'fetching not called!');
                assert.deepStrictEqual(nodeBug.hierarchy, hierarchyChild);
            });
        });

        describe('findAndCreateChild()', () => {
            it('child not in hierarchy', () => {
                spy.add = sinon.spy(node, 'add');
                assert.equal(node.children.length, 0);

                node.findAndCreateChild(node.depth + 1, 99, 99, 99);

                assert.equal(node.children.length, 0);
                assert.ok(spy.add.notCalled);
            });

            it('child in hierarchy', () => {
                spy.add = sinon.spy(node, 'add');
                assert.equal(node.children.length, 0);

                node.findAndCreateChild(node.depth + 1, ...Object.values(childKey));

                assert.equal(node.children.length, 1, 'child not added');
                assert.ok(spy.add.calledOnce, 'add() has not been called');
            });
        });
    });
});
