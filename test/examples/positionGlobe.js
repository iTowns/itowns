const assert = require('assert');

describe('positionGlobe', function _() {
    let result;
    before(async () => {
        result = await loadExample(`http://localhost:${itownsPort}/examples/positionGlobe.html`, this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('bug #747', async () => {
        // wait cone creation
        await page.evaluate(() => new Promise((resolve) => {
            view.addFrameRequester('after_render', () => {
                if (view.mesh) {
                    resolve();
                } else {
                    view.notifyChange();
                }
            });
            view.notifyChange();
        }));

        const value = await page.evaluate(() => {
            // bug was caused by the readDepthBuffer() returning an incorrect value
            // because it drew the cone in front of the cone

            // compute the on screen cone position
            const coneCenter = new itowns.THREE.Vector3(0, 0, 0)
                .applyMatrix4(view.mesh.matrixWorld);
            coneCenter.applyMatrix4(view.camera._viewMatrix);
            const mouse = view.normalizedToViewCoords(coneCenter);

            // So read the depth buffer at cone's position
            const valueVisible = view.readDepthBuffer(mouse.x, mouse.y, 1, 1);

            // Then hide the cone, and re-read the value
            view.mesh.material.visible = false;
            const valueHidden = view.readDepthBuffer(mouse.x, mouse.y, 1, 1);

            // Both should be equal, since currently readDepthBuffer only
            // supports special materials (see RendererConstant.DEPTH)
            return { visible: valueVisible, hidden: valueHidden };
        });

        assert.deepEqual(value.visible, value.hidden);
    });
    it('should get picking position from depth', async () => {
        // wait mesh creation
        await page.evaluate(() => new Promise((resolve) => {
            view.addFrameRequester('after_render', () => {
                if (view.mesh) {
                    resolve();
                } else {
                    view.notifyChange();
                }
            });
            view.notifyChange();
        }));

        // Hide cone the cone and set range
        const destRange = 1500;
        await page.evaluate((range) => {
            view.mesh.material.visible = false;
            view.controls.setRange(range);
        }, destRange);

        // wait camera'transformation and get range value with globeControls method
        const controlsMethod = await page.evaluate(() => new Promise((resolve) => {
            const endAni = () => {
                view.controls.removeEventListener('animation-ended', endAni);
                resolve(view.controls.getRange());
            };
            view.controls.addEventListener('animation-ended', endAni);
        }));

        // get range with depth buffer
        const depthMethod = await page.evaluate(() => view
            .getPickingPositionFromDepth().distanceTo(view.camera.camera3D.position));

        assert.ok(Math.abs(controlsMethod - destRange) < 2);
        assert.ok(Math.abs(depthMethod - destRange) < 2);
    });
});
