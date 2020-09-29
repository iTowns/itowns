import * as THREE from 'three';
import assert from 'assert';
import TileMesh from 'Core/TileMesh';
import Extent from 'Core/Geographic/Extent';
import OBB from 'Renderer/OBB';
import Layer from 'Layer/Layer';
import Source from 'Source/Source';
import { STRATEGY_DICHOTOMY, STRATEGY_PROGRESSIVE, STRATEGY_GROUP, chooseNextLevelToFetch } from 'Layer/LayerUpdateStrategy';
import LayerUpdateState from 'Layer/LayerUpdateState';
import MaterialLayer from 'Renderer/MaterialLayer';

describe('Handling no data source error', function () {
    // Misc var to initialize a TileMesh instance
    const geom = new THREE.Geometry();
    geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));

    const extent = new Extent('EPSG:4326', 6.227531433105469, 6.227874755859375, 44.93614196777344, 44.936485290527344);
    extent.zoom = 19;
    const material = {};

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
        info: { update: () => {} },
        tileMatrixSets: [
            'TMS:4326',
            'TMS:3857',
        ],
        parent: { tileMatrixSets: [
            'TMS:4326',
            'TMS:3857',
        ],
        },
    });

    const nodeLayer = new MaterialLayer(material, layer);
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
        maxLevelWithoutError = 15;
        while (!LOADED) {
            const targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node, 20, nodeLayer.level, layer, failureParams);
            loadLevel(targetLevel, nodeLayer.level);
        }
        assert.equal(nodeLayer.level, maxLevelWithoutError);
    });

    it('STRATEGY_MIN_NETWORK_TRAFFIC 19', () => {
        maxLevelWithoutError = 19;
        while (!LOADED) {
            const targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node, 20, nodeLayer.level, layer, failureParams);
            loadLevel(targetLevel, nodeLayer.level);
        }
        assert.equal(nodeLayer.level, maxLevelWithoutError);
    });

    it('STRATEGY_DICHOTOMY', () => {
        layer.updateStrategy.type = STRATEGY_DICHOTOMY;
        while (!LOADED) {
            const targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node, 20, nodeLayer.level, layer, failureParams);
            loadLevel(targetLevel, nodeLayer.level);
        }
        assert.equal(nodeLayer.level, maxLevelWithoutError);
    });

    it('STRATEGY_PROGRESSIVE', () => {
        layer.updateStrategy.type = STRATEGY_PROGRESSIVE;
        while (!LOADED) {
            const targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node, 20, nodeLayer.level, layer, failureParams);
            loadLevel(targetLevel, nodeLayer.level);
        }
        assert.equal(nodeLayer.level, maxLevelWithoutError);
    });

    it('STRATEGY_GROUP', () => {
        layer.updateStrategy.type = STRATEGY_GROUP;
        layer.updateStrategy.options = { groups: [10, 15, 20] };
        while (!LOADED) {
            const targetLevel = chooseNextLevelToFetch(layer.updateStrategy.type, node, 20, nodeLayer.level, layer, failureParams);
            loadLevel(targetLevel, nodeLayer.level);
        }
        assert.equal(nodeLayer.level, 15);
    });
});
