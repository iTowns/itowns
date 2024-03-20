import * as THREE from 'three';
import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import FeatureGeometryLayer from 'Layer/FeatureGeometryLayer';
import FileSource from 'Source/FileSource';
import Fetcher from 'Provider/Fetcher';
import Extent from 'Core/Geographic/Extent';
import Coordinates from 'Core/Geographic/Coordinates';
import OBB from 'Renderer/OBB';
import TileMesh from 'Core/TileMesh';
import sinon from 'sinon';
import Renderer from './bootstrap';

import feature from '../data/filesource/feat_Polygone.geojson';

describe('Layer with Feature process', function () {
    const renderer = new Renderer();
    const placement = { coord: new Coordinates('EPSG:4326', 1.5, 43), range: 300000 };
    const viewer = new GlobeView(renderer.domElement, placement, { renderer });

    let ariege;
    let ariegeNoProj4;
    let tile;
    let context;
    let stubFetcherJson;

    before(function () {
        stubFetcherJson = sinon.stub(Fetcher, 'json')
            .callsFake(() => Promise.resolve(JSON.parse(feature)));

        const source = new FileSource({
            url: 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/09-ariege/departement-09-ariege.geojson',
            crs: 'EPSG:4326',
            format: 'application/json',
        });

        ariege = new FeatureGeometryLayer('ariege', {
            source,
            accurate: true,
            style: {
                fill: {
                    extrusion_height: 5000,
                    color: new THREE.Color(0xffcc00),
                },
            },
            zoom: { min: 7 },
        });

        ariegeNoProj4 = new FeatureGeometryLayer('ariegeNoProj4', {
            source,
            accurate: false,
            style: {
                fill: {
                    extrusion_height: 5000,
                    color: new THREE.Color(0xffcc00),
                },
            },
            zoom: { min: 7 },
        });

        context = {
            camera: viewer.camera,
            engine: viewer.mainLoop.gfxEngine,
            scheduler: viewer.mainLoop.scheduler,
            geometryLayer: ariege,
            view: viewer,
        };

        const extent = new Extent('EPSG:4326', 1.40625, 2.8125, 42.1875, 43.59375);
        const geom = new THREE.BufferGeometry();
        geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
        tile = new TileMesh(geom, new THREE.Material(), viewer.tileLayer, extent, 7);
        tile.parent = {};
    });

    after(function () {
        stubFetcherJson.restore();
    });

    it('add layer', function (done) {
        viewer.addLayer(ariege)
            .then((layer) => {
                assert.ok(layer);
                done();
            }).catch(done);
    });

    it('update', function (done) {
        ariege.whenReady
            .then(() => {
                tile.visible = true;
                ariege.update(context, ariege, tile)
                    .then(() => {
                        assert.equal(ariege.object3d.children.length, 1);
                        done();
                    });
            }).catch(done);
    });

    it('add layer no proj4', function (done) {
        viewer.addLayer(ariegeNoProj4)
            .then((layer) => {
                assert.ok(layer);
                done();
            }).catch(done);
    });

    it('update no proj4', function (done) {
        ariegeNoProj4.whenReady
            .then(() => {
                tile.visible = true;
                context.layer = ariegeNoProj4;
                ariegeNoProj4.update(context, ariegeNoProj4, tile)
                    .then(() => {
                        assert.equal(ariegeNoProj4.object3d.children.length, 1);
                        done();
                    });
            }).catch(done);
    });

    it('parsing error without proj4 should be inferior to 1e-5 meter', function (done) {
        Promise.all([ariegeNoProj4.whenReady, ariege.whenReady])
            .then(() => {
                const meshNoProj4 = ariegeNoProj4.object3d.children[0].meshes.children[0];
                const mesh = ariege.object3d.children[0].meshes.children[0];
                const array = mesh.geometry.attributes.position.array;
                const arrayNoProj4 = meshNoProj4.geometry.attributes.position.array;
                const vMeshNoProj4 = new THREE.Vector3();
                const v = new THREE.Vector3();
                let error = 0;
                for (let i = array.length / 3 - 1; i >= 0; i--) {
                    vMeshNoProj4.fromArray(arrayNoProj4).applyMatrix4(meshNoProj4.matrixWorld);
                    v.fromArray(array).applyMatrix4(mesh.matrixWorld);
                    error += v.distanceTo(vMeshNoProj4);
                }

                error /= (array.length / 3);

                assert.ok(error < 1e-5);
                done();
            }).catch(done);
    });
});

