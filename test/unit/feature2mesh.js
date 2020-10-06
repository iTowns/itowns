import * as THREE from 'three';
import proj4 from 'proj4';
import assert from 'assert';
import GeoJsonParser from 'Parser/GeoJsonParser';
import Feature2Mesh from 'Converter/Feature2Mesh';

const geojson = require('../data/geojson/holes.geojson.json');
const geojson2 = require('../data/geojson/simple.geojson.json');

proj4.defs('EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

function computeAreaOfMesh(mesh) {
    // Sum each triangle area
    let area = 0;
    for (let i = 0; i < mesh.geometry.index.array.length; i += 3) {
        const contour = [];
        for (let j = 0; j < 3; j++) {
            const index = mesh.geometry.index.array[i + j];
            contour.push(
                new THREE.Vector3().fromArray(
                    mesh.geometry.attributes.position.array, 3 * index));
        }
        area += THREE.ShapeUtils.area(contour);
    }
    return area;
}

describe('Feature2Mesh', function () {
    const parsed = GeoJsonParser.parse(geojson, { in: { crs: 'EPSG:3946' }, out: { crs: 'EPSG:3946', buildExtent: true, mergeFeatures: false } });
    const parsed2 = GeoJsonParser.parse(geojson2, { in: { crs: 'EPSG:3946' }, out: { crs: 'EPSG:3946', buildExtent: true, mergeFeatures: false } });

    it('rect mesh area should match geometry extent', () =>
        parsed.then((collection) => {
            const mesh = Feature2Mesh.convert()(collection);
            const extentSize = collection.extent.dimensions();

            assert.equal(
                extentSize.x * extentSize.y,
                computeAreaOfMesh(mesh.children[0]));
        }));

    it('square mesh area should match geometry extent minus holes', () =>
        parsed.then((collection) => {
            const mesh = Feature2Mesh.convert()(collection);

            const noHoleArea = computeAreaOfMesh(mesh.children[0]);
            const holeArea = computeAreaOfMesh(mesh.children[1]);
            const meshWithHoleArea = computeAreaOfMesh(mesh.children[2]);

            assert.equal(
                noHoleArea - holeArea,
                meshWithHoleArea);
        }));

    it('convert points, lines and mesh', () =>
        parsed2.then((collection) => {
            const mesh = Feature2Mesh.convert()(collection);
            assert.equal(mesh.children[0].type, 'Points');
            assert.equal(mesh.children[1].type, 'Line');
            assert.equal(mesh.children[2].type, 'Mesh');
        }));
});
