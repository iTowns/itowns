import assert from 'assert';
import ColorLayer from 'Layer/ColorLayer';
import GlobeView from 'Core/Prefab/GlobeView';
import FileSource from 'Source/FileSource';
import Coordinates from 'Core/Geographic/Coordinates';
import HttpsProxyAgent from 'https-proxy-agent';
import Renderer from './bootstrap';

describe('ColorLayer', function () {
    const renderer = new Renderer();
    const placement = { coord: new Coordinates('EPSG:4326', 1.5, 43), range: 300000 };
    const viewer = new GlobeView(renderer.domElement, placement, { renderer });

    const source = new FileSource({
        url: 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/09-ariege/departement-09-ariege.geojson',
        crs: 'EPSG:4326',
        format: 'application/json',
        networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
    });

    const ariege = new ColorLayer('ariege', {
        transparent: true,
        style: {
            fill: { color: 'blue', opacity: 0.8 },
            stroke: { color: 'black', width: 1.0 },
        },
        source,
        zoom: { min: 11 },
    });
    viewer.addLayer(ariege);

    it('invalidate cache', function () {
        ariege.invalidateCache();
        assert.equal(ariege.parent.level0Nodes[0].redraw, true);
        assert.equal(ariege.parent.level0Nodes[0].layerUpdateState[ariege.id], undefined);
    });
});
