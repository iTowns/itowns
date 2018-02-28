import * as THREE from 'three';
import { updateLayeredMaterialNodeImagery } from '../src/Process/LayeredMaterialNodeProcessing';
import TileMesh from '../src/Core/TileMesh';
import Extent from '../src/Core/Geographic/Extent';
import OBB from '../src/Renderer/ThreeExtended/OBB';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from '../src/Core/Layer/LayerUpdateStrategy';
/* global describe, it, xit, beforeEach */

const assert = require('assert');

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
        protocol: 'dummy',
    };

    beforeEach('reset state', function () {
        // clear commands array
        context.scheduler.commands = [];
        // reset default layer state
        layer.tileInsideLimit = () => true;
        layer.visible = true;
        layer.updateStrategy = STRATEGY_MIN_NETWORK_TRAFFIC;
        layer.options = {
            zoom: {
                min: 0,
                max: 10,
            },
        };
    });


    it('hidden tile should not execute commands', () => {
        const tile = new TileMesh(geom, { extent: new Extent('EPSG:4326', 0, 0, 0, 0) });
        tile.material.visible = false;
        tile.material.indexOfColorLayer = () => 0;
        tile.parent = { };
        updateLayeredMaterialNodeImagery(context, layer, tile);
        assert.equal(context.scheduler.commands.length, 0);
    });

    it('tile with best texture should not execute commands', () => {
        const tile = new TileMesh(geom, { extent: new Extent('EPSG:4326', 0, 0, 0, 0) });
        tile.material.visible = true;
        tile.material.indexOfColorLayer = () => 0;
        tile.parent = { };
        tile.material.isColorLayerDownscaled = () => false;
        updateLayeredMaterialNodeImagery(context, layer, tile);

        assert.equal(context.scheduler.commands.length, 0);
    });

    it('tile with downscaled texture should execute 1 command', () => {
        const tile = new TileMesh(geom, {
            extent: new Extent('EPSG:4326', 0, 0, 0, 0),
            level: 2,
        });
        tile.material.visible = true;
        tile.parent = { };
        tile.material.indexOfColorLayer = () => 0;
        tile.material.isColorLayerDownscaled = () => true;
        tile.material.getColorLayerLevelById = () => 1;

        // FIRST PASS: init Node From Parent and get out of the function
        // without any network fetch
        updateLayeredMaterialNodeImagery(context, layer, tile);
        assert.equal(context.scheduler.commands.length, 0);
        // SECOND PASS: Fetch best texture
        updateLayeredMaterialNodeImagery(context, layer, tile);
        assert.equal(context.scheduler.commands.length, 1);
    });

    xit('tile should not request texture with level > layer.zoom.max', () => {
        const tile = new TileMesh(geom, {
            extent: new Extent('EPSG:4326', 0, 0, 0, 0),
            level: 15,
        });
        tile.material.visible = true;
        tile.parent = { };
        // Emulate a situation where tile inherited a level 1 texture
        tile.material.indexOfColorLayer = () => 0;
        tile.material.isColorLayerDownscaled = () => true;
        tile.material.getColorLayerLevelById = () => 1;
        // Since layer is using STRATEGY_MIN_NETWORK_TRAFFIC, we should emit
        // a single command, requesting a texture at layer.options.zoom.max level
        updateLayeredMaterialNodeImagery(context, layer, tile);

        assert.equal(context.scheduler.commands.length, 1);
        assert.equal(
            context.scheduler.commands[0].targetLevel,
            layer.options.zoom.max);
    });
});
