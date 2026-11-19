import * as THREE from 'three';
import ElevationLayer from 'Layer/ElevationLayer';
import WMTSSource from 'Source/WMTSSource';
import Fetcher from 'Provider/Fetcher';
import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import { Coordinates, Extent } from '@itowns/geographic';
import TileMesh from 'Core/TileMesh';
import OBB from 'Renderer/OBB';
import DEMUtils, { readTextureValueWithBilinearFiltering } from 'Utils/DEMUtils';
import { computeTerrainRGBMinMax } from 'Parser/TerrainRGB';
import { sharedReadContext2D } from 'Utils/CanvasUtils';
import { LayeredMaterial } from 'Renderer/LayeredMaterial';
import * as sinon from 'sinon';
import Renderer from './bootstrap';

const BIL_ROWS = 256;
const BIL_COLS = 256;
function createBilData(elevation = 1) {
    return new Float32Array(new Array(BIL_COLS * BIL_ROWS).fill(elevation));
}

describe('DemUtils', function () {
    const renderer = new Renderer();
    const placement = { coord: new Coordinates('EPSG:4326', 1.5, 43), zoom: 10 };
    const viewer = new GlobeView(renderer.domElement, placement, { renderer });

    let elevationlayer;
    let stubFetcherTextFloat;
    const ELEVATION = 300;

    it('decodes and interpolates Terrain-RGB elevations', () => {
        const texture = new THREE.DataTexture(new Uint8Array([
            1, 134, 160, 255, 1, 134, 170, 255,
            1, 134, 180, 255, 1, 134, 190, 255,
        ]), 2, 2, THREE.RGBAFormat);
        const metadata = { useRgbaTextureElevation: true };
        assert.equal(readTextureValueWithBilinearFiltering(metadata, texture, 0.25, 0.25), 0);
        assert.equal(readTextureValueWithBilinearFiltering(metadata, texture, 0.75, 0.75), 3);
        assert.equal(readTextureValueWithBilinearFiltering(metadata, texture, 0.5, 0.5), 1.5);
        assert.equal(readTextureValueWithBilinearFiltering(
            { ...metadata, zmin: 2, zmax: 4, scale: 2, bias: 1 }, texture, 0.5, 0.5), 5);
    });

    it('decodes negative elevations and carries between Terrain-RGB channels', () => {
        const texture = new THREE.DataTexture(new Uint8Array([
            1, 134, 159, 255, 1, 134, 255, 255, 1, 135, 0, 255,
        ]), 3, 1, THREE.RGBAFormat);
        const metadata = { useRgbaTextureElevation: true };
        assert.ok(Math.abs(readTextureValueWithBilinearFiltering(metadata, texture, 1 / 6, 0.5) + 0.1) < 1e-9);
        assert.ok(Math.abs(readTextureValueWithBilinearFiltering(metadata, texture, 2 / 3, 0.5) - 9.55) < 1e-9);
    });

    it('computes conservative Terrain-RGB bounds for inherited texture regions', () => {
        const pixels = new Uint8Array(4 * 4 * 4);
        for (let i = 0; i < 16; i++) {
            const value = 100000 + i * 10;
            pixels.set([value >> 16, (value >> 8) & 255, value & 255, 255], i * 4);
        }
        const texture = new THREE.DataTexture(pixels, 4, 4, THREE.RGBAFormat);
        const topLeft = computeTerrainRGBMinMax(texture, new THREE.Vector4(0, 0, 0.5, 0.5));
        const bottomRight = computeTerrainRGBMinMax(texture, new THREE.Vector4(0.5, 0.5, 0.5, 0.5), 7, 12);
        assert.deepEqual(topLeft, { min: -0.5, max: 10.5 });
        assert.deepEqual(bottomRight, { min: 7, max: 12 });
    });

    it('reuses image readback and retains conservative bounds for transparent pixels', () => {
        const ctx = sharedReadContext2D();
        const draw = sinon.stub(ctx, 'drawImage');
        const read = sinon.stub(ctx, 'getImageData').returns({ data: new Uint8ClampedArray([1, 134, 160, 255]) });
        try {
            const texture = new THREE.Texture({ width: 1, height: 1 });
            const pitch = new THREE.Vector4(0, 0, 1, 1);
            assert.deepEqual(computeTerrainRGBMinMax(texture, pitch), { min: -0.5, max: 0.5 });
            computeTerrainRGBMinMax(texture, pitch);
            assert.equal(read.callCount, 1);
            read.returns({ data: new Uint8ClampedArray([0, 0, 0, 0]) });
            texture.needsUpdate = true;
            assert.deepEqual(computeTerrainRGBMinMax(texture, pitch, -100, 5000), { min: -100, max: 5000 });
            assert.equal(read.callCount, 2);
        } finally {
            draw.restore();
            read.restore();
        }
    });

    it('rejects noDataValue for Terrain-RGB elevation', () => {
        assert.throws(() => new ElevationLayer('rgb', {
            useRgbaTextureElevation: true,
            noDataValue: -9999,
        }), /noDataValue is not supported/);
    });

    before(function () {
        stubFetcherTextFloat = sinon.stub(Fetcher, 'textureFloat')
            .callsFake(() => {
                const floatArray = createBilData(ELEVATION);
                const texture = new THREE.DataTexture(floatArray, 256, 256, THREE.RedFormat, THREE.FloatType);
                texture.internalFormat = 'R32F';
                texture.needsUpdate = false;
                return Promise.resolve(texture);
            });

        const source = new WMTSSource({
            format: 'image/x-bil;bits=32',
            crs: 'EPSG:4326',
            url: 'https://data.geopf.fr/wmts?',
            name: 'ELEVATION.ELEVATIONGRIDCOVERAGE.SRTM3',
            tileMatrixSet: 'WGS84G',
        });
        source.url = 'https://github.com/iTowns/iTowns2-sample-data/blob/master/dem3_3_8.bil?raw=true';
        elevationlayer = new ElevationLayer('worldelevation', { source });
    });

    after(() => {
        stubFetcherTextFloat.restore();
    });

    it('add elevation layer', (done) => {
        viewer.addLayer(elevationlayer)
            .then((l) => {
                assert.equal('worldelevation', l.id);
                done();
            }).catch(done);
    });
    const tiles = [];
    const extent = new Extent('EPSG:4326', 5.625, 11.25, 45, 50.625);
    const coord = extent.center();

    it('load elevation texture', (done) => {
        const geom = new THREE.BufferGeometry();
        geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
        const material = new LayeredMaterial();
        const tile = new TileMesh(geom, material, viewer.tileLayer, extent, 5);
        tile.parent = {};
        tiles.push(tile);
        const nodeLayer = elevationlayer.addRasterTile(tile);

        nodeLayer.load(tile, viewer).then(() => {
            assert.equal(nodeLayer.textures[0].image.data[0], ELEVATION);
            done();
        }).catch(done);
    });

    it('get elevation value at center with PRECISE_READ_Z', () => {
        const elevation = DEMUtils.getElevationValueAt(viewer.tileLayer, coord, DEMUtils.PRECISE_READ_Z, tiles);
        assert.equal(elevation, ELEVATION);
    });

    it('get elevation value at center with FAST_READ_Z', () => {
        const elevation = DEMUtils.getElevationValueAt(viewer.tileLayer, coord, DEMUtils.FAST_READ_Z, tiles);
        assert.equal(elevation, ELEVATION);
    });

    it('get terrain at center with PRECISE_READ_Z', () => {
        const elevation = DEMUtils.getTerrainObjectAt(viewer.tileLayer, coord, DEMUtils.PRECISE_READ_Z, tiles);
        assert.equal(elevation.coord.z, ELEVATION);
    });

    it('get terrain at center with FAST_READ_Z', () => {
        const elevation = DEMUtils.getTerrainObjectAt(viewer.tileLayer, coord, DEMUtils.FAST_READ_Z, tiles);
        assert.equal(elevation.coord.z, ELEVATION);
    });
});

