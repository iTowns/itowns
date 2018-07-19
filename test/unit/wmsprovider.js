import { chooseExtentToDownload } from '../../src/Provider/WMSProvider';
import Extent from '../../src/Core/Geographic/Extent';
import { STRATEGY_MIN_NETWORK_TRAFFIC, STRATEGY_PROGRESSIVE, STRATEGY_DICHOTOMY } from '../../src/Core/Layer/LayerUpdateStrategy';

/* global describe, it */

const assert = require('assert');

describe('verify wms strategies implementation', function () {
    const extent = new Extent('EPSG:4978', {
        west: 0,
        east: 0.1,
        south: -0.1,
        north: 0,
    });
    const currentExtent = new Extent('EPSG:4978', {
        west: 0,
        east: 5,
        south: -5,
        north: 0,
    });
    const layer = {
        updateStrategy: {
            type: -1,
        },
        extent: new Extent('EPSG:4978', {
            west: -10,
            east: 10,
            south: -10,
            north: 10,
        }),
    };

    it('STRATEGY_MIN_NETWORK_TRAFFIC should return directly node\'s extent', () => {
        layer.updateStrategy.type = STRATEGY_MIN_NETWORK_TRAFFIC;

        const result = chooseExtentToDownload(layer, extent, currentExtent);

        assert.equal(result.west(), extent.west(), 'Incorrect west value');
        assert.equal(result.east(), extent.east(), 'Incorrect east value');
        assert.equal(result.north(), extent.north(), 'Incorrect north value');
        assert.equal(result.south(), extent.south(), 'Incorrect south value');
    });

    it('STRATEGY_PROGRESSIVE should download the next tile in the quadtree', () => {
        layer.updateStrategy.type = STRATEGY_PROGRESSIVE;

        const result = chooseExtentToDownload(layer, extent, currentExtent);

        assert.equal(result.west(), 0, 'Incorrect west value');
        assert.equal(result.east(), 2.5, 'Incorrect east value');
        assert.equal(result.north(), 0, 'Incorrect north value');
        assert.equal(result.south(), -2.5, 'Incorrect south value');
    });

    it('STRATEGY_DICHOTOMY', () => {
        layer.updateStrategy.type = STRATEGY_DICHOTOMY;

        const result = chooseExtentToDownload(layer, extent, currentExtent);

        assert.equal(result.west(), 0, 'Incorrect west value');
        assert.equal(result.east(), 0.625, 'Incorrect east value');
        assert.equal(result.north(), 0, 'Incorrect north value');
        assert.equal(result.south(), -0.625, 'Incorrect south value');
    });
});
