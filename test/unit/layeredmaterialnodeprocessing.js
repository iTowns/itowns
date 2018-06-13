import * as THREE from 'three';
import assert from 'assert';
import { updateLayeredMaterialNodeImagery } from '../../src/Process/LayeredMaterialNodeProcessing';
import TileMesh from '../../src/Core/TileMesh';
import Extent from '../../src/Core/Geographic/Extent';
import OBB from '../../src/Renderer/ThreeExtended/OBB';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from '../../src/Layer/LayerUpdateStrategy';

describe('updateLayeredMaterialNodeImagery', function () {
    // Misc var to initialize a TileMesh instance
    const geom = new THREE.Geometry();
    geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
    const extent = new Extent('EPSG:4326', 0, 0, 0, 0);

    const nodeLayer = { };
    const material = {
        getLayer: () => nodeLayer,
    };

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
        const tile = new TileMesh(geom, material, layer, extent, 0);
        material.visible = false;
        nodeLayer.level = 0;
        tile.parent = { };
        updateLayeredMaterialNodeImagery(context, layer, tile, tile.parent);
        assert.equal(context.scheduler.commands.length, 0);
    });

    it('tile with best texture should not execute commands', () => {
        const tile = new TileMesh(geom, material, layer, extent, 3);
        material.visible = true;
        nodeLayer.level = 3;
        tile.parent = { };
        updateLayeredMaterialNodeImagery(context, layer, tile, tile.parent);
        assert.equal(context.scheduler.commands.length, 0);
    });

    it('tile with downscaled texture should execute 1 command', () => {
        const tile = new TileMesh(geom, material, layer, extent, 2);
        material.visible = true;
        nodeLayer.level = 1;
        tile.parent = { };

        // FIRST PASS: init Node From Parent and get out of the function
        // without any network fetch
        updateLayeredMaterialNodeImagery(context, layer, tile, tile.parent);
        assert.equal(context.scheduler.commands.length, 0);
        // SECOND PASS: Fetch best texture
        updateLayeredMaterialNodeImagery(context, layer, tile, tile.parent);
        assert.equal(context.scheduler.commands.length, 1);
    });

    it('tile should not request texture with level > layer.source.zoom.max', () => {
        const countTexture = Math.pow(2, 15);
        const newExtent = new Extent('EPSG:4326', 0, 180 / countTexture, 0, 180 / countTexture);
        const tile = new TileMesh(geom, material, layer, newExtent, 15);
        // Emulate a situation where tile inherited a level 1 texture
        material.visible = true;
        nodeLayer.level = 1;
        tile.parent = { };
        layer.source.protocol = 'wmts';
        layer.source.tileMatrixSet = 'WGS84G';

        // Since layer is using STRATEGY_MIN_NETWORK_TRAFFIC, we should emit
        // a single command, requesting a texture at layer.source.zoom.max level
        updateLayeredMaterialNodeImagery(context, layer, tile, tile.parent);
        updateLayeredMaterialNodeImagery(context, layer, tile, tile.parent);
        assert.equal(context.scheduler.commands.length, 1);
        assert.equal(
            context.scheduler.commands[0].extentsSource[0].zoom,
            layer.source.zoom.max);
    });
});
