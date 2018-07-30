/* global browser, itownsPort */
const assert = require('assert');

describe('positionGlobe', () => {
    it('should run', async function _() {
        const page = await browser.newPage();
        const result = await loadExample(page,
            `http://localhost:${itownsPort}/examples/positionGlobe.html`,
            this.test.fullTitle());

        assert.ok(result);
        await page.close();
    });

    it('bug #747', async function _() {
        const page = await browser.newPage();
        await loadExample(page,
            `http://localhost:${itownsPort}/examples/positionGlobe.html`,
            this.test.fullTitle());

        // wait cone creation
        await page.evaluate(() =>
            new Promise((resolve) => {
                globeView.addFrameRequester('after_render', () => {
                    if (globeView.mesh) {
                        resolve();
                    } else {
                        globeView.notifyChange();
                    }
                });
                globeView.notifyChange();
            }));

        const value = await page.evaluate(() => {
            // bug was caused by the readDepthBuffer() returning an incorrect value
            // because it drew the cone in front of the cone

            // compute the on screen cone position
            const coneCenter = new itowns.THREE.Vector3(0, 0, 0)
                .applyMatrix4(globeView.mesh.matrixWorld);
            coneCenter.applyMatrix4(globeView.camera._viewMatrix);
            const mouse = globeView.normalizedToViewCoords(coneCenter);

            // So read the depth buffer at cone's position
            const valueVisible = globeView.readDepthBuffer(mouse.x, mouse.y, 1, 1);

            // Then hide the cone, and re-read the value
            globeView.mesh.material.visible = false;
            const valueHidden = globeView.readDepthBuffer(mouse.x, mouse.y, 1, 1);

            // Both should be equal, since currently readDepthBuffer only
            // supports special materials (see RendererConstant.DEPTH)
            return { visible: valueVisible, hidden: valueHidden };
        });

        assert.deepEqual(value.visible, value.hidden);

        await page.close();
    });
    it('should get picking position from depth', async function _() {
        const page = await browser.newPage();

        await loadExample(page,
            `http://localhost:${itownsPort}/examples/positionGlobe.html`,
            this.test.fullTitle());

        // wait mesh creation
        await page.evaluate(() =>
            new Promise((resolve) => {
                globeView.addFrameRequester('after_render', () => {
                    if (globeView.mesh) {
                        resolve();
                    } else {
                        globeView.notifyChange();
                    }
                });
                globeView.notifyChange();
            }));

        // Hide cone the cone and set range
        const destRange = 1500;
        await page.evaluate((range) => {
            globeView.mesh.material.visible = false;
            globeView.controls.setRange(range);
        }, destRange);

        // wait camera'transformation and get range value with globeControls method
        const controlsMethod = await page.evaluate(() =>
            new Promise((resolve) => {
                const endAni = () => {
                    globeView.controls.removeEventListener('animation-ended', endAni);
                    resolve(globeView.controls.getRange());
                };
                globeView.controls.addEventListener('animation-ended', endAni);
            }));

        // get range with depth buffer
        const depthMethod = await page.evaluate(() => globeView
            .getPickingPositionFromDepth().distanceTo(globeView.camera.camera3D.position));

        assert.ok(Math.abs(controlsMethod - destRange) < 2);
        assert.ok(Math.abs(depthMethod - destRange) < 2);

        await page.close();
    });
});
