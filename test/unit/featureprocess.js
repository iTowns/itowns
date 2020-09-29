import * as THREE from 'three';
import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import FeatureProcessing from 'Process/FeatureProcessing';
import Feature2Mesh from 'Converter/Feature2Mesh';
import GeometryLayer from 'Layer/GeometryLayer';
import FileSource from 'Source/FileSource';
import HttpsProxyAgent from 'https-proxy-agent';
import Extent from 'Core/Geographic/Extent';
import Coordinates from 'Core/Geographic/Coordinates';
import OBB from 'Renderer/OBB';
import TileMesh from 'Core/TileMesh';
import Renderer from './bootstrap';

describe('Layer with Feature process', function () {
    const renderer = new Renderer();

    const placement = { coord: new Coordinates('EPSG:4326', 1.5, 43), range: 300000 };
    const viewer = new GlobeView(renderer.domElement, placement, { renderer });

    function extrude() {
        return 5000;
    }

    function color() {
        return new THREE.Color(0xffcc00);
    }

    const source = new FileSource({
        url: 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/09-ariege/departement-09-ariege.geojson',
        crs: 'EPSG:4326',
        format: 'application/json',
        networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {},
    });

    const ariege = new GeometryLayer('ariege', new THREE.Group(), { source, zoom: { min: 7 } });

    ariege.update = FeatureProcessing.update;
    ariege.convert = Feature2Mesh.convert({
        color,
        extrude,
    });

    const context = {
        camera: viewer.camera,
        engine: viewer.mainLoop.gfxEngine,
        scheduler: viewer.mainLoop.scheduler,
        geometryLayer: ariege,
        view: viewer,
    };

    const extent = new Extent('EPSG:4326', 1.40625, 2.8125, 42.1875, 43.59375);
    const geom = new THREE.Geometry();
    geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
    const tile = new TileMesh(geom, new THREE.Material(), viewer.tileLayer, extent, 7);
    tile.parent = {};

    it('add layer', function (done) {
        viewer.addLayer(ariege).then((layer) => {
            assert.ok(layer);
            done();
        });
    });
    it('update', function (done) {
        ariege.whenReady.then(() => {
            tile.visible = true;
            ariege.update(context, ariege, tile)
                .then(() => {
                    assert.equal(tile.children.length, 1);
                    done();
                });
        });
    });
});

