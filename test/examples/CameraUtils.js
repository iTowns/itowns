const assert = require('assert');

async function newGlobePage() {
    const page = await browser.newPage();
    await page.setViewport({ width: 400, height: 300 });
    await loadExample(page, `http://localhost:${itownsPort}/examples/globe.html`,
        this.test.fullTitle());

    await page.evaluate(() => {
        window.THREE = itowns.THREE;
        const raycaster = new itowns.THREE.Raycaster();
        const screen = new itowns.THREE.Vector2();
        const ellipsoid = new itowns.Ellipsoid(itowns.ellipsoidSizes);
        globeView
            .getPickingPositionFromDepth = function fn(mouse, target = new itowns.THREE.Vector3()) {
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
    return page;
}

describe('Camera utils with globe example', () => {
    it('should set range like expected', async function _() {
        const page = await newGlobePage.bind(this)();
        const params = { range: 10000 };
        const result = await page.evaluate((p) => {
            const camera = globeView.camera.camera3D;
            return itowns.CameraUtils.transformCameraToLookAtTarget(
                globeView, camera, p).then(final => final.range);
        }, params);

        assert.ok(Math.abs(result - params.range) / params.range < 0.05);
        page.close();
        await page.close();
    });
    it('should look at coordinate like expected', async function _() {
        const page = await newGlobePage.bind(this)();
        const params = { longitude: 60, latitude: 40 };
        const result = await page.evaluate((p) => {
            const coord = new itowns.Coordinates('EPSG:4326', p.longitude, p.latitude, 0);
            const camera = globeView.camera.camera3D;
            return itowns.CameraUtils.transformCameraToLookAtTarget(
                globeView, camera, { coord }).then(final => final.coord);
        }, params);
        assert.equal(Math.round(result._values[0]), params.longitude);
        assert.equal(Math.round(result._values[1]), params.latitude);
        page.close();
        await page.close();
    });
    it('should tilt like expected', async function _() {
        const page = await newGlobePage.bind(this)();
        const params = { tilt: 50 };

        const result = await page.evaluate((p) => {
            const camera = globeView.camera.camera3D;
            return itowns.CameraUtils.transformCameraToLookAtTarget(
                globeView, camera, p).then(final => final.tilt);
        }, params);
        assert.equal(Math.round(result), params.tilt);
        page.close();
        await page.close();
    });
    it('should heading like expected', async function _() {
        const page = await newGlobePage.bind(this)();

        const params = { heading: 170 };
        const result = await page.evaluate((p) => {
            const camera = globeView.camera.camera3D;
            return itowns.CameraUtils.transformCameraToLookAtTarget(
                globeView, camera, p).then(final => final.heading);
        }, params);
        assert.equal(Math.round(result), params.heading);
        page.close();
        await page.close();
    });
    it('should heading, tilt, range and coordinate like expected', async function _() {
        const page = await newGlobePage.bind(this)();

        const result = await page.evaluate(() => {
            const camera = globeView.camera.camera3D;
            const params = { heading: 17,
                tilt: 44,
                range: 200000,
                longitude: 3,
                latitude: 46,
                coord: new itowns.Coordinates('EPSG:4326', 3, 47, 0) };
            return itowns.CameraUtils.transformCameraToLookAtTarget(
                globeView, camera, params).then(final => ({ params, final }));
        });
        assert.equal(Math.round(result.final.heading), result.params.heading);
        assert.equal(Math.round(result.final.tilt), result.params.tilt);
        assert.equal(Math.round(result.final.coord._values[0]), result.params.coord._values[0]);
        assert.equal(Math.round(result.final.coord._values[1]), result.params.coord._values[1]);
        assert.equal(Math.round(result.final.range / 10000) * 10000, result.params.range);
        page.close();
        await page.close();
    });
    it('should heading, tilt, range and coordinate like expected with animation (500ms)', async function _() {
        const page = await newGlobePage.bind(this)();
        const result = await page.evaluate(() => {
            const params = {
                heading: 17,
                tilt: 44,
                range: 200000,
                longitude: 3,
                latitude: 46,
                coord: new itowns.Coordinates('EPSG:4326', 3, 47, 0),
                time: 500 };
            const camera = globeView.camera.camera3D;
            return itowns.CameraUtils
                .animateCameraToLookAtTarget(globeView, camera, params).then(final =>
                ({ final, params }));
        });
        assert.equal(Math.round(result.final.heading), result.params.heading);
        assert.equal(Math.round(result.final.tilt), result.params.tilt);
        assert.equal(Math.round(result.final.coord._values[0]), result.params.coord._values[0]);
        assert.equal(Math.round(result.final.coord._values[1]), result.params.coord._values[1]);
        assert.equal(Math.round(result.final.range / 1000) * 1000, result.params.range);
        page.close();
        await page.close();
    });
});

