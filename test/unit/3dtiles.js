import proj4 from 'proj4';
import assert from 'assert';
import { Matrix4, Object3D } from 'three';
import Camera from 'Renderer/Camera';
import Coordinates from 'Core/Geographic/Coordinates';
import { computeNodeSSE } from 'Process/3dTilesProcessing';
import { configureTile } from 'Provider/3dTilesProvider';
import C3DTileset from '../../src/Core/3DTiles/C3DTileset';

function tilesetWithRegion(transformMatrix) {
    const tileset = {
        root: {
            boundingVolume: {
                region: [
                    -0.1, -0.1,
                    0.1, 0.1,
                    0, 0],
            },
        },
    };
    if (transformMatrix) {
        tileset.root.transform = transformMatrix.elements;
    }
    return tileset;
}

function tilesetWithBox(transformMatrix) {
    const tileset = {
        root: {
            boundingVolume: {
                box: [
                    0, 0, 0,
                    1, 0, 0,
                    0, 1, 0,
                    0, 0, 1],
            },
        },
    };
    if (transformMatrix) {
        tileset.root.transform = transformMatrix.elements;
    }
    return tileset;
}

function tilesetWithSphere(transformMatrix) {
    const tileset = {
        root: {
            boundingVolume: {
                sphere: [0, 0, 0, 1],
            },
        },
    };
    if (transformMatrix) {
        tileset.root.transform = transformMatrix.elements;
    }
    return tileset;
}

function compareWithEpsilon(a, b, epsilon) {
    return a - epsilon < b && a + epsilon > b;
}

describe('Distance computation using boundingVolume.region', function () {
    const camera = new Camera('EPSG:4978', 100, 100);
    camera.camera3D.position.copy(new Coordinates('EPSG:4326', 0, 0, 10000).as('EPSG:4978').toVector3());
    camera.camera3D.updateMatrixWorld(true);

    it('should compute distance correctly', function () {
        const tilesetJSON = tilesetWithRegion();
        const tileset = new C3DTileset(tilesetJSON, '');
        const tile = new Object3D();
        configureTile(tile, { }, tileset.tiles[0]);

        computeNodeSSE(camera, tile);

        assert.ok(compareWithEpsilon(tile.distance, camera.position().as('EPSG:4326').altitude, 10e-5));
    });

    it('should not be affected by transform', function () {
        const m = new Matrix4().makeTranslation(0, 0, 10).multiply(
            new Matrix4().makeScale(0.01, 0.01, 0.01));
        const tilesetJSON = tilesetWithRegion(m);
        const tileset = new C3DTileset(tilesetJSON, '');
        const tile = new Object3D();
        configureTile(tile, { }, tileset.tiles[0]);

        computeNodeSSE(camera, tile);

        assert.ok(compareWithEpsilon(tile.distance, camera.position().as('EPSG:4326').altitude, 10e-5));
    });
});

describe('Distance computation using boundingVolume.box', function () {
    proj4.defs('EPSG:3946',
        '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

    const camera = new Camera('EPSG:3946', 100, 100);
    camera.camera3D.position.copy(new Coordinates('EPSG:3946', 0, 0, 100).toVector3());
    camera.camera3D.updateMatrixWorld(true);

    it('should compute distance correctly', function () {
        const tilesetJSON = tilesetWithBox();
        const tileset = new C3DTileset(tilesetJSON, '');

        const tile = new Object3D();
        configureTile(tile, { }, tileset.tiles[0]);

        computeNodeSSE(camera, tile);

        assert.equal(tile.distance, 100 - 1);
    });

    it('should affected by transform', function () {
        const m = new Matrix4().makeTranslation(0, 0, 10).multiply(
            new Matrix4().makeScale(0.01, 0.01, 0.01));
        const tilesetJSON = tilesetWithBox(m);

        const tileset = new C3DTileset(tilesetJSON, '');

        const tile = new Object3D();
        configureTile(tile, { }, tileset.tiles[0]);

        tile.updateMatrixWorld(true);

        computeNodeSSE(camera, tile);

        assert.equal(tile.distance, 100 - 1 * 0.01 - 10);
    });
});

describe('Distance computation using boundingVolume.sphere', function () {
    proj4.defs('EPSG:3946',
        '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

    const camera = new Camera('EPSG:3946', 100, 100);
    camera.camera3D.position.copy(new Coordinates('EPSG:3946', 0, 0, 100).toVector3());
    camera.camera3D.updateMatrixWorld(true);

    it('should compute distance correctly', function () {
        const tilesetJSON = tilesetWithSphere();
        const tileset = new C3DTileset(tilesetJSON, '');

        const tile = new Object3D();
        configureTile(tile, { }, tileset.tiles[0]);

        computeNodeSSE(camera, tile);

        assert.equal(tile.distance, 100 - 1);
    });

    it('should affected by transform', function () {
        const m = new Matrix4().makeTranslation(0, 0, 10).multiply(
            new Matrix4().makeScale(0.01, 0.01, 0.01));
        const tilesetJSON = tilesetWithSphere(m);

        const tileset = new C3DTileset(tilesetJSON, '');

        const tile = new Object3D();
        configureTile(tile, { }, tileset.tiles[0]);

        tile.updateMatrixWorld(true);

        computeNodeSSE(camera, tile);

        assert.equal(tile.distance, 100 - 1 * 0.01 - 10);
    });
});
