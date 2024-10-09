import assert from 'assert';

describe('3dtiles_loader', function _() {
    let result;
    before(async () => {
        result = await loadExample('examples/3dtiles_loader.html', this.fullTitle());
    });

    it('should run', async () => {
        assert.ok(result);
    });

    it('should display the globe', async () => {
        const layers = await page.evaluate(
            () => view.pickObjectsAt({ x: 195, y: 146 }).map(p => p.layer.id),
        );

        assert.ok(layers.indexOf('globe') >= 0);
    });

    it('should display lyon mesh', async () => {
        // Simulate click on load Lyon dataset, wait for the camera animation to end ant then for the tileset
        // to be loaded and finally pick to verify it is correctly displayed
        const pickedLayers = await page.evaluate(() => new Promise((resolve, reject) => {
            window.loadLyon(); // Load the Lyon layer
            const tilesRenderer = layer.tilesRenderer;

            // Triggered when tileset has finished loading
            const onTilesLoadEnd = () => {
                tilesRenderer.removeEventListener('tiles-load-end', onTilesLoadEnd); // Cleanup listener
                const picked = view.pickObjectsAt({ x: 286, y: 164 }).map(p => p.layer && p.layer.id);
                resolve(picked);
            };

            // Triggered when camera animation as ended
            const onAnimationEnded = () => {
                // Once the animation ends, set up to wait for tiles load end
                tilesRenderer.addEventListener('tiles-load-end', onTilesLoadEnd);
            };

            window.view.controls.addEventListener('animation-ended', onAnimationEnded);

            // Set a timeout to reject if the tiles-load-end event never fires
            setTimeout(() => {
                tilesRenderer.removeEventListener('tiles-load-end', onTilesLoadEnd); // Cleanup listener
                window.view.controls.removeEventListener('animation-ended', onAnimationEnded); // Cleanup animation listener
                reject(new Error('tiles-load-end event did not fire in time'));
            }, 100000); // Timeout value set to test-functional npm script value
        }));

        assert.ok(pickedLayers.indexOf('lyon') >= 0); // Check if 'lyon' layer is picked
    });

    it('should display sete point cloud', async () => {
        // Simulate click on load Sete dataset, wait for the camera animation to end ant then for the tileset
        // to be loaded and finally pick to verify it is correctly displayed
        const pickedLayers = await page.evaluate(() => new Promise((resolve, reject) => {
            window.loadSete(); // Load the Lyon layer
            const tilesRenderer = layer.tilesRenderer;

            // Triggered when tileset has finished loading
            const onTilesLoadEnd = () => {
                tilesRenderer.removeEventListener('tiles-load-end', onTilesLoadEnd); // Cleanup listener
                const picked = view.pickObjectsAt({ x: 296, y: 252 }).map(p => p.layer && p.layer.id);
                resolve(picked);
            };

            // Triggered when camera animation as ended
            const onAnimationEnded = () => {
                // Once the animation ends, set up to wait for tiles load end
                tilesRenderer.addEventListener('tiles-load-end', onTilesLoadEnd);
            };

            window.view.controls.addEventListener('animation-ended', onAnimationEnded);

            setTimeout(() => {
                tilesRenderer.removeEventListener('tiles-load-end', onTilesLoadEnd); // Cleanup listener
                window.view.controls.removeEventListener('animation-ended', onAnimationEnded); // Cleanup animation listener
                reject(new Error('tiles-load-end event did not fire in time'));
            }, 100000); // Timeout value set to test-functional npm script value
        }));

        assert.ok(pickedLayers.indexOf('sete') >= 0); // Check if 'sete' layer is picked
    });

    // Similar to the two previous tests but for this dataset tiles loading ends before camera animation sometimes
    // (because of the geometric error of the root tile and because first child tiles are light and loaded quickly).
    // We have to implement a slightly more complicated test that waits for both events (animation-ended and tiles-load-end)
    // to be triggered, no matter the order, to do the picking
    it('should display lille mesh', async () => {
        const pickedLayers = await page.evaluate(() => new Promise((resolve, reject) => {
            window.loadLille();
            const tilesRenderer = layer.tilesRenderer;

            let animationEnded = false;
            let tilesLoaded = false;

            const onTilesLoadEnd = () => {
                tilesLoaded = true;
                if (animationEnded) {
                    tilesRenderer.removeEventListener('tiles-load-end', onTilesLoadEnd);
                    const picked = view.pickObjectsAt({ x: 227, y: 144 }).map(p => p.layer && p.layer.id);
                    resolve(picked);
                }
            };

            const onAnimationEnded = () => {
                animationEnded = true;
                // If tiles are already loaded, we can resolve immediately
                if (tilesLoaded) {
                    onTilesLoadEnd();
                }
            };

            window.view.controls.addEventListener('animation-ended', onAnimationEnded);
            tilesRenderer.addEventListener('tiles-load-end', onTilesLoadEnd);

            setTimeout(() => {
                tilesRenderer.removeEventListener('tiles-load-end', onTilesLoadEnd);
                window.view.controls.removeEventListener('animation-ended', onAnimationEnded);
                reject(new Error('tiles-load-end and animation-ended event did not fire in time'));
            }, 100000);
        }));

        assert.ok(pickedLayers.indexOf('lille') >= 0);
    });
});
