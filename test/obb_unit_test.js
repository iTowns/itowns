import * as THREE from 'three';
import proj4 from 'proj4';
import assert from 'assert';
import { UNIT } from '../src/Core/Geographic/Coordinates';
import Extent from '../src/Core/Geographic/Extent';
import BuilderEllipsoidTile from '../src/Core/Prefab/Globe/BuilderEllipsoidTile';
import PlanarTileBuilder from '../src/Core/Prefab/Planar/PlanarTileBuilder';
import TileGeometry from '../src/Core/TileGeometry';
import OBB from '../src/Renderer/ThreeExtended/OBB';
/* global describe, it */

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

describe('OBB', function () {
    it('should correctly instance obb', () => {
        assert.equal(obb.natBox.min.x, min.x);
        assert.equal(obb.natBox.max.x, max.x);
    });
    it('isSphereAboveXYBox should work properly', () => {
        const sphere = { radius: 5, position: new THREE.Vector3(23, 0, 0) };
        assert.equal(obb.isSphereAboveXYBox(sphere), true);
    });
});


// Define projection that we will use (taken from https://epsg.io/3946, Proj4js section)
proj4.defs('EPSG:3946', '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
function assertVerticesAreInOBB(builder, extent) {
    const params = {
        extent,
        disableSkirt: true,
    };

    const geom = new TileGeometry(params, builder);
    const inverse = new THREE.Matrix4().getInverse(geom.OBB.matrix);

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
}

describe('Ellipsoid tiles OBB computation', function () {
    const builder = new BuilderEllipsoidTile();

    it('should compute globe-level 0 OBB correctly', function () {
        const extent = new Extent('EPSG:4326', -Math.PI, 0, -Math.PI * 0.5, Math.PI * 0.5);
        extent._internalStorageUnit = UNIT.RADIAN;
        assertVerticesAreInOBB(builder, extent);
    });

    it('should compute globe-level 2 OBB correctly', function () {
        const extent = new Extent('EPSG:4326', 0, 0.7853981633974483, -0.7853981633974483, 0);
        extent._internalStorageUnit = UNIT.RADIAN;
        assertVerticesAreInOBB(builder, extent);
    });
});

describe('Planar tiles OBB computation', function () {
    const builder = new PlanarTileBuilder();

    it('should compute OBB correctly', function () {
        const extent = new Extent('EPSG:3946', -100, 100, -50, 50);
        assertVerticesAreInOBB(builder, extent);
    });
});
