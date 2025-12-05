import assert from 'assert';
import OBB from 'Renderer/OBB';
import PointCloudNode from 'Core/PointCloudNode';
import PotreeNode from 'Core/PotreeNode';
import sinon from 'sinon';

import StrBuf from '../../data/potree/OctreeBlobSerialized.json';

const buff = JSON.parse(StrBuf).encodeBuff.split(',');
const blob = new Uint8Array(buff).buffer;

describe('potree Node', function () {
    const crs = 'EPSG:4978';
    const numPoints = 1000;

    const potreeSource = {
        baseurl: 'https://octreeDir/r',
        extension: 'bin',
        extensionOctree: 'hrc',
        crs,
    };

    describe('constructor', () => {
        it('instance a node', function () {
            const depth = 2;
            const index = 7;
            const childrenBitField = 5;
            const node = new PotreeNode(depth, index, numPoints, childrenBitField, potreeSource, crs);
            assert.equal(node.numPoints, numPoints);
            assert.equal(node.childrenBitField, childrenBitField);
        });
    });

    describe('getters', () => {
        let root;
        let child;
        let gChild;
        const indexChild = 6;
        const indexGChild = 3;
        before('instanciate a root node', function () {
            root = new PotreeNode(0, -1, 0, 0, potreeSource, crs);
            child = new PotreeNode(1, indexChild, numPoints, 3, potreeSource, crs);
            root.add(child);
            gChild = new PotreeNode(2, indexGChild, numPoints, 3, potreeSource, crs);
            child.add(gChild);
        });

        describe('get hierarchyKey', () => {
            it('on root node', () => {
                assert.equal(root.hierarchyKey, 'r');
            });
            it('on grand child node', () => {
                assert.equal(gChild.hierarchyKey, `r${indexChild}${indexGChild}`);
            });
        });

        it('get id', () => {
            assert.equal(child.id, child.hierarchyKey);
        });

        it('get url', () => {
            assert.equal(child.url, `${potreeSource.baseurl}/r${indexChild}.${potreeSource.extension}`);
        });

        it('get octreeIsLoaded', () => {
            assert.equal(child.url, `${potreeSource.baseurl}/r${indexChild}.${potreeSource.extension}`);
        });
    });

    describe('methods', () => {
        let root;
        let child;
        let gChild;
        const indexChild = 6;
        const indexGChild = 3;
        potreeSource.bounds = [0, 0, 0, 10, 10, 10];
        before('instanciate a root node', function () {
            root = new PotreeNode(0, -1, 0, 0, potreeSource, crs);
            child = new PotreeNode(1, indexChild, numPoints, 3, potreeSource, crs);
            root.add(child);
            gChild = new PotreeNode(2, indexGChild, numPoints, 3, potreeSource, crs);
            child.add(gChild);
        });

        it('setVoxelOBBFromParent()', function () {
            child._voxelOBB = new OBB();
            child.setVoxelOBBFromParent();
            assert.deepStrictEqual(child._voxelOBB.box3D.min.toArray(), [0, 0, 0]);
            assert.deepStrictEqual(child._voxelOBB.box3D.max.toArray(), [5, 5, 5]);
            assert.deepStrictEqual(child._voxelOBB.natBox.min.toArray(), [5, 5, 0]);
            assert.deepStrictEqual(child._voxelOBB.natBox.max.toArray(), [10, 10, 5]);
        });

        it('networkOptions()', () => {
            // should be changed to a getter ?
        });

        it('load()', function () {
            const spyPointCloudNode = sinon.spy(PointCloudNode.prototype, 'load');
            const spyChildNode = sinon.spy(child, 'networkOptions');
            child.load();
            assert.equal(spyPointCloudNode.callCount, 1);
            assert.equal(spyChildNode.callCount, 1);
            spyPointCloudNode.restore();
            spyChildNode.restore();
        });

        it('loadOctree()', async () => {
            potreeSource.fetcher = () => Promise.resolve(blob);
            await gChild.loadOctree();
            assert.equal(6, gChild.children.length);
        });
    });
});
