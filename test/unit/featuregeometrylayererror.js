import * as THREE from 'three';
import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import FeatureGeometryLayer from 'Layer/FeatureGeometryLayer';
import FileSource from 'Source/FileSource';
import Extent from 'Core/Geographic/Extent';
import Coordinates from 'Core/Geographic/Coordinates';
import OBB from 'Renderer/OBB';
import TileMesh from 'Core/TileMesh';
import Renderer from './bootstrap';

import geojson_big from '../data/geojson/map_big.geojson';
import geojson_a from '../data/geojson/map.geojson';
import geojson_small from '../data/geojson/map_small.geojson';

const files = [geojson_small, geojson_a, geojson_big];
const errors = [3e-4, 5e-2, 35];
const sizes = [70, 600, 20000];

files.forEach((geojson, i) => {
    describe(`Feature2Mesh, difference between proj4 and without proj4, for ${sizes[i]} meters extent dimension `, function () {
        const renderer = new Renderer();
        const max_error = errors[i];

        const placement = { coord: new Coordinates('EPSG:4326', 4.2, 48.2), range: 2000 };
        const viewer = new GlobeView(renderer.domElement, placement, { renderer });

        const source = new FileSource({
            fetchedData: geojson,
            crs: 'EPSG:4326',
            format: 'application/json',
        });

        const source2 = new FileSource(source);

        const layerProj4 = new FeatureGeometryLayer('proj4', {
            source,
            accurate: true,
            zoom: { min: 9 },
        });

        const layerNoProj4 = new FeatureGeometryLayer('layerNoProj4', {
            source: source2,
            accurate: false,
            zoom: { min: 9 },
        });

        const context = {
            camera: viewer.camera,
            engine: viewer.mainLoop.gfxEngine,
            scheduler: viewer.mainLoop.scheduler,
            geometryLayer: layerProj4,
            view: viewer,
        };

        const extent = new Extent('EPSG:4326', 4.1, 4.3, 48.1, 48.3);
        const geom = new THREE.BufferGeometry();
        geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
        const tile = new TileMesh(geom, new THREE.Material(), viewer.tileLayer, extent, 9);
        tile.parent = {};

        viewer.addLayer(layerProj4);
        viewer.addLayer(layerNoProj4);

        it('update proj4', function (done) {
            layerProj4.whenReady
                .then(() => {
                    tile.visible = true;
                    return layerProj4.update(context, layerProj4, tile);
                })
                .then(() => {
                    assert.equal(layerProj4.object3d.children.length, 1);
                    done();
                }).catch(done);
        });

        it('update without proj4', function (done) {
            layerNoProj4.whenReady
                .then(() => {
                    tile.visible = true;
                    return layerNoProj4.update(context, layerNoProj4, tile);
                })
                .then(() => {
                    assert.equal(layerNoProj4.object3d.children.length, 1);
                    done();
                }).catch(done);
        });

        it(`parsing error without proj4 should be inferior to ${max_error} meter`, function (done) {
            Promise.all([layerNoProj4.whenReady, layerProj4.whenReady])
                .then(() => {
                    const meshNoProj4 = layerNoProj4.object3d.children[0].meshes.children[0];
                    const mesh = layerProj4.object3d.children[0].meshes.children[0];
                    const array = mesh.geometry.attributes.position.array;
                    const arrayNoProj4 = meshNoProj4.geometry.attributes.position.array;
                    const vectorNoProj4 = new THREE.Vector3();
                    const vectorProj4 = new THREE.Vector3();
                    let error = 0;

                    for (let i = array.length - 3; i >= 0; i -= 3) {
                        // transform proj4 vertex to final projection
                        vectorProj4.fromArray(array, i);
                        vectorProj4.applyMatrix4(mesh.matrixWorld);

                        // transform proj4 vertex to final projection
                        vectorNoProj4.fromArray(arrayNoProj4, i);
                        vectorNoProj4.applyMatrix4(meshNoProj4.matrixWorld);

                        // compute diff between proj4 vertex and no proj4 vertex
                        const distance = vectorProj4.distanceTo(vectorNoProj4);
                        error += distance;
                    }

                    error /= (array.length / 3);

                    assert.ok(error < max_error, `error (${error}) sup. to ${max_error}`);
                    done();
                }).catch(done);
        });
    });
});
