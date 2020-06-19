const assert = require('assert');

describe('Camera utils with globe example', function _() {
    before(async () => {
        await loadExample('examples/view_3d_map.html', this.fullTitle());

        await page.evaluate(() => {
            window.THREE = itowns.THREE;
            const raycaster = new THREE.Raycaster();
            const screen = new THREE.Vector2();
            const ellipsoid = new itowns.Ellipsoid(itowns.ellipsoidSizes);
            view
                .getPickingPositionFromDepth = function fn(mouse, target = new THREE.Vector3()) {
                    const g = this.mainLoop.gfxEngine;
                    const dim = g.getWindowSize();
                    screen.copy(mouse || dim.clone().multiplyScalar(0.5));
                    screen.x = Math.floor(screen.x);
                    screen.y = Math.floor(screen.y);
                    screen.x = ((screen.x / dim.x) * 2) - 1;
                    screen.y = (-(screen.y / dim.y) * 2) + 1;
                    raycaster.setFromCamera(screen, this.camera.camera3D);
                    target.copy(ellipsoid.intersection(raycaster.ray));

                    return target;
                };
        });
    });

    it('should set range like expected', async () => {
        const params = { range: 10000 };
        const result = await page.evaluate((p) => {
            const camera = view.camera.camera3D;
            return itowns.CameraUtils.transformCameraToLookAtTarget(
                view, camera, p,
            ).then(final => final.range);
        }, params);

        assert.ok(Math.abs(result - params.range) / params.range < 0.05);
    });
    it('should look at coordinate like expected', async () => {
        const params = { longitude: 60, latitude: 40 };
        const result = await page.evaluate((p) => {
            const coord = new itowns.Coordinates('EPSG:4326', p.longitude, p.latitude, 0);
            const camera = view.camera.camera3D;
            return itowns.CameraUtils.transformCameraToLookAtTarget(
                view, camera, { coord },
            ).then(final => final.coord);
        }, params);
        assert.equal(Math.round(result.x), params.longitude);
        assert.equal(Math.round(result.y), params.latitude);
    });

    it('should tilt like expected', async () => {
        const params = { tilt: 50 };
        const result = await page.evaluate((p) => {
            const camera = view.camera.camera3D;
            return itowns.CameraUtils.transformCameraToLookAtTarget(
                view, camera, p,
            ).then(final => final.tilt);
        }, params);
        assert.equal(Math.round(result), params.tilt);
    });

    it('should heading like expected', async () => {
        const params = { heading: 170 };
        const result = await page.evaluate((p) => {
            const camera = view.camera.camera3D;
            return itowns.CameraUtils.transformCameraToLookAtTarget(
                view, camera, p,
            ).then(final => final.heading);
        }, params);
        assert.equal(Math.round(result), params.heading);
    });

    it('should heading, tilt, range and coordinate like expected', async () => {
        const result = await page.evaluate(() => {
            const camera = view.camera.camera3D;
            const params = {
                heading: 17,
                tilt: 44,
                range: 200000,
                longitude: 3,
                latitude: 46,
                coord: new itowns.Coordinates('EPSG:4326', 3, 47, 0),
            };
            return itowns.CameraUtils.transformCameraToLookAtTarget(
                view, camera, params,
            ).then(final => ({ params, final }));
        });
        assert.equal(Math.round(result.final.heading), result.params.heading);
        assert.equal(Math.round(result.final.tilt), result.params.tilt);
        assert.equal(Math.round(result.final.coord.x), result.params.coord.x);
        assert.equal(Math.round(result.final.coord.y), result.params.coord.y);
        assert.equal(Math.round(result.final.range / 10000) * 10000, result.params.range);
    });

    it('should heading, tilt, range and coordinate like expected with animation (500ms)', async () => {
        const result = await page.evaluate(() => {
            const params = {
                heading: 17,
                tilt: 44,
                range: 200000,
                longitude: 3,
                latitude: 46,
                coord: new itowns.Coordinates('EPSG:4326', 3, 47, 0),
                time: 500,
            };
            const camera = view.camera.camera3D;
            return itowns.CameraUtils
                .animateCameraToLookAtTarget(view, camera, params)
                .then(final => ({ final, params }));
        });
        assert.equal(Math.round(result.final.heading), result.params.heading);
        assert.equal(Math.round(result.final.tilt), result.params.tilt);
        assert.equal(Math.round(result.final.coord.x), result.params.coord.x);
        assert.equal(Math.round(result.final.coord.y), result.params.coord.y);
        assert.equal(Math.round(result.final.range / 1000) * 1000, result.params.range);
    });
});
