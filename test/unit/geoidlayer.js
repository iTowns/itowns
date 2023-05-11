import * as THREE from 'three';
import assert from 'assert';
import GeoidLayer from 'Layer/GeoidLayer';
import FileSource from 'Source/FileSource';
import Coordinates from 'Core/Geographic/Coordinates';
import GlobeView from 'Core/Prefab/GlobeView';
import HttpsProxyAgent from 'https-proxy-agent';
import Extent from 'Core/Geographic/Extent';
import OBB from 'Renderer/OBB';
import TileMesh from 'Core/TileMesh';
import Renderer from './bootstrap';

describe('GlobeView', function () {
    const renderer = new Renderer();
    const placement = { coord: new Coordinates('EPSG:4326', 4.631512, 43.675626), range: 3919 };
    const view = new GlobeView(renderer.domElement, placement, { renderer });
    const url = 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/altitude-conversion-grids/RAF20_float.gtx';


    const geoidSource = new FileSource({
        url,
        crs: 'EPSG:4326',
        format: 'application/gtx',
        networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
    });
    // Specify the type geoid height data are encoded with. See GTXParser documentation at
    // http://www.itowns-project.org/itowns/docs/#api/Parser/GTXParser for more.
    geoidSource.dataType = 'float';

    // Create a Layer to support geoid height data and add it to the view.
    const geoidLayer = new GeoidLayer('geoid', {
        source: geoidSource,
    });

    const context = {};

    const extent = new Extent('EPSG:4326', 4.1, 4.3, 48.1, 48.3);
    const geom = new THREE.BufferGeometry();
    geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
    const tile = new TileMesh(geom, new THREE.Material(), view.tileLayer, extent, 9);
    tile.parent = {};

    it('add geoid layer', function (done) {
        view.addLayer(geoidLayer)
            .then(() => {
                done();
            }, done);
    });

    it('update geoid layer', function (done) {
        geoidLayer.whenReady
            .then(() => {
                geoidLayer.update(context, geoidLayer, tile, {})
                    .then(() => {
                        assert.equal(tile.geoidHeight, 45.72800064087844);
                        done();
                    });
            }, done);
    });
});
