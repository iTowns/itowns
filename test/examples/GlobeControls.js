/* global describe, it */
const assert = require('assert');

async function newGlobePage() {
    const page = await browser.newPage();
    await loadExample(page, `http://localhost:${itownsPort}/examples/globe.html`,
        this.test.fullTitle());
    await page.evaluate(() => {
        window.THREE = itowns.THREE;
        const raycaster = new itowns.THREE.Raycaster();
        const screen = new itowns.THREE.Vector2();
        globeView
            .getPickingPositionFromDepth = function fn(mouse, target = new itowns.THREE.Vector3()) {
                const g = this.mainLoop.gfxEngine;
                const dim = g.getWindowSize();
                const ellipsoid = new itowns.Ellipsoid(itowns.ellipsoidSizes());
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

describe('GlobeControls with globe example', () => {
    it('should move and then tilt, like expected', async function _() {
        const page = await newGlobePage.bind(this)();
        const tilt = 45;
        const vCoord = { longitude: 22, latitude: 47 };
        const result = await page.evaluate((pTilt, vC) =>
            new Promise((resolve) => {
                const tilts = [];
                const cb = (event) => {
                    globeView.controls
                        .removeEventListener(itowns.CONTROL_EVENTS.ORIENTATION_CHANGED, cb);
                    tilts.push(globeView.controls.getTilt());
                    tilts.push(event.new.tilt);
                    const coord = globeView.controls.getLookAtCoordinate();
                    if (tilts.length === 3) {
                        resolve({ tilts, coord });
                    }
                };
                globeView.controls
                    .addEventListener(itowns.CONTROL_EVENTS.ORIENTATION_CHANGED, cb);

                const pCoord = new itowns.Coordinates('EPSG:4326', vC.longitude, vC.latitude, 0);

                globeView.controls.lookAtCoordinate({ coord: pCoord }).then(() =>
                    globeView.controls.setTilt(pTilt).then((p) => {
                        tilts.push(p.tilt);
                        const coord = globeView.controls.getLookAtCoordinate();
                        if (tilts.length === 3) {
                            resolve({ tilts, coord });
                        }
                    }));
            }), tilt, vCoord);

        const tilts = result.tilts;
        const coord = result.coord;
        const eps = 0.000001;

        assert.ok(Math.abs(vCoord.longitude - coord._values[0]) < eps);
        assert.ok(Math.abs(vCoord.latitude - coord._values[1]) < eps);
        assert.ok(Math.abs(tilt - tilts[0]) < eps);
        assert.ok(Math.abs(tilt - tilts[1]) < eps);
        assert.ok(Math.abs(tilt - tilts[2]) < eps);
        await page.close();
    });
    it('should get same tilt with event, promise and getTilt, like expected', async function _() {
        const page = await newGlobePage.bind(this)();
        const tilt = 45;
        const tilts = await page.evaluate(pTilt =>
            new Promise((resolve) => {
                const checks = [];
                const cb = (event) => {
                    globeView.controls
                        .removeEventListener(itowns.CONTROL_EVENTS.ORIENTATION_CHANGED, cb);
                    checks.push(globeView.controls.getTilt());
                    checks.push(event.new.tilt);
                    if (checks.length === 3) {
                        resolve(checks);
                    }
                };
                globeView.controls
                    .addEventListener(itowns.CONTROL_EVENTS.ORIENTATION_CHANGED, cb);
                globeView.controls.setTilt(pTilt).then((p) => {
                    checks.push(p.tilt);
                    if (checks.length === 3) {
                        resolve(checks);
                    }
                });
            }), tilt);
        assert.ok(Math.abs(tilt - tilts[0]) < 0.000001);
        assert.ok(Math.abs(tilt - tilts[1]) < 0.000001);
        assert.ok(Math.abs(tilt - tilts[2]) < 0.000001);
        await page.close();
    });
    it('should move like expected', async function _() {
        const page = await newGlobePage.bind(this)();
        const innerWidth = await page.evaluate(() => window.innerWidth);
        const innerHeight = await page.evaluate(() => window.innerHeight);

        await page.evaluate(() => { globeView.controls.enableDamping = false; });
        const startCoord = await page.evaluate(() => globeView.controls.getLookAtCoordinate());
        const mouse = page.mouse;
        await mouse.move(innerWidth / 2, innerHeight / 2);
        await mouse.down();
        await mouse.move((innerWidth / 2) + 200, innerHeight / 2, { steps: 100 });
        await mouse.up();
        const endCoord = await page.evaluate(() => globeView.controls.getLookAtCoordinate());
        assert.ok((Math.round(startCoord._values[0] - endCoord._values[0])) >= 74);
        await page.close();
    });
    it('should zoom like expected with middle button', async function _() {
        const page = await newGlobePage.bind(this)();
        const innerWidth = await page.evaluate(() => window.innerWidth);
        const innerHeight = await page.evaluate(() => window.innerHeight);
        const startRange = await page.evaluate(() => globeView.controls.getRange());
        const mouse = page.mouse;
        await mouse.move(innerWidth / 2, innerHeight / 2);
        await mouse.down({ button: 'middle' });
        await mouse.move(innerWidth / 2, (innerHeight / 2) - 200, { steps: 100 });
        await mouse.up();
        const endRange = await page.evaluate(() => globeView.controls.getRange());
        assert.ok((startRange - endRange) > 20000000);
        await page.close();
    });
    it('should change tilt like expected', async function _() {
        const page = await newGlobePage.bind(this)();
        const innerWidth = await page.evaluate(() => window.innerWidth);
        const innerHeight = await page.evaluate(() => window.innerHeight);

        await page.evaluate(() => { globeView.controls.enableDamping = false; });
        const startTilt = await page.evaluate(() => globeView.controls.getTilt());
        await page.keyboard.down('Control');
        const mouse = page.mouse;
        await mouse.move(innerWidth / 2, innerHeight / 2);
        await mouse.down();
        await mouse.move(innerWidth / 2, (innerHeight / 2) - 200, { steps: 100 });
        await mouse.up();
        await page.keyboard.up('Control');
        const endTilt = await page.evaluate(() => globeView.controls.getTilt());
        assert.ok(startTilt - endTilt > 43);
        await page.close();
    });
    it('should change heading like expected', async function _() {
        const page = await newGlobePage.bind(this)();
        const innerWidth = await page.evaluate(() => window.innerWidth);
        const innerHeight = await page.evaluate(() => window.innerHeight);

        await page.evaluate(() => { globeView.controls.enableDamping = false; });
        const startHeading = await page.evaluate(() => globeView.controls.getHeading());
        await page.keyboard.down('Control');
        const mouse = page.mouse;
        await mouse.move(innerWidth / 2, innerHeight / 2);
        await mouse.down();
        await mouse.move((innerWidth / 2) - 50, (innerHeight / 2), { steps: 100 });
        await mouse.up();
        await page.keyboard.up('Control');
        const endHeading = await page.evaluate(() => globeView.controls.getHeading());
        assert.ok(Math.floor(startHeading + endHeading) > 10);
        await page.close();
    });
    it('should zoom like expected with double click', async function _() {
        const page = await newGlobePage.bind(this)();
        const innerWidth = await page.evaluate(() => window.innerWidth);
        const innerHeight = await page.evaluate(() => window.innerHeight);
        const start = await page.evaluate(() => globeView.controls.getRange());
        const end = page.evaluate(() =>
            new Promise((resolve) => {
                const endAni = () => {
                    globeView.controls.removeEventListener('animation-ended', endAni);
                    resolve(globeView.controls.getRange());
                };
                globeView.controls.addEventListener('animation-ended', endAni);
            }));

        await page.evaluate(() => { globeView.controls.enableDamping = false; });
        await page.mouse.click(innerWidth / 2, innerHeight / 2, { clickCount: 2, delay: 100 });
        const result = await end.then(er => (start * 0.6) - er);
        assert.ok(Math.abs(result) < 100);

        await page.close();
    });
    it('should zoom like expected with mouse wheel', async function _() {
        const page = await newGlobePage.bind(this)();
        const innerWidth = await page.evaluate(() => window.innerWidth);
        const innerHeight = await page.evaluate(() => window.innerHeight);
        await page.evaluate(() => { globeView.controls.enableDamping = false; });
        await page.mouse.move(innerWidth / 2, innerHeight / 2);
        const initRange = await page.evaluate(() => globeView.controls.getRange());
        const finalRange = await page.evaluate(() =>
            new Promise((resolve) => {
                globeView.mainLoop.addEventListener('command-queue-empty', () => {
                    if (globeView.mainLoop.renderingState === 0) {
                        resolve(globeView.controls.getRange());
                    }
                });
                const wheelEvent = new WheelEvent('mousewheel', {
                    deltaY: -50000,
                });
                globeView.mainLoop.gfxEngine.renderer.domElement
                    .dispatchEvent(wheelEvent, document);
                window.dispatchEvent(wheelEvent, document);
            }));
        assert.ok(initRange - finalRange > 2000000);
        await page.close();
    });
});

