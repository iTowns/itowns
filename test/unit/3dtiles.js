import proj4 from 'proj4';
import assert from 'assert';
import { Matrix4, Object3D } from 'three';
import Camera from '../../src/Renderer/Camera';
import Coordinates from '../../src/Core/Geographic/Coordinates';
import { computeNodeSSE } from '../../src/Process/3dTilesProcessing';
import { $3dTilesIndex, configureTile } from '../../src/Provider/3dTilesProvider';

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

describe('Distance computation using boundingVolume.region', function () {
    const camera = new Camera('EPSG:4978', 100, 100);
    camera.camera3D.position.copy(new Coordinates('EPSG:4326', 0, 0, 10000).as('EPSG:4978').xyz());
    camera.camera3D.updateMatrixWorld(true);
    const context = { distance: { min: 0, max: 0, update: () => { } }, camera };

    it('should compute distance correctly', function () {
        const tileset = tilesetWithRegion();
        const tileIndex = new $3dTilesIndex(tileset, '');
        const tile = new Object3D();
        configureTile(tile, { }, tileIndex.index['1']);

        computeNodeSSE(context, tile);

        assert.equal(tile.distance, camera.position().as('EPSG:4326').altitude());
    });

    it('should not be affected by transform', function () {
        const m = new Matrix4().makeTranslation(0, 0, 10).multiply(
            new Matrix4().makeScale(0.01, 0.01, 0.01));
        const tileset = tilesetWithRegion(m);
        const tileIndex = new $3dTilesIndex(tileset, '');
        const tile = new Object3D();
        configureTile(tile, { }, tileIndex.index['1']);

        computeNodeSSE(context, tile);

        assert.equal(tile.distance, camera.position().as('EPSG:4326').altitude());
    });
});

describe('Distance computation using boundingVolume.box', function () {
    proj4.defs('EPSG:3946',
        '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

    const camera = new Camera('EPSG:3946', 100, 100);
    camera.camera3D.position.copy(new Coordinates('EPSG:3946', 0, 0, 100).xyz());
    camera.camera3D.updateMatrixWorld(true);
    const context = { distance: { min: 0, max: 0, update: () => { } }, camera };

    it('should compute distance correctly', function () {
        const tileset = tilesetWithBox();
        const tileIndex = new $3dTilesIndex(tileset, '');

        const tile = new Object3D();
        configureTile(tile, { }, tileIndex.index['1']);

        computeNodeSSE(context, tile);

        assert.equal(tile.distance, 100 - 1);
    });

    it('should affected by transform', function () {
        const m = new Matrix4().makeTranslation(0, 0, 10).multiply(
            new Matrix4().makeScale(0.01, 0.01, 0.01));
        const tileset = tilesetWithBox(m);

        const tileIndex = new $3dTilesIndex(tileset, '');

        const tile = new Object3D();
        configureTile(tile, { }, tileIndex.index['1']);

        tile.updateMatrixWorld(true);

        computeNodeSSE(context, tile);

        assert.equal(tile.distance, 100 - 1 * 0.01 - 10);
    });
});

describe('Distance computation using boundingVolume.sphere', function () {
    proj4.defs('EPSG:3946',
        '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

    const camera = new Camera('EPSG:3946', 100, 100);
    camera.camera3D.position.copy(new Coordinates('EPSG:3946', 0, 0, 100).xyz());
    camera.camera3D.updateMatrixWorld(true);
    const context = { distance: { min: 0, max: 0, update: () => { } }, camera };

    it('should compute distance correctly', function () {
        const tileset = tilesetWithSphere();
        const tileIndex = new $3dTilesIndex(tileset, '');

        const tile = new Object3D();
        configureTile(tile, { }, tileIndex.index['1']);

        computeNodeSSE(context, tile);

        assert.equal(tile.distance, 100 - 1);
    });

    it('should affected by transform', function () {
        const m = new Matrix4().makeTranslation(0, 0, 10).multiply(
            new Matrix4().makeScale(0.01, 0.01, 0.01));
        const tileset = tilesetWithSphere(m);

        const tileIndex = new $3dTilesIndex(tileset, '');

        const tile = new Object3D();
        configureTile(tile, { }, tileIndex.index['1']);

        tile.updateMatrixWorld(true);

        computeNodeSSE(context, tile);

        assert.equal(tile.distance, 100 - 1 * 0.01 - 10);
    });
});
