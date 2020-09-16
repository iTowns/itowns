const assert = require('assert');

// global variables
let middleWidth;
let middleHeight;

describe('GlobeControls with globe example', function _() {
    before(async () => {
        await loadExample('examples/view_3d_map.html', this.fullTitle());
        await page.evaluate(() => {
            window.THREE = itowns.THREE;
            const raycaster = new THREE.Raycaster();
            const screen = new THREE.Vector2();
            view
                .getPickingPositionFromDepth = function fn(mouse, target = new THREE.Vector3()) {
                    const g = view.mainLoop.gfxEngine;
                    const dim = g.getWindowSize();
                    const ellipsoid = new itowns.Ellipsoid(itowns.ellipsoidSizes);
                    screen.copy(mouse || dim.clone().multiplyScalar(0.5));
                    screen.x = Math.floor(screen.x);
                    screen.y = Math.floor(screen.y);
                    screen.x = ((screen.x / dim.x) * 2) - 1;
                    screen.y = (-(screen.y / dim.y) * 2) + 1;
                    raycaster.setFromCamera(screen, view.camera.camera3D);
                    target.copy(ellipsoid.intersection(raycaster.ray));

                    return target;
                };

            menuGlobe.gui.remove(cRL);
        });

        middleWidth = await page.evaluate(() => window.innerWidth / 2);
        middleHeight = await page.evaluate(() => window.innerHeight / 2);
    });

    it('should move and then tilt, like expected', async () => {
        const tilt = 45;
        const vCoord = { longitude: 22, latitude: 47 };
        const result = await page.evaluate((pTilt, vC) => new Promise((resolve) => {
            const tilts = [];
            const cb = (event) => {
                view.controls
                    .removeEventListener(itowns.CONTROL_EVENTS.ORIENTATION_CHANGED, cb);
                tilts.push(view.controls.getTilt());
                tilts.push(event.new.tilt);
                const coord = view.controls.getLookAtCoordinate();
                if (tilts.length === 3) {
                    resolve({ tilts, coord });
                }
            };
            view.controls
                .addEventListener(itowns.CONTROL_EVENTS.ORIENTATION_CHANGED, cb);

            const pCoord = new itowns.Coordinates('EPSG:4326', vC.longitude, vC.latitude, 0);

            view.controls.lookAtCoordinate({ coord: pCoord })
                .then(() => view.controls.setTilt(pTilt).then((p) => {
                    tilts.push(p.tilt);
                    const coord = view.controls.getLookAtCoordinate();
                    if (tilts.length === 3) {
                        resolve({ tilts, coord });
                    }
                }));
        }), tilt, vCoord);

        const tilts = result.tilts;
        const coord = result.coord;
        const eps = 0.000001;

        assert.ok(Math.abs(vCoord.longitude - coord.x) < eps);
        assert.ok(Math.abs(vCoord.latitude - coord.y) < eps);
        assert.ok(Math.abs(tilt - tilts[0]) < eps);
        assert.ok(Math.abs(tilt - tilts[1]) < eps);
        assert.ok(Math.abs(tilt - tilts[2]) < eps);
    });

    it('should get same tilt with event, promise and getTilt, like expected', async () => {
        const tilt = 45;
        const tilts = await page.evaluate(pTilt => new Promise((resolve) => {
            const checks = [];
            const cb = (event) => {
                view.controls
                    .removeEventListener(itowns.CONTROL_EVENTS.ORIENTATION_CHANGED, cb);
                checks.push(view.controls.getTilt());
                checks.push(event.new.tilt);
                if (checks.length === 3) {
                    resolve(checks);
                }
            };
            view.controls
                .addEventListener(itowns.CONTROL_EVENTS.ORIENTATION_CHANGED, cb);
            view.controls.setTilt(pTilt).then((p) => {
                checks.push(p.tilt);
                if (checks.length === 3) {
                    resolve(checks);
                }
            });
        }), tilt);
        assert.ok(Math.abs(tilt - tilts[0]) < 0.000001);
        assert.ok(Math.abs(tilt - tilts[1]) < 0.000001);
        assert.ok(Math.abs(tilt - tilts[2]) < 0.000001);
    });

    it('should move like expected', async () => {
        await page.evaluate(() => {
            view.controls.enableDamping = false;
        });

        const mouse = page.mouse;
        await mouse.move(middleWidth, middleHeight, { steps: 20 });
        await mouse.down();
        await mouse.move(middleWidth + 200, middleHeight, { steps: 50 });
        await mouse.up();

        const endCoord = await page.evaluate(() => view.controls.getLookAtCoordinate());

        const diffLongitude = initialPosition.coord.x - endCoord.x;
        assert.ok(Math.abs(Math.round(diffLongitude)) >= 25);
    });

    it('should zoom like expected with middle button', async () => {
        await page.evaluate(() => { view.controls.enableDamping = false; });
        const mouse = page.mouse;
        await mouse.move(middleWidth, middleHeight, { steps: 20 });
        await mouse.down({ button: 'middle' });
        await mouse.move(middleWidth, (middleHeight) - 200, { steps: 50 });
        await mouse.up();
        const endRange = await page.evaluate(() => Promise.resolve(view.controls.getRange()));
        assert.ok((initialPosition.range - endRange) > 20000000);
    });

    it('should change tilt like expected', async () => {
        await page.evaluate(() => { view.controls.enableDamping = false; });
        await page.keyboard.down('Control');
        const mouse = page.mouse;
        await mouse.move(middleWidth, middleHeight);
        await mouse.down();
        await mouse.move(middleWidth, (middleHeight) - 200, { steps: 20 });
        await mouse.up();
        await page.keyboard.up('Control');
        const endTilt = await page.evaluate(() => view.controls.getTilt());
        assert.ok(initialPosition.tilt - endTilt > 20);
    });

    it('should change heading like expected', async () => {
        await page.evaluate(() => { view.controls.enableDamping = false; });
        await page.keyboard.down('Control');
        const mouse = page.mouse;
        await mouse.move(middleWidth, middleHeight, { steps: 20 });
        await mouse.down();
        await mouse.move((middleWidth) - 50, (middleHeight), { steps: 10 });
        await mouse.up();
        await page.keyboard.up('Control');
        const endHeading = await page.evaluate(() => view.controls.getHeading());
        assert.ok(Math.floor(initialPosition.heading + endHeading) > 10);
    });

    it('should zoom like expected with double click', async () => {
        const end = page.evaluate(() => new Promise((resolve) => {
            const endAni = () => {
                view.controls.removeEventListener('animation-ended', endAni);
                resolve(view.controls.getRange());
            };
            view.controls.addEventListener('animation-ended', endAni);
        }));

        await page.evaluate(() => { view.controls.enableDamping = false; });
        await page.mouse.click(middleWidth, middleHeight, { clickCount: 2, delay: 50 });
        const result = await end.then(er => (initialPosition.range * 0.6) - er);
        assert.ok(Math.abs(result) < 100);
    });

    it('should zoom like expected with mouse wheel', async () => {
        // FIX Me: use puppetter mouse#wheel instead of new WheelEvent
        await page.evaluate(() => { view.controls.enableDamping = false; });
        await page.mouse.move(middleWidth, middleHeight, { steps: 20 });
        const finalRange = await page.evaluate(() => new Promise((resolve) => {
            view.mainLoop.addEventListener('command-queue-empty', () => {
                if (view.mainLoop.renderingState === 0) {
                    resolve(view.controls.getRange());
                }
            });
            const wheelEvent = new WheelEvent('mousewheel', {
                deltaY: -50000,
            });
            view.domElement.dispatchEvent(wheelEvent, document);
            window.dispatchEvent(wheelEvent, document);
        }));
        // On the travis server, the range is negative.
        assert.ok(Math.abs(initialPosition.range - finalRange) > 2000000);
    });
});
