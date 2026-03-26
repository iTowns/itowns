import assert from 'assert';
import Potree2Node from 'Core/Potree2Node';
import sinon from 'sinon';
import { buildVoxelKey } from 'Core/PointCloudNode';

const crs = 'EPSG:4978';

describe('Potree2 Node', function () {
    const bounds = [0, 0, 0, 10, 10, 10];
    const zmin = 1;
    const zmax = 9;
    const firstChunkSize = 22n;
    const source = {
        spacing: 10,
        crs,
        bounds,
        zmin,
        zmax,
        baseurl: 'sourceBaseUrl',
        extensionOctree: 'hrc',
        networkOptions: { options1: 'options1' },
        fetcher: () => 'fetcher',
        metadata: { hierarchy: { firstChunkSize } },
    };
    const dataOffset = 1000n;
    const dataSize = 100n;

    describe('constructor', () => {
        it('instanciate a node (without hierarchy)', () => {
            const depth = 2;
            const key = { x: 5, y: 12, z: 2 };
            const node = new Potree2Node(depth, ...Object.values(key), source, crs);

            assert.ok(node instanceof Potree2Node);
            assert.equal(node.numPoints, -1);
            assert.deepStrictEqual(node.hierarchy, {});
            assert.equal(node.url, `${node.source.baseurl}/octree.bin`);
            assert.equal(node.byteOffset, 0n);
            assert.equal(node.byteSize, firstChunkSize);
        });
    });

    describe('getters', () => {
        let root;
        before('instanciate a root node', function () {
            root = new Potree2Node(0, 0, 0, 0, source, crs);
        });

        it('get networkOptions', () => {
            const networkOptions = {
                ...source.networkOptions,
                headers: {
                    'content-type': 'multipart/byteranges',
                    Range: `bytes=0-${firstChunkSize - 1n}`,
                },
            };
            assert.deepStrictEqual(root.networkOptions, networkOptions);
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
                    childrenBitField: 1,
                    numPoints: -1, // for it to load the hierarchy
                },
            };
            node = new Potree2Node(depth, ...Object.values(key), source, crs, hierarchy);

            hierarchy[voxelKey].numPoints = numPoints;
            hierarchy[voxelKey].byteOffset = dataOffset;
            hierarchy[voxelKey].byteSize = dataSize;
            hierarchy[buildVoxelKey(depth + 1, ...Object.values(childKey))] = {
                childrenBitField: 0,
                numPoints: childNumPoints,
                byteOffset: dataOffset + dataSize,
                byteSize: dataSize,
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
                const hierarchyUrl = `${node.source.baseurl}/hierarchy.bin`;
                stub.fetcherNode = sinon.stub(node, 'fetcher')
                    .callsFake((url) => {
                        if (url === hierarchyUrl) {
                            const bytesPerNode = 22;
                            const arrayBuf = new ArrayBuffer(2 * bytesPerNode);
                            const view = new DataView(arrayBuf);
                            // root
                            view.setUint8(0, 1);// type
                            view.setUint8(1, 1);// childrenBitField
                            view.setUint32(2, numPoints, true);// numPoints
                            view.setBigInt64(6, dataOffset, true);// byteOffset
                            view.setBigInt64(14, dataSize, true);// byteSize
                            // child
                            view.setUint8(bytesPerNode + 0, 1);// type
                            view.setUint8(bytesPerNode + 1, 0);// childrenBitField
                            view.setUint32(bytesPerNode + 2, childNumPoints, true);// numPoints
                            view.setBigInt64(bytesPerNode + 6, dataOffset + dataSize, true);// byteOffset
                            view.setBigInt64(bytesPerNode + 14, dataSize, true);// byteSize
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
