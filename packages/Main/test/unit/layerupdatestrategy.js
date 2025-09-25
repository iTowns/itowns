import * as THREE from 'three';
import assert from 'assert';
import TileMesh from 'Core/TileMesh';
import { Extent } from '@itowns/geographic';
import OBB from 'Renderer/OBB';
import Layer from 'Layer/Layer';
import Source from 'Source/Source';
import {
    STRATEGY_MIN_NETWORK_TRAFFIC,
    STRATEGY_DICHOTOMY,
    STRATEGY_PROGRESSIVE,
    STRATEGY_GROUP,
    chooseNextLevelToFetch,
} from 'Layer/LayerUpdateStrategy';
import LayerUpdateState from 'Layer/LayerUpdateState';
import { RasterColorTile } from 'Renderer/RasterTile';
import { LayeredMaterial } from 'Renderer/LayeredMaterial';

describe('Handling no data source error', function () {
    // Misc var to initialize a TileMesh instance
    const geom = new THREE.BufferGeometry();
    geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));

    const extent = new Extent('EPSG:4326', 6.227531433105469, 6.227874755859375, 44.93614196777344, 44.936485290527344);
    extent.zoom = 19;
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
                return new Promise(() => { /* no-op */ });
            },
        },
    };

    const source = new Source({
        url: 'http://',
        crs: 'EPSG:4326',
        extent,
    });
    source.zoom = { max: 20, min: 0 };

    const layer = new Layer('foo', {
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

    const nodeLayer = new RasterColorTile(layer);
    nodeLayer.level = 10;

    const node = new TileMesh(geom, material, layer, extent, 19);
    node.layerUpdateState[layer.id] = new LayerUpdateState();
    const state = node.layerUpdateState[layer.id];
    state.lowestLevelError = layer.source.zoom.max;
    const failureParams = state.failureParams;
    const history = [];
    let LOADED = false;
    let maxLevelWithoutError = 13;

    function loadLevel(level, currentLevel) {
        if (level <= maxLevelWithoutError) {
            if (level == currentLevel && !LOADED) {
                LOADED = true;
            }
            nodeLayer.level = level;
            history.push({ level });
        } else {
            state.noData({ targetLevel: level });
            history.push({ error: level });
        }
    }

    beforeEach('reset', () => {
        failureParams.lowestLevelError = Infinity;
        nodeLayer.level = 10;
        history.length = 0;
        LOADED = false;
    });

    it('STRATEGY_MIN_NETWORK_TRAFFIC 15', () => {
        layer.updateStrategy = {
            type: STRATEGY_MIN_NETWORK_TRAFFIC,
        };
        maxLevelWithoutError = 15;
        while (!LOADED) {
            const targetLevel = chooseNextLevelToFetch(layer.updateStrategy, 20, nodeLayer.level, failureParams, source.zoom);
            loadLevel(targetLevel, nodeLayer.level);
        }
        assert.equal(nodeLayer.level, maxLevelWithoutError);
    });

    it('STRATEGY_MIN_NETWORK_TRAFFIC 19', () => {
        layer.updateStrategy = {
            type: STRATEGY_MIN_NETWORK_TRAFFIC,
        };
        maxLevelWithoutError = 19;
        while (!LOADED) {
            const targetLevel = chooseNextLevelToFetch(layer.updateStrategy, 20, nodeLayer.level, failureParams, source.zoom);
            loadLevel(targetLevel, nodeLayer.level);
        }
        assert.equal(nodeLayer.level, maxLevelWithoutError);
    });

    it('STRATEGY_DICHOTOMY', () => {
        layer.updateStrategy = {
            type: STRATEGY_DICHOTOMY,
            options: {/* zoom: { min : number } */},
        };
        while (!LOADED) {
            const targetLevel = chooseNextLevelToFetch(layer.updateStrategy, 20, nodeLayer.level, failureParams, source.zoom);
            loadLevel(targetLevel, nodeLayer.level);
        }
        assert.equal(nodeLayer.level, maxLevelWithoutError);
    });

    it('STRATEGY_PROGRESSIVE', () => {
        layer.updateStrategy = {
            type: STRATEGY_PROGRESSIVE,
            options: {/* increment: number */},
        };
        while (!LOADED) {
            const targetLevel = chooseNextLevelToFetch(layer.updateStrategy, 20, nodeLayer.level, failureParams, source.zoom);
            loadLevel(targetLevel, nodeLayer.level);
        }
        assert.equal(nodeLayer.level, maxLevelWithoutError);
    });

    it('STRATEGY_GROUP', () => {
        layer.updateStrategy = {
            type: STRATEGY_GROUP,
            options: { groups: [10, 15, 20] },
        };
        while (!LOADED) {
            const targetLevel = chooseNextLevelToFetch(layer.updateStrategy, 20, nodeLayer.level, failureParams, source.zoom);
            loadLevel(targetLevel, nodeLayer.level);
        }
        assert.equal(nodeLayer.level, 15);
    });
});
