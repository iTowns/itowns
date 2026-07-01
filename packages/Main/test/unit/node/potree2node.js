import assert from 'assert';
import Potree2Node from 'Core/Potree2Node';
import * as sinon from 'sinon';
import { buildVoxelKey } from 'Core/PointCloudNode';

const BYTES_PER_NODE = 22;
const NODE_TYPE_NORMAL = 0;
const NODE_TYPE_LEAF   = 1;
const NODE_TYPE_PROXY  = 2;

const crs = 'EPSG:4978';

function writeNode(view, index, { type, childrenBitField, numPoints, byteOffset, byteSize }) {
    const off = index * BYTES_PER_NODE;
    view.setUint8(off, type);
    view.setUint8(off + 1, childrenBitField);
    view.setUint32(off + 2, numPoints, true);
    view.setBigInt64(off + 6, BigInt(byteOffset), true);
    view.setBigInt64(off + 14, BigInt(byteSize), true);
}

function createHierarchyBuffer(nodes) {
    const buf = new ArrayBuffer(nodes.length * BYTES_PER_NODE);
    const view = new DataView(buf);
    nodes.forEach((n, i) => writeNode(view, i, n));
    return buf;
}

function nodeVoxelKey(depth, key) {
    return buildVoxelKey(depth, ...Object.values(key));
}

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
        it('instanciate a node (with hierarchy)', () => {
            const depth = 2;
            const key = { x: 5, y: 12, z: 2 };
            const nodeHierarchy = {
                [nodeVoxelKey(depth, key)]: {
                    numPoints: -1,
                    byteOffset: 0n,
                    byteSize: BigInt(firstChunkSize),
                },
            };
            const node = new Potree2Node(depth, ...Object.values(key), source, crs, nodeHierarchy);

            assert.ok(node instanceof Potree2Node);
            assert.equal(node.numPoints, -1);
            assert.deepStrictEqual(node.hierarchy, nodeHierarchy);
            assert.equal(node.url, `${node.source.baseurl}/octree.bin`);
            assert.equal(node.byteOffset, 0n);
            assert.equal(node.byteSize, firstChunkSize);
        });
    });

    describe('getters', () => {
        let root;
        before('instanciate a root node', function () {
            const rootHierarchy = {
                '0-0-0-0': {
                    numPoints: -1,
                    byteOffset: 0n,
                    byteSize: BigInt(firstChunkSize),
                },
            };
            root = new Potree2Node(0, 0, 0, 0, source, crs, rootHierarchy);
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
        const sandbox = sinon.createSandbox();

        let node;
        const depth = 2;
        const key = { x: 5, y: 12, z: 2 };
        const numPoints = 5000;

        // childNode;
        const childKey = { x: 10, y: 24, z: 4 };// as childIndex 0
        const childNumPoints = numPoints * 0.5;

        let hierarchy;

        before('instanciate nodes', function () {
            const voxelKey = [nodeVoxelKey(depth, key)];
            hierarchy = {
                [voxelKey]: {
                    numPoints: -1, // for it to load the hierarchy
                },
            };
            node = new Potree2Node(depth, ...Object.values(key), source, crs, hierarchy);

            hierarchy[voxelKey].numPoints = numPoints;
            hierarchy[voxelKey].byteOffset = dataOffset;
            hierarchy[voxelKey].byteSize = dataSize;
            hierarchy[nodeVoxelKey(depth + 1, childKey)] = {
                numPoints: childNumPoints,
                byteOffset: dataOffset + dataSize,
                byteSize: dataSize,
            };
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('fetcher()', () => {
            const mockSource = sandbox.mock(source);
            mockSource.expects('fetcher').once().withArgs('url', 'networkOptions');

            node.fetcher('url', 'networkOptions');
            mockSource.verify();
        });

        describe('loadHierarchy()', () => {
            let fetcherStub;

            beforeEach(function () {
                const hierarchyUrl = `${node.source.baseurl}/hierarchy.bin`;
                const hierarchyBuf = createHierarchyBuffer([
                    { type: NODE_TYPE_LEAF, childrenBitField: 1, numPoints, byteOffset: dataOffset, byteSize: dataSize },
                    { type: NODE_TYPE_LEAF, childrenBitField: 0, numPoints: childNumPoints, byteOffset: dataOffset + dataSize, byteSize: dataSize },
                ]);
                fetcherStub = sandbox.stub(node, 'fetcher')
                    .callsFake((url) => {
                        if (url === hierarchyUrl) {
                            return Promise.resolve(hierarchyBuf);
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

                const callCountBefore = fetcherStub.callCount;
                await node.loadHierarchy();
                const callCountAfter = fetcherStub.callCount;

                assert.equal(callCountAfter - callCountBefore, 0, 'fetching called!');
                assert.deepStrictEqual(node.hierarchy, hierarchy);
            });

            it('assigns correct voxel keys in hierarchy', async () => {
                // Hierarchy:
                // - depth 0: node (0-0-0-0)
                //   + child at index 0 (1-0-0-0)
                // - depth 1: node (1-0-0-0)
                //   + child at index 4 (2-1-0-0)
                // - depth 2: leaf (2-1-0-0)
                const hierarchy = [
                    { type: NODE_TYPE_NORMAL, childrenBitField: 0b00000001, numPoints: 100, byteOffset: 0,    byteSize: 1000 },
                    { type: NODE_TYPE_NORMAL, childrenBitField: 0b00010000, numPoints: 50,  byteOffset: 1000, byteSize: 500 },
                    { type: NODE_TYPE_LEAF,   childrenBitField: 0,          numPoints: 25,  byteOffset: 1500, byteSize: 250 },
                ];
                const hierarchyBuf = createHierarchyBuffer(hierarchy);

                const initHierarchy = {
                    '0-0-0-0': { numPoints: -1, byteOffset: 0n, byteSize: BigInt(3 * BYTES_PER_NODE) },
                };
                const rootNode = new Potree2Node(0, 0, 0, 0, source, crs, initHierarchy);
                sandbox.stub(rootNode, 'fetcher').resolves(hierarchyBuf);

                await rootNode.loadHierarchy();

                const root = rootNode.hierarchy['0-0-0-0'];
                assert.ok(root, 'Expected hierarchy root to exist');
                assert.equal(root.numPoints, hierarchy[0].numPoints, 'Expected hierarchy root to have correct numPoints');

                const child = rootNode.hierarchy['1-0-0-0'];
                assert.ok(child, 'Expected depth-1 node to exist');
                assert.equal(child.numPoints, hierarchy[1].numPoints, 'Expected depth-1 node to have correct numPoints');

                const grandchild = rootNode.hierarchy['2-1-0-0'];
                assert.ok(grandchild, 'Expected depth-2 node to exist');
                assert.equal(grandchild.numPoints, hierarchy[2].numPoints, 'Expected depth-2 node to have correct numPoints');
            });

            it('handles proxy nodes in the hierarchy', async () => {
                // Hierarchy:
                // - depth 0: root (0-0-0-0)
                //   + child at index 2 (1-0-1-0)
                // - depth 1: proxy (1-0-1-0)
                const hierarchy = [
                    { type: NODE_TYPE_NORMAL, childrenBitField: 0b00000100, numPoints: 200, byteOffset: 0,    byteSize: 2000 },
                    { type: NODE_TYPE_PROXY,  childrenBitField: 0b00000011, numPoints: 999, byteOffset: 5000, byteSize: 888 },
                ];
                const hierarchyBuf = createHierarchyBuffer(hierarchy);

                const initHierarchy = {
                    '0-0-0-0': { numPoints: -1, byteOffset: 0n, byteSize: BigInt(2 * BYTES_PER_NODE) },
                };
                const rootNode = new Potree2Node(0, 0, 0, 0, source, crs, initHierarchy);
                sandbox.stub(rootNode, 'fetcher').resolves(hierarchyBuf);

                await rootNode.loadHierarchy();

                assert.ok(rootNode.hierarchy['0-0-0-0']);

                const child = rootNode.hierarchy['1-0-1-0'];
                assert.ok(child, 'Expected proxy child to exist');
                assert.equal(child.numPoints, -1, 'Expected proxy node to have numPoints = -1');
                assert.equal(child.byteOffset, hierarchy[1].byteOffset);
                assert.equal(child.byteSize, hierarchy[1].byteSize);
            });

            it('produces distinct keys for siblings', async () => {
                // Hierarchy:
                // - depth 0: root (0-0-0-0)
                //   + child at index 5 (1-1-0-1)
                // - depth 1: node (1-1-0-1)
                //   + child at index 0 (2-2-0-2)
                //   + child at index 7 (2-3-1-3)
                // - depth 2: two leaves (2-2-0-2) and (2-3-1-3)
                const hierarchy = [
                    { type: NODE_TYPE_NORMAL, childrenBitField: 0b00100000, numPoints: 100, byteOffset: 0,   byteSize: 100 },
                    { type: NODE_TYPE_NORMAL, childrenBitField: 0b10000001, numPoints: 80,  byteOffset: 100, byteSize: 80 },
                    { type: NODE_TYPE_LEAF,   childrenBitField: 0,          numPoints: 40,  byteOffset: 180, byteSize: 40 },
                    { type: NODE_TYPE_LEAF,   childrenBitField: 0,          numPoints: 30,  byteOffset: 220, byteSize: 30 },
                ];
                const hierarchyBuf = createHierarchyBuffer(hierarchy);

                const initHierarchy = {
                    '0-0-0-0': { numPoints: -1, byteOffset: 0n, byteSize: BigInt(4 * BYTES_PER_NODE) },
                };
                const rootNode = new Potree2Node(0, 0, 0, 0, source, crs, initHierarchy);
                sandbox.stub(rootNode, 'fetcher').resolves(hierarchyBuf);

                await rootNode.loadHierarchy();

                assert.ok(rootNode.hierarchy['1-1-0-1']);

                assert.ok(rootNode.hierarchy['2-2-0-2']);
                assert.equal(rootNode.hierarchy['2-2-0-2'].numPoints, hierarchy[2].numPoints);

                assert.ok(rootNode.hierarchy['2-3-1-3']);
                assert.equal(rootNode.hierarchy['2-3-1-3'].numPoints, hierarchy[3].numPoints);
            });
        });

        describe('findAndCreateChild()', () => {
            it('child not in hierarchy', () => {
                const addSpy = sandbox.spy(node, 'add');
                assert.equal(node.children.length, 0);

                node.findAndCreateChild(node.depth + 1, 99, 99, 99);

                assert.equal(node.children.length, 0);
                assert.ok(addSpy.notCalled);
            });

            it('child in hierarchy', () => {
                const addSpy = sandbox.spy(node, 'add');
                assert.equal(node.children.length, 0);

                node.findAndCreateChild(node.depth + 1, ...Object.values(childKey));

                assert.equal(node.children.length, 1, 'child not added');
                assert.ok(addSpy.calledOnce, 'add() has not been called');
            });
        });
    });
});
