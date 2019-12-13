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
import Renderer from './mock';

const renderer = new Renderer();

const placement = { coord: new Coordinates('EPSG:4326', 1.5, 43), range: 300000 };
const viewer = new GlobeView(renderer.domElement, placement, { renderer });

function extrude() {
    return 5000;
}

function color() {
    return new THREE.Color(0xffcc00);
}


const ariege = new GeometryLayer('ariege', new THREE.Group());
ariege.update = FeatureProcessing.update;
ariege.convert = Feature2Mesh.convert({
    color,
    extrude,
});

ariege.source = new FileSource({
    url: 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/09-ariege/departement-09-ariege.geojson',
    projection: 'EPSG:4326',
    format: 'application/json',
    zoom: { min: 0, max: 0 },
    // extent: new Extent('EPSG:4326', -90, -10, -900, 900),
});

ariege.source.zoom = 0;

if (process.env.HTTPS_PROXY) {
    ariege.source.networkOptions = { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) };
}

const context = {
    camera: viewer.camera,
    engine: viewer.mainLoop.gfxEngine,
    scheduler: viewer.mainLoop.scheduler,
    geometryLayer: ariege,
    view: viewer,
};

const extent = new Extent('EPSG:4326', 1.40625, 2.8125, 42.1875, 42.1875);
const geom = new THREE.Geometry();
geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
const tile = new TileMesh(geom, new THREE.Material(), viewer.tileLayer, extent, 7);
tile.parent = {};

describe('Layer with Feature process', function () {
    it('add layer', function (done) {
        viewer.addLayer(ariege).then((layer) => {
            assert.ok(layer);
            done();
        });
    });
    it('update', function (done) {
        viewer.tileLayer.whenReady.then(() => {
            tile.visible = true;
            ariege.update(context, ariege, tile).then(() => {
                // Hack to force add Mesh to tile
                // Feature Processing needs refactoring to simplify it.
                tile.layerUpdateState[ariege.id] = undefined;
                ariege.source.parsedData.extent.crs = 'EPSG:4326';
                ariege.source.parsedData.extent.set(0, 10, 40, 50);
                ariege.update(context, ariege, tile).then(() => {
                    assert.equal(tile.children.length, 1);
                    done();
                });
            });
        });
    });
});

