import * as THREE from 'three';
import proj4 from 'proj4';
import assert from 'assert';
import Extent from 'Core/Geographic/Extent';
import PlanarTileBuilder from 'Core/Prefab/Planar/PlanarTileBuilder';
import BuilderEllipsoidTile from 'Core/Prefab/Globe/BuilderEllipsoidTile';
import newTileGeometry from 'Core/Prefab/TileBuilder';
import OBB from 'Renderer/OBB';

describe('OBB', function () {
    const max = new THREE.Vector3(10, 10, 10);
    const min = new THREE.Vector3(-10, -10, -10);
    const lookAt = new THREE.Vector3(1, 0, 0);
    const translate = new THREE.Vector3(0, 0, 20);
    const obb = new OBB(min, max);
    obb.lookAt(lookAt);
    obb.translateX(translate.x);
    obb.translateY(translate.y);
    obb.translateZ(translate.z);
    obb.update();

    it('should correctly instance obb', () => {
        assert.equal(obb.natBox.min.x, min.x);
        assert.equal(obb.natBox.max.x, max.x);
    });

    it('isSphereAboveXYBox should work properly', () => {
        const sphere = new THREE.Sphere(new THREE.Vector3(23, 0, 0), 5);
        assert.equal(obb.isSphereAboveXYBox(sphere), true);
    });

    it('updates the scale', () => {
        const o1 = new OBB(min, max);
        o1.z.min = -3;
        o1.z.max = 5;
        o1.updateScaleZ(2);
        assert.equal(o1.z.min, -3);
        assert.equal(o1.z.max, 5);
        assert.equal(o1.z.scale, 2);
        assert.equal(o1.z.delta, 16);
        assert.equal(o1.box3D.min.z, -16);
        assert.equal(o1.box3D.max.z, 20);
    });
});


// Define crs projection that we will use (taken from https://epsg.io/3946, Proj4js section)
proj4.defs('EPSG:3946', '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
function assertVerticesAreInOBB(builder, extent) {
    const params = {
        extent,
        disableSkirt: true,
        level: 0,
        segment: 1,
    };

    newTileGeometry(builder, params).then((result) => {
        const geom = result.geometry;
        const inverse = new THREE.Matrix4().copy(geom.OBB.matrix).invert();

        let failing = 0;
        const vec = new THREE.Vector3();
        for (let i = 0; i < geom.attributes.position.count; i++) {
            vec.fromArray(geom.attributes.position.array, 3 * i);

            vec.applyMatrix4(inverse);
            if (!geom.OBB.box3D.containsPoint(vec)) {
                failing++;
            }
        }
        assert.equal(geom.attributes.position.count - failing, geom.attributes.position.count, 'All points should be inside OBB');
    });
}

describe('Planar tiles OBB computation', function () {
    const builder = new PlanarTileBuilder({ crs: 'EPSG:3946', uvCount: 1 });

    it('should compute OBB correctly', function () {
        const extent = new Extent('EPSG:3946', -100, 100, -50, 50);
        assertVerticesAreInOBB(builder, extent);
    });
});
describe('Ellipsoid tiles OBB computation', function () {
    const builder = new BuilderEllipsoidTile({ crs: 'EPSG:4978', uvCount: 1 });

    it('should compute globe-level 0 OBB correctly', function () {
        const extent = new Extent('EPSG:4326', -180, 0, -90, 90);
        assertVerticesAreInOBB(builder, extent);
    });

    it('should compute globe-level 2 OBB correctly', function () {
        const extent = new Extent('EPSG:4326', 0, 45, -45, 0);
        assertVerticesAreInOBB(builder, extent);
    });
});
