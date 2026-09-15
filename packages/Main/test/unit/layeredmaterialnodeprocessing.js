import * as THREE from 'three';
import assert from 'assert';
import TileMesh from 'Core/TileMesh';
import { Extent } from '@itowns/geographic';
import OBB from 'Renderer/OBB';
import ColorLayer from 'Layer/ColorLayer';
import Source from 'Source/Source';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from 'Layer/LayerUpdateStrategy';
import { RasterColorTile } from 'Renderer/RasterTile';
import { LayeredMaterial } from 'Renderer/LayeredMaterial';

describe('updateLayeredMaterialNodeImagery', function () {
    // Misc var to initialize a TileMesh instance
    const geom = new THREE.BufferGeometry();
    geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
    const extent = new Extent('EPSG:4326', 0, 11.25, 0, 11.25);
    const material = new LayeredMaterial();

    // Mock scheduler
    const context = {
        view: {
            notifyChange: () => true,
        },
        scheduler: {
            commands: [],
            execute: (cmd) => {
                context.scheduler.commands.push(cmd);
                return new Promise(() => {  });
            },
        },
    };

    context.view.mainLoop = {
        scheduler: context.scheduler,
    };

    const source = new Source({
        url: 'http://',
        crs: 'EPSG:4326',
        extent,
    });

    const layer = new ColorLayer('foo', {
        source,
        crs: 'EPSG:4326',
        info: { update: () => { } },
    });
    layer.tileMatrixSets = [
        'EPSG:4326',
        'EPSG:3857',
    ];
    layer.parent = {
        tileMatrixSets: [
            'EPSG:4326',
            'EPSG:3857',
        ],
    };

    const node = new TileMesh(geom, material, layer, extent, 0);
    const tiles = node.getExtentsByProjection(layer.crs);

    const nodeLayer = new RasterColorTile(layer, tiles);

    material.getTile = () => nodeLayer;

    beforeEach('reset state', function () {
        // clear commands array
        context.scheduler.commands = [];
        // reset default layer state

        layer.updateStrategy = {
            type: STRATEGY_MIN_NETWORK_TRAFFIC,
            options: {},
        };
        layer.visible = true;

        source.hasData = () => true;
        source.zoom = { min: 0, max: 10 };
        source.extent = new Extent('EPSG:4326');
    });

    it('hidden tile should not execute commands', () => {
        const tile = new TileMesh(geom, material, layer, extent, 0);
        material.visible = false;
        nodeLayer.level = 0;
        tile.parent = {};
        layer.update(context, layer, tile);
        assert.equal(context.scheduler.commands.length, 0);
    });

    it('tile with best texture should not execute commands', () => {
        const tile = new TileMesh(geom, material, layer, extent);
        material.visible = true;
        nodeLayer.state.state = 4;
        tile.parent = {};
        layer.update(context, layer, tile);
        assert.equal(context.scheduler.commands.length, 0);
    });

    it('tile with downscaled texture should execute 1 command', () => {
        const tile = new TileMesh(geom, material, layer, extent, 2);
        material.visible = true;
        nodeLayer.level = 1;
        nodeLayer.state.state = 0;
        tile.parent = {};

        layer.update(context, layer, tile);
        assert.equal(context.scheduler.commands.length, 1);
    });

    it('tile should not request texture with level > layer.source.zoom.max', () => {
        const countTexture = 2 ** 15;
        const newExtent = new Extent('EPSG:4326', 0, 180 / countTexture, 0, 180 / countTexture);
        const tile = new TileMesh(geom, material, layer, newExtent);
        // Emulate a situation where tile inherited a level 1 texture
        material.visible = true;
        nodeLayer.level = 1;
        nodeLayer.tiles = tile.getExtentsByProjection(layer.crs);
        nodeLayer.state.state = 0;
        tile.parent = {};
        source.isWMTSSource = true;
        source.tileMatrixSet = 'WGS84G';
        // Emulate a situation where tile inherited a level 1 texture
        tile.material.indexOfColorLayer = () => 0;
        tile.material.isColorLayerDownscaled = () => true;
        tile.material.getColorLayerLevelById = () => 1;
        tile.material.getLayerTextures = () => [{}];
        // Since layer is using STRATEGY_MIN_NETWORK_TRAFFIC, we should emit
        // a single command, requesting a texture at layer.source.zoom.max level
        layer.update(context, layer, tile);

        assert.equal(context.scheduler.commands.length, 1);
        assert.equal(
            context.scheduler.commands[0].extentsSource[0].zoom,
            layer.source.zoom.max);
    });
});

