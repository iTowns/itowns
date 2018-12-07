const assert = require('assert');

describe('planar', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/planar.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should subdivise planar correctly', async () => {
        const displayedTiles = await page.evaluate(() => {
            r = {};
            [...view.tileLayer.info.displayed.tiles]
            // eslint-disable-next-line
                .forEach(t => (!r[t.level] ? r[t.level] = 1 : r[t.level]++));
            return r;
        });
        assert.equal(displayedTiles['1'], 1);
        assert.equal(displayedTiles['2'], 6);
        assert.equal(displayedTiles['3'], 5);
    });

    it('should get picking position from depth', async function __() {
        const length = 1500;

        // get range with depth buffer and altitude
        await page.evaluate((l) => {
            const lookat = extent.center().xyz();

            view.camera.camera3D.position.copy(lookat);
            view.camera.camera3D.position.z = l;
            view.camera.camera3D.lookAt(lookat);
            view.notifyChange(view.camera.camera3D, true);
        }, length);

        await waitUntilItownsIsIdle(this.test.fullTitle());

        result = await page.evaluate(() => {
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
    });
});
