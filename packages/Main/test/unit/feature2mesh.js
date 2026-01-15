import * as THREE from 'three';
import { CRS } from '@itowns/geographic';
import assert from 'assert';
import GeoJsonParser from 'Parser/GeoJsonParser';
import Feature2Mesh from 'Converter/Feature2Mesh';
import Style from 'Core/Style';

import geojson from '../data/geojson/holes.geojson';
import geojson2 from '../data/geojson/simple.geojson';
import geojson3 from '../data/geojson/points.geojson';

CRS.defs('EPSG:3946',
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
function makeTree() {
    const trunkRadius = 5;
    const trunkHeight = 20;
    const topHeight = 10;
    const root = new THREE.Object3D();

    // Trunk
    const geometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius, trunkHeight, 32);
    const material = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(geometry, material);
    trunk.rotateX(Math.PI / 2);
    trunk.position.z = 10;
    trunk.updateMatrix();
    root.add(trunk);

    // Canopy
    const geometryCanop = new THREE.SphereGeometry(topHeight, topHeight, 10);
    const materialCanop = new THREE.MeshPhongMaterial({ color: 0x00aa00 });
    const top = new THREE.Mesh(geometryCanop, materialCanop);
    top.position.z = trunkHeight - (topHeight / 3) + 10;
    top.updateMatrix();
    root.add(top);

    return root;
}
describe('Feature2Mesh', function () {
    const parsed = GeoJsonParser.parse(geojson, { in: { crs: 'EPSG:3946' }, out: { crs: 'EPSG:3946', buildExtent: true, mergeFeatures: false, structure: '3d' } });
    const parsed2 = GeoJsonParser.parse(geojson2, { in: { crs: 'EPSG:3946' }, out: { crs: 'EPSG:3946', buildExtent: true, mergeFeatures: false, structure: '3d' } });
    const parsed3 = GeoJsonParser.parse(geojson3, { in: { crs: 'EPSG:3946' }, out: { crs: 'EPSG:3946', buildExtent: true, mergeFeatures: false, structure: '3d' } });

    it('rect mesh area should match geometry extent', function (done) {
        parsed
            .then((collection) => {
                const mesh = Feature2Mesh.convert()(collection).meshes;
                const extentSize = collection.extent.planarDimensions();

                assert.equal(
                    extentSize.x * extentSize.y,
                    computeAreaOfMesh(mesh.children[0]));
                done();
            }).catch(done);
    });

    it('square mesh area should match geometry extent minus holes', function (done) {
        parsed
            .then((collection) => {
                const mesh = Feature2Mesh.convert()(collection).meshes;

                const noHoleArea = computeAreaOfMesh(mesh.children[0]);
                const holeArea = computeAreaOfMesh(mesh.children[1]);
                const meshWithHoleArea = computeAreaOfMesh(mesh.children[2]);

                assert.equal(
                    noHoleArea - holeArea, meshWithHoleArea,
                );
                done();
            }).catch(done);
    });

    it('convert points, lines and mesh', function (done) {
        parsed2
            .then((collection) => {
                const mesh = Feature2Mesh.convert()(collection).meshes;
                assert.equal(mesh.children[0].type, 'Points');
                assert.equal(mesh.children[1].type, 'LineSegments');
                assert.equal(mesh.children[2].type, 'Mesh');
                done();
            }).catch(done);
    });

    it('convert to instanced meshes', function (done) {
        const styleModel3D = {
            point: {
                model: { object: makeTree() },
            },
        };
        parsed3
            .then((collection) => {
                const mesh = Feature2Mesh.convert({ style: styleModel3D })(collection).meshes;

                let isInstancedMesh = false;
                mesh.traverse((obj) => {
                    if (obj.isInstancedMesh) {
                        isInstancedMesh = true;
                        return null;
                    }
                },
                );
                assert.ok(isInstancedMesh);
                assert.equal(mesh.children.length, 3);
                done();
            }).catch(done);
    });

    it('update polygon color and altitude', function (done) {
        parsed
            .then((collection) => {
                const layer = {
                    style: new Style(),
                    convert: Feature2Mesh.convert(),
                };
                const featureNode = layer.convert.call(layer, collection);
                const featureMesh = featureNode.meshes.children[0];

                const colorAttr = featureMesh.geometry.getAttribute('color');
                const posAttr = featureMesh.geometry.getAttribute('position');
                const initialColorVersion = colorAttr.version;
                const initialPosVersion = posAttr.version;

                layer.style.fill.color = 'red';
                layer.style.fill.base_altitude = 100;
                Feature2Mesh.updateStyle(featureMesh, featureNode.collection, layer.style);

                assert.equal(colorAttr.array[0], 255);
                assert.equal(colorAttr.array[1], 0);
                assert.equal(colorAttr.array[2], 0);
                assert.equal(posAttr.array[2], 100);
                assert.ok(colorAttr.version > initialColorVersion);
                assert.ok(posAttr.version > initialPosVersion);
                done();
            }).catch(done);
    });

    it('update extruded polygon', function (done) {
        parsed
            .then((collection) => {
                const layer = {
                    style: new Style({
                        fill: { extrusion_height: 50 },
                    }),
                    convert: Feature2Mesh.convert(),
                };
                const featureNode = layer.convert.call(layer, collection);
                const featureMesh = featureNode.meshes.children[0];

                const colorAttr = featureMesh.geometry.getAttribute('color');
                const posAttr = featureMesh.geometry.getAttribute('position');
                const initialColorVersion = colorAttr.version;
                const initialPosVersion = posAttr.version;

                const vertexCount = posAttr.count;
                const halfCount = vertexCount / 2;
                const topZ = posAttr.array[halfCount * 3 + 2];

                layer.style.fill.extrusion_height = 150;
                Feature2Mesh.updateStyle(featureMesh, featureNode.collection, layer.style);

                const updatedTopZ = posAttr.array[halfCount * 3 + 2];
                assert.equal(updatedTopZ - topZ, 100);
                assert.ok(posAttr.version > initialPosVersion);
                assert.equal(colorAttr.version, initialColorVersion);
                done();
            }).catch(done);
    });

    it('update point and line features', function (done) {
        parsed2
            .then((collection) => {
                const layer = {
                    style: new Style(),
                    convert: Feature2Mesh.convert(),
                };
                const featureNode = layer.convert.call(layer, collection);

                const pointMesh = featureNode.meshes.children[0];
                const lineMesh = featureNode.meshes.children[1];

                const pointColorAttr = pointMesh.geometry.getAttribute('color');
                const lineColorAttr = lineMesh.geometry.getAttribute('color');
                const pointPosAttr = pointMesh.geometry.getAttribute('position');
                const linePosAttr = lineMesh.geometry.getAttribute('position');

                const initialPointColorVersion = pointColorAttr.version;
                const initialPointPosVersion = pointPosAttr.version;
                const initialLineColorVersion = lineColorAttr.version;
                const initialLinePosVersion = linePosAttr.version;

                layer.style.point.color = 'lime'; // not 'green'
                layer.style.point.base_altitude = 50;
                Feature2Mesh.updateStyle(pointMesh, featureNode.collection, layer.style);

                layer.style.stroke.color = 'blue';
                layer.style.stroke.base_altitude = 75;
                Feature2Mesh.updateStyle(lineMesh, featureNode.collection, layer.style);

                assert.equal(pointColorAttr.array[0], 0);
                assert.equal(pointColorAttr.array[1], 255);
                assert.equal(pointColorAttr.array[2], 0);
                assert.equal(pointPosAttr.array[2], 50);
                assert.ok(pointColorAttr.version > initialPointColorVersion);
                assert.ok(pointPosAttr.version > initialPointPosVersion);

                assert.equal(lineColorAttr.array[0], 0);
                assert.equal(lineColorAttr.array[1], 0);
                assert.equal(lineColorAttr.array[2], 255);
                assert.equal(linePosAttr.array[2], 75);
                assert.ok(lineColorAttr.version > initialLineColorVersion);
                assert.ok(linePosAttr.version > initialLinePosVersion);
                done();
            }).catch(done);
    });
});
