import * as THREE from 'three';
import proj4 from 'proj4';
import assert from 'assert';
import GeoJsonParser from 'Parser/GeoJsonParser';
import Feature2Mesh from 'Converter/Feature2Mesh';

import geojson from '../data/geojson/holes.geojson';
import geojson2 from '../data/geojson/simple.geojson';
import geojson3 from '../data/geojson/points.geojson';

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
});
