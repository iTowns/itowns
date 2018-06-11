import * as THREE from 'three';
import proj4 from 'proj4';
import GeoJsonParser from '../src/Parser/GeoJsonParser';
import Feature2Mesh from '../src/Renderer/ThreeExtended/Feature2Mesh';
/* global describe, it */

const assert = require('assert');
const geojson = require('./data/geojson/holes.geojson.json');

proj4.defs('EPSG:3946',
    '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

function parse() {
    return GeoJsonParser.parse(geojson, { crsIn: 'EPSG:3946', crsOut: 'EPSG:3946', buildExtent: true });
}

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
    it('rect mesh area should match geometry extent', () =>
        parse().then((feature) => {
            const mesh = Feature2Mesh.convert()(feature[0]);
            const extentSize = feature[0].geometry.extent.dimensions();

            assert.equal(
                extentSize.x * extentSize.y,
                computeAreaOfMesh(mesh));
        }));

    it('square mesh area should match geometry extent minus holes', () =>
        parse().then((feature) => {
            const noHole = Feature2Mesh.convert()(feature[0]);
            const hole = Feature2Mesh.convert()(feature[1]);
            const meshWithHole = Feature2Mesh.convert()(feature[2]);

            const noHoleArea = computeAreaOfMesh(noHole);
            const holeArea = computeAreaOfMesh(hole);
            const meshWithHoleArea = computeAreaOfMesh(meshWithHole);

            assert.equal(
                noHoleArea - holeArea,
                meshWithHoleArea);
        }));

    it('square polygon should have double the vertices for being extruded', () =>
        parse().then((feature) => {
            const noExtrude = Feature2Mesh.convert()(feature[0]);
            const extrude = Feature2Mesh.convert({
                extrude: 2,
            })(feature[0]);

            assert.equal(noExtrude.geometry.attributes.position.count, 4);
            assert.equal(extrude.geometry.attributes.position.count, 8);

            // 2 triangles -> 6 indexes
            assert.equal(noExtrude.geometry.index.count, 6);
            // 2 triangles * 6 faces - bottom -> 30 indexes
            assert.equal(extrude.geometry.index.count, 30);
        }));
});
