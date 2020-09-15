import * as THREE from 'three';
import assert from 'assert';
import TileMesh from 'Core/TileMesh';
// import PlanarView from 'Core/Prefab/PlanarView';
import PlanarLayer from 'Core/Prefab/Planar/PlanarLayer';
import { globalExtentTMS } from 'Core/Geographic/Extent';
import TileProvider from 'Provider/TileProvider';
import newTileGeometry from 'Core/Prefab/TileBuilder';

// It is relatively long to create TileMesh on the go (in term of code), so we
// emulate a fake one with the necessary informations in it.
function FakeTileMesh(level, parent) {
    this.id = Math.random().toString(36);
    this.level = level;
    this.parent = parent;
}
FakeTileMesh.prototype = Object.create({});
FakeTileMesh.prototype.constructor = FakeTileMesh;
FakeTileMesh.prototype.findCommonAncestor = TileMesh.prototype.findCommonAncestor;

describe('TileMesh', function () {
    const tree = [
        [new FakeTileMesh(0)],
    ];

    // root + three levels
    for (let i = 1; i < 4; i++) {
        tree[i] = [];
        // four child per parent
        for (let j = 0; j < Math.pow(4, i); j++) {
            const tile = new FakeTileMesh(i, tree[i - 1][~~(j / 4)]);
            tree[i].push(tile);
        }
    }

    const globalExtent = globalExtentTMS.get('EPSG:3857');
    // const view = new PlanarView(viewerDiv, globalExtent, { maxSubdivisionLevel: 20 });

    const planarlayer = new PlanarLayer('globe', globalExtent, new THREE.Group());

    // Mock scheduler
    const context = {
        view: {
            notifyChange: () => true,
        },
        scheduler: {
            commands: [],
            execute: (cmd) => {
                context.scheduler.commands.push(cmd);
                return new Promise(() => { /* no-op */ });
            },
        },
    };

    it('should find the correct common ancestor between two tiles of same level', function () {
        const res = tree[2][0].findCommonAncestor(tree[2][1]);
        assert.equal(res, tree[1][0]);
    });

    it('subdivide tile by 4 tiles', function (done) {
        const tile = planarlayer.object3d.children[0];
        planarlayer.subdivideNode(context, tile);
        const command = context.scheduler.commands[0];
        TileProvider.executeCommand(command).then((tiles) => {
            context.scheduler.commands = [];
            assert.equal(tiles.length, 4);
            done();
        });
    });

    it('Choose the right typed Array', function (done) {
        const paramsGeometry = {
            extent: planarlayer.object3d.children[0].extent,
            level: 0,
            segment: 260,
            disableSkirt: true,
        };

        const a = newTileGeometry(planarlayer.builder, paramsGeometry).then((r) => {
            const position = r.geometry.attributes.position;
            assert.ok(position.array.constructor.name == 'Float32Array');
        });

        const paramsGeometry2 = {
            extent: planarlayer.object3d.children[0].extent,
            level: 0,
            segment: (2 ** 16),
            disableSkirt: true,
        };

        const b = assert.rejects(newTileGeometry(planarlayer.builder, paramsGeometry2), Error);
        Promise.all([a, b]).then(() => done());
    });

    it('catch error when subdivide tile without material', function (done) {
        const tile = planarlayer.object3d.children[0];
        tile.pendingSubdivision = false;
        tile.material = undefined;
        planarlayer.subdivideNode(context, tile);
        const command = context.scheduler.commands[0];
        TileProvider.executeCommand(command).catch((error) => {
            assert.ok(error.isCancelledCommandException);
            done();
        });
    });

    it('should find the correct common ancestor between two tiles of different level', function () {
        const res = tree[2][0].findCommonAncestor(tree[3][4]);
        assert.equal(res, tree[1][0]);
    });

    it('should find the correct common ancestor between two tiles to be the first one', function () {
        const res = tree[2][0].findCommonAncestor(tree[3][0]);
        assert.equal(res, tree[2][0]);
    });

    it('should find the correct common ancestor between two tiles to be the root', function () {
        const res = tree[3][60].findCommonAncestor(tree[2][0]);
        assert.equal(res, tree[0][0]);
    });

    it('Cache tile geometry', function (done) {
        const paramsGeometry = {
            extent: planarlayer.object3d.children[0].extent,
            level: 0,
            segment: 4,
            disableSkirt: true,
        };

        newTileGeometry(planarlayer.builder, paramsGeometry).then((r) => {
            r.geometry._count++;
            return newTileGeometry(planarlayer.builder, paramsGeometry).then((r) => {
                assert.equal(r.geometry._count, 1);
                done();
            });
        });
    });

    it('Dispose tile geometry', function (done) {
        const paramsGeometry = {
            extent: planarlayer.object3d.children[0].extent,
            level: 0,
            segment: 2,
            disableSkirt: true,
        };

        newTileGeometry(planarlayer.builder, paramsGeometry).then((r) => {
            r.geometry.dispose();
            assert.equal(r.geometry.index, null);
            done();
        });
    });
});
