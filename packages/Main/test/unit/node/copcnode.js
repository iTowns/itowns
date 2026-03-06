import assert from 'assert';
import CopcNode from 'Core/CopcNode';
import sinon from 'sinon';
import { Hierarchy } from 'copc';
import { buildVoxelKey } from 'Core/PointCloudNode';

const crs = 'EPSG:4978';

const defaultHierarchy = {
    nodes: {},
    pages: {},
};

describe('Copc Node', function () {
    const bounds = [0, 0, 0, 10, 10, 10];
    const zmin = 1;
    const zmax = 9;
    const source = {
        spacing: 10,
        crs,
        bounds,
        zmin,
        zmax,
        url: 'sourceUrl',
        extension: 'bin',
        networkOptions: { options1: 'options1' },
        fetcher: () => 'fetcher',

        info: { rootHierarchyPage: {
            pageOffset: 0,
            pageLength: 1000,
        } },
    };

    describe('constructor', () => {
        it('instanciate a node (without hierarchy)', () => {
            const depth = 2;
            const key = { x: 5, y: 12, z: 2 };
            const node = new CopcNode(depth, ...Object.values(key), source, crs);
            assert.ok(node instanceof CopcNode);
            assert.equal(node.numPoints, -1);
            assert.deepStrictEqual(node.hierarchy, defaultHierarchy);
            assert.equal(node.url, source.url);
        });
    });

    describe('getters', () => {
        let root;
        before('instanciate a root node', function () {
            root = new CopcNode(0, 0, 0, 0, source, crs);
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
        const childKey = { x: 11, y: 3, z: 7 };
        const childNumPoints = numPoints * 0.5;

        let hierarchy;

        const spy = {};
        const stub = {};
        before('instanciate nodes', function () {
            hierarchy = {
                nodes: {
                    [buildVoxelKey(depth, ...Object.values(key))]: {
                        pointCount: numPoints,
                        pointDataOffset: source.info.rootHierarchyPage.pageLength,
                        pointDataLength: 22,
                    },
                },
                pages: {},
            };

            node = new CopcNode(depth, ...Object.values(key), source, crs);
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
            const networkOptions = {};
            const entryOffset = source.info.rootHierarchyPage.pageOffset;
            const entryLength = source.info.rootHierarchyPage.pageLength;
            const mockSource = sinon.mock(source);
            mockSource.expects('fetcher').once().withArgs('url', {
                headers: { range: `bytes=${entryOffset}-${entryOffset + entryLength - 1}` },
            });

            node.fetcher('url', networkOptions);
            mockSource.verify();
        });

        describe('loadHierarchy()', () => {
            beforeEach(function () {
                const buffer = 2;
                stub.fetcherNode = sinon.stub(node, 'fetcher')
                    .callsFake((url, networkOptions) => {
                        if (url === source.url) {
                            if (networkOptions === 'noHierarchy') {
                                return Promise.resolve(0);
                            }
                            return Promise.resolve(buffer);
                        }
                        return Promise.reject('url not valid');
                    });
                stub.hierarchyParse = sinon.stub(Hierarchy, 'parse')
                    .callsFake((ArrayBuffer) => {
                        if (ArrayBuffer.byteLength === new Uint8Array(buffer).byteLength) {
                            return Promise.resolve(hierarchy);
                        }
                        if (ArrayBuffer.byteLength === 0) {
                            return Promise.resolve(defaultHierarchy);
                        }
                        return Promise.reject('buffer not valid');
                    });
            });

            it('send an error', (done) => {
                assert.ok(!node.hierarchyIsLoaded);

                source.networkOptions = 'noHierarchy';

                node.loadHierarchy()
                    .then(() => {
                        done('No Error thrown');
                    })
                    .catch((err) => {
                        assert.equal(err, '[CopcNode]: Ill-formed data, entry not found in hierarchy.');
                        done();
                    });
            });

            it('get the hierarchy', async () => {
                assert.ok(!node.hierarchyIsLoaded);

                source.networkOptions = {};

                const callCountBefore = stub.hierarchyParse.callCount;
                await node.loadHierarchy();
                const callCountAfter = stub.hierarchyParse.callCount;

                assert.equal(callCountAfter - callCountBefore, 1);

                assert.equal(node.numPoints, numPoints);
                assert.deepStrictEqual(node.hierarchy, hierarchy);
            });

            it('hierarchy already loaded', async () => {
                assert.ok(node.hierarchyIsLoaded);

                const callCountBefore = stub.hierarchyParse.callCount;
                await node.loadHierarchy();
                const callCountAfter = stub.hierarchyParse.callCount;

                assert.equal(callCountAfter - callCountBefore, 0, 'fetching and parsing called!');

                assert.deepStrictEqual(node.hierarchy, hierarchy);
            });
        });

        describe('findAndCreateChild()', () => {
            it('child not in hierarchy', () => {
                spy.add = sinon.spy(node, 'add');
                assert.equal(node.children.length, 0);

                node.findAndCreateChild(node.depth + 1, ...Object.values(childKey));

                assert.equal(node.children.length, 0);
                assert.ok(spy.add.notCalled);
            });

            it('child in hierarchy', () => {
                spy.add = sinon.spy(node, 'add');
                assert.equal(node.children.length, 0);
                // add child in hierarchy file:
                hierarchy.nodes[buildVoxelKey(depth + 1, ...Object.values(childKey))] = {
                    pointCount: childNumPoints,
                    pointDataOffset: source.info.rootHierarchyPage.pageLength * 2,
                    pointDataLength: 22,
                };

                node.findAndCreateChild(node.depth + 1, ...Object.values(childKey));

                assert.equal(node.children.length, 1);
                assert.ok(spy.add.calledOnce);
            });
        });
    });
});
