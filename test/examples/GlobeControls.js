/* global describe, it */
const assert = require('assert');

// global variables
let page;
let mouse;
let middleWidth;
let middleHeight;
let initial;

describe('GlobeControls with globe example', () => {
    before(async function _() {
        page = await browser.newPage();
        await loadExample(page, `http://localhost:${itownsPort}/examples/globe.html`);
        initial = await page.evaluate(() => {
            window.THREE = itowns.THREE;
            const raycaster = new itowns.THREE.Raycaster();
            const screen = new itowns.THREE.Vector2();
            view
                .getPickingPositionFromDepth = function fn(mouse, target = new itowns.THREE.Vector3()) {
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

            const init = {
                coord: view.controls.getLookAtCoordinate(),
                heading: view.controls.getHeading(),
                range: view.controls.getRange(),
                tilt: view.controls.getTilt(),
            };

            return Promise.resolve(init);
        });

        middleWidth = await page.evaluate(() => window.innerWidth / 2);
        middleHeight = await page.evaluate(() => window.innerHeight / 2);
        mouse = page.mouse;
    });

    // reset page state without reloading one
    afterEach(async function _() {
        await page.evaluate((init) => {
            init.coord = new itowns.Coordinates(init.coord.crs, init.coord._values[0], init.coord._values[1], init.coord._values[2]);
            view.controls.lookAtCoordinate(init, false);
            view.notifyChange();
        }, initial);
        await mouse.move(0, 0);
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

                view.controls.lookAtCoordinate({ coord: pCoord }).then(() =>
                    view.controls.setTilt(pTilt).then((p) => {
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
        await page.close();
    });
    it('should move like expected', async function _() {
        await page.evaluate(() => {
            view.controls.enableDamping = false;
        });

        await page.evaluate(() => { globeView.controls.enableDamping = false; });
        const startCoord = await page.evaluate(() => globeView.controls.getLookAtCoordinate());
        const mouse = page.mouse;
        await mouse.move(innerWidth / 2, innerHeight / 2);
        await mouse.down();
        await mouse.move((innerWidth / 2) + 200, innerHeight / 2, { steps: 100 });
        await mouse.up();

        const endCoord = await page.evaluate(() => view.controls.getLookAtCoordinate());

        assert.ok((Math.round(initial.coord._values[0] - endCoord._values[0])) >= 74);
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
        const endRange = await page.evaluate(() => Promise.resolve(view.controls.getRange()));
        assert.ok((initial.range - endRange) > 20000000);
    });
    it('should change tilt like expected', async function _() {
        await page.evaluate(() => { view.controls.enableDamping = false; });
        await page.keyboard.down('Control');
        const mouse = page.mouse;
        await mouse.move(innerWidth / 2, innerHeight / 2);
        await mouse.down();
        await mouse.move(innerWidth / 2, (innerHeight / 2) - 200, { steps: 100 });
        await mouse.up();
        await page.keyboard.up('Control');
        const endTilt = await page.evaluate(() => view.controls.getTilt());
        assert.ok(initial.tilt - endTilt > 43);
    });
    it('should change heading like expected', async function _() {
        await page.evaluate(() => { view.controls.enableDamping = false; });
        await page.keyboard.down('Control');
        const mouse = page.mouse;
        await mouse.move(innerWidth / 2, innerHeight / 2);
        await mouse.down();
        await mouse.move((innerWidth / 2) - 50, (innerHeight / 2), { steps: 100 });
        await mouse.up();
        await page.keyboard.up('Control');
        const endHeading = await page.evaluate(() => view.controls.getHeading());
        assert.ok(Math.floor(initial.heading + endHeading) > 10);
    });
    it('should zoom like expected with double click', async function _() {
        const page = await newGlobePage.bind(this)();
        const innerWidth = await page.evaluate(() => window.innerWidth);
        const innerHeight = await page.evaluate(() => window.innerHeight);
        const start = await page.evaluate(() => globeView.controls.getRange());
        const end = page.evaluate(() =>
            new Promise((resolve) => {
                const endAni = () => {
                    view.controls.removeEventListener('animation-ended', endAni);
                    resolve(view.controls.getRange());
                };
                view.controls.addEventListener('animation-ended', endAni);
            }));

        await page.evaluate(() => { view.controls.enableDamping = false; });
        await page.mouse.click(middleWidth, middleHeight, { clickCount: 2, delay: 100 });
        const result = await end.then(er => (initial.range * 0.6) - er);
        assert.ok(Math.abs(result) < 100);

        await page.close();
    });
    it('should zoom like expected with mouse wheel', async function _() {
        await page.evaluate(() => { view.controls.enableDamping = false; });
        await page.mouse.move(middleWidth, middleHeight);
        const finalRange = await page.evaluate(() =>
            new Promise((resolve) => {
                view.mainLoop.addEventListener('command-queue-empty', () => {
                    if (view.mainLoop.renderingState === 0) {
                        resolve(view.controls.getRange());
                    }
                });
                const wheelEvent = new WheelEvent('mousewheel', {
                    deltaY: -50000,
                });
                view.mainLoop.gfxEngine.renderer.domElement
                    .dispatchEvent(wheelEvent, document);
                window.dispatchEvent(wheelEvent, document);
            }));
        assert.ok(initRange - finalRange > 2000000);
        await page.close();
    });
});

