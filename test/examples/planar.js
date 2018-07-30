/* global browser, itownsPort */
const assert = require('assert');

describe('planar', () => {
    it('should run', async function _() {
        const page = await browser.newPage();
        const result = await loadExample(page,
            `http://localhost:${itownsPort}/examples/planar.html`,
            this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });
    it('should get picking position from depth', async function _() {
        const page = await browser.newPage();

        await loadExample(page,
            `http://localhost:${itownsPort}/examples/planar.html`,
            this.test.fullTitle());

        const length = 1500;

        // get range with depth buffer and altitude
        await page.evaluate((l) => {
            const lookat = extent.center().xyz();

            view.camera.camera3D.position.copy(lookat);
            view.camera.camera3D.position.z = l;
            view.camera.camera3D.lookAt(lookat);
            view.notifyChange(view.camera.camera3D, true);
        }, length);

        await waitUntilItownsIsIdle(page, this.test.fullTitle());

        const result = await page.evaluate(() => {
            const depthMethod = view
                .getPickingPositionFromDepth().distanceTo(view.camera.camera3D.position);

            const altitude = itowns.DEMUtils
                .getElevationValueAt(view.tileLayer, extent.center().clone()).z;

            return { depthMethod, altitude };
        });
        // threorical range between ground and camera
        const theoricalRange = length - result.altitude;
        const diffRange = Math.abs(theoricalRange - result.depthMethod);
        assert.ok(diffRange < 2);
        await page.close();
    });
});
