import assert from 'assert';
import EntwinePointTileNode from 'Core/EntwinePointTileNode';
import sinon from 'sinon';
import Fetcher from 'Provider/Fetcher';
import { buildVoxelKey } from 'Core/PointCloudNode';

const crs = 'EPSG:4978';

describe('Entwine Point Tile Node', function () {
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
        networkOptions: 'networkOptions',
        fetcher: () => 'fetcher',
    };

    describe('constructor', () => {
        it('instanciate a node (without hierarchy)', () => {
            const depth = 2;
            const key = { x: 5, y: 12, z: 2 };
            const node = new EntwinePointTileNode(depth, ...Object.values(key), source, crs);
            assert.ok(node instanceof EntwinePointTileNode);
            assert.equal(node.numPoints, -1);
            assert.deepStrictEqual(node.hierarchy, {});
            assert.equal(node.url, `${node.source.url}/ept-data/${node.voxelKey}.${node.source.extension}`);
        });
    });

    describe('getters', () => {
        let root;
        before('instanciate a root node', function () {
            root = new EntwinePointTileNode(0, 0, 0, 0, source, crs);
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
                [buildVoxelKey(depth, ...Object.values(key))]: numPoints,
            };

            node = new EntwinePointTileNode(depth, ...Object.values(key), source, crs);
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
            before(function () {
                const hierarchyUrl = `${source.url}/ept-hierarchy/${node.voxelKey}.json`;
                stub.fetcherJson = sinon.stub(Fetcher, 'json')
                    .callsFake((url) => {
                        if (url === hierarchyUrl) {
                            return Promise.resolve(hierarchy);
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

                await node.loadHierarchy();

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
                hierarchy[buildVoxelKey(depth + 1, ...Object.values(childKey))] = childNumPoints;

                node.findAndCreateChild(node.depth + 1, ...Object.values(childKey));

                assert.equal(node.children.length, 1);
                assert.ok(spy.add.calledOnce);
            });
        });
    });
});
