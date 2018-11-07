import * as THREE from 'three';
import assert from 'assert';
import { updateLayeredMaterialNodeImagery } from '../../src/Process/LayeredMaterialNodeProcessing';
import TileMesh from '../../src/Core/TileMesh';
import Extent from '../../src/Core/Geographic/Extent';
import OBB from '../../src/Renderer/ThreeExtended/OBB';
import LayeredMaterial from '../../src/Renderer/LayeredMaterial';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from '../../src/Layer/LayerUpdateStrategy';

describe('updateLayeredMaterialNodeImagery', function () {
    // Misc var to initialize a TileMesh instance
    const geom = new THREE.Geometry();
    geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));

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

    const layer = {
        id: 'foo',
        source: {
            protocol: 'dummy',
            extent: new Extent('EPSG:4326', 0, 0, 0, 0),
        },
        info: { update: () => {} },
    };

    beforeEach('reset state', function () {
        // clear commands array
        context.scheduler.commands = [];
        // reset default layer state

        layer.updateStrategy = {
            type: STRATEGY_MIN_NETWORK_TRAFFIC,
            options: {},
        };
        layer.visible = true;
        layer.source = {
            protocol: 'dummy',
            extentsInsideLimit: () => true,
            extentInsideLimit: () => true,
            zoom: {
                min: 0,
                max: 10,
            },
            extent: { crs: () => 'EPSG:4326' },
        };
    });


    it('hidden tile should not execute commands', () => {
        const tile = new TileMesh(
            layer,
            geom,
            new LayeredMaterial(),
            new Extent('EPSG:4326', 0, 0, 0, 0));
        tile.material.visible = false;
        tile.material.indexOfColorLayer = () => 0;
        tile.parent = { };
        updateLayeredMaterialNodeImagery(context, layer, tile);
        assert.equal(context.scheduler.commands.length, 0);
    });

    it('tile with best texture should not execute commands', () => {
        const tile = new TileMesh(
            layer,
            geom,
            new LayeredMaterial(),
            new Extent('EPSG:4326', 0, 0, 0, 0));
        tile.material.visible = true;
        tile.material.indexOfColorLayer = () => 0;
        tile.parent = { };
        tile.material.isColorLayerDownscaled = () => false;
        updateLayeredMaterialNodeImagery(context, layer, tile);

        assert.equal(context.scheduler.commands.length, 0);
    });

    it('tile with downscaled texture should execute 1 command', () => {
        const tile = new TileMesh(
            layer,
            geom,
            new LayeredMaterial(),
            new Extent('EPSG:4326', 0, 0, 0, 0),
            2);
        tile.material.visible = true;
        tile.parent = { };
        tile.material.indexOfColorLayer = () => 0;
        tile.material.isColorLayerDownscaled = () => true;
        tile.material.getColorLayerLevelById = () => 1;
        tile.material.getLayerTextures = () => [{}];

        // FIRST PASS: init Node From Parent and get out of the function
        // without any network fetch
        updateLayeredMaterialNodeImagery(context, layer, tile);
        assert.equal(context.scheduler.commands.length, 0);
        // SECOND PASS: Fetch best texture
        updateLayeredMaterialNodeImagery(context, layer, tile);
        assert.equal(context.scheduler.commands.length, 1);
    });

    it('tile should not request texture with level > layer.source.zoom.max', () => {
        const level = 15;
        const countTexture = Math.pow(2, level);
        const tile = new TileMesh(
            layer,
            geom,
            new LayeredMaterial(),
            new Extent('EPSG:4326', 0, 180 / countTexture, 0, 180 / countTexture),
            level);
        tile.material.visible = true;
        tile.parent = { };
        layer.source.protocol = 'wmts';
        layer.source.tileMatrixSet = 'WGS84G';
        // Emulate a situation where tile inherited a level 1 texture
        tile.material.indexOfColorLayer = () => 0;
        tile.material.isColorLayerDownscaled = () => true;
        tile.material.getColorLayerLevelById = () => 1;
        tile.material.getLayerTextures = () => [{}];
        // Since layer is using STRATEGY_MIN_NETWORK_TRAFFIC, we should emit
        // a single command, requesting a texture at layer.source.zoom.max level
        updateLayeredMaterialNodeImagery(context, layer, tile);
        updateLayeredMaterialNodeImagery(context, layer, tile);
        assert.equal(context.scheduler.commands.length, 1);
        assert.equal(
            context.scheduler.commands[0].extentsSource[0].zoom,
            layer.source.zoom.max);
    });
});
