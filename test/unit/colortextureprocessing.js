import * as THREE from 'three';
import ColorTextureProcessing from '../../src/Process/ColorTextureProcessing';
import TileMesh from '../../src/Core/TileMesh';
import Extent from '../../src/Core/Geographic/Extent';
import OBB from '../../src/Renderer/ThreeExtended/OBB';
import LayeredMaterial from '../../src/Renderer/LayeredMaterial';
import { STRATEGY_MIN_NETWORK_TRAFFIC } from '../../src/Core/Layer/LayerUpdateStrategy';
/* global describe, it, beforeEach */

const assert = require('assert');

describe('ColorTextureProcessing.updateLayerElement', function () {
    // Misc var to initialize a TileMesh instance
    const geom = new THREE.Geometry();
    geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));

    const extent = new Extent('EPSG:4326', 0, 2, 0, 2);

    const layer = {
        id: 'foo',
        protocol: 'dummy',
        extent,
        type: 'color',
    };

    // Mock scheduler
    const context = {
        view: {
            notifyChange: () => true,
            getLayers: () => [layer],
        },
        scheduler: {
            commands: [],
            execute: (cmd) => {
                context.scheduler.commands.push(cmd);
                return new Promise(() => { /* no-op */ });
            },
        },
    };

    const layerGeom = {
        id: 'foo',
        protocol: 'dummy',
        extent: new Extent('EPSG:4326', 0, 0, 0, 0),
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
        const tile = new TileMesh(
            layerGeom,
            geom,
            new LayeredMaterial(),
            new Extent('EPSG:4326', 0, 0, 0, 0));
        tile.material.visible = false;
        tile.material.indexOfColorLayer = () => 0;
        ColorTextureProcessing.updateLayerElement(context, layer, tile);
        assert.equal(context.scheduler.commands.length, 0);
    });

    it('tile with best texture should not execute commands', () => {
        const tile = new TileMesh(
            layerGeom,
            geom,
            new LayeredMaterial(),
            new Extent('EPSG:4326', 0, 0, 0, 0));
        tile.material.visible = true;
        layer.canTextureBeImproved = () => false;
        ColorTextureProcessing.updateLayerElement(context, layer, tile);

        assert.equal(context.scheduler.commands.length, 0);
    });

    it('tile with downscaled texture should execute 1 command', () => {
        const tile = new TileMesh(
            layerGeom,
            geom,
            new LayeredMaterial(),
            new Extent('EPSG:4326', 0, 0, 0, 0),
            2);
        tile.material.visible = true;

        tile.parent = {
            material: {
                // eslint-disable-next-line arrow-body-style
                getLayerTextures: () => {
                    return [{ extent }];
                },
            },
        };
        layer.canTextureBeImproved = () => true;

        // FIRST PASS: init Node From Parent and get out of the function
        // without any network fetch
        ColorTextureProcessing.updateLayerElement(context, layer, tile, tile.parent);
        assert.equal(context.scheduler.commands.length, 0);
        // SECOND PASS: Fetch best texture
        ColorTextureProcessing.updateLayerElement(context, layer, tile, tile.parent);
        assert.equal(context.scheduler.commands.length, 1);
    });
});
