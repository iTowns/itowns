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

        let hierarchy;

        const spy = {};
        const stub = {};
        before('instanciate nodes', function () {
            const voxelKey = [buildVoxelKey(depth, ...Object.values(key))];
            hierarchy = {
                [voxelKey]: {
                    hierarchyKey: 'r',
                    childrenBitField: 1,
                    numPoints: -1, // for it to load the hierarchy
                },
            };
            node = new PotreeNode(depth, ...Object.values(key), source, crs, hierarchy);

            hierarchy[voxelKey].numPoints = numPoints;
            hierarchy[buildVoxelKey(depth + 1, ...Object.values(childKey))] = {
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

        it('fetcher()', () => {
            const mockSource = sinon.mock(source);
            mockSource.expects('fetcher').once().withArgs('url', 'networkOptions');

            node.fetcher('url', 'networkOptions');
            mockSource.verify();
        });

        describe('loadHierarchy()', () => {
            beforeEach(function () {
                const hierarchyUrl = `${source.baseurl}/${node.hierarchyKey}.${source.extensionOctree}`;
                stub.fetcherNode = sinon.stub(node, 'fetcher')
                    .callsFake((url) => {
                        if (url === hierarchyUrl) {
                            const bytesPerNode = 5;
                            const arrayBuf = new ArrayBuffer(2 * bytesPerNode);
                            const view = new DataView(arrayBuf);
                            // root
                            view.setUint8(0, 1);// childrenBitField
                            view.setUint32(1, numPoints, true);// numPoints
                            // child
                            view.setUint8(5, 0);// childrenBitField
                            view.setUint32(6, childNumPoints, true);// numPoints
                            return Promise.resolve(arrayBuf);
                        }
                        return Promise.reject('url not valid');
                    });
            });

            it('hierarchy not yet loaded', async () => {
                assert.ok(!node.hierarchyIsLoaded);

                await node.loadHierarchy();

                assert.equal(node.numPoints, numPoints);

                assert.deepStrictEqual(node.hierarchy, hierarchy);
            });

            it('hierarchy already loaded', async () => {
                assert.ok(node.hierarchyIsLoaded);

                const callCountBefore = stub.fetcherNode.callCount;
                await node.loadHierarchy();
                const callCountAfter = stub.fetcherNode.callCount;

                assert.equal(callCountAfter - callCountBefore, 0, 'fetching called!');
                assert.deepStrictEqual(node.hierarchy, hierarchy);
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
