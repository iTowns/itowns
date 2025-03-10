import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import { Coordinates } from '@itowns/geographic';
import Renderer from './bootstrap';


/*
 Can't test with controllers because mocha doesn't support the necessary functions
 */
describe('WebXR', function () {
    let viewer;
    before(async function () {
        const renderer = new Renderer();
        const p = {
            coord: new Coordinates('EPSG:4326', -75.61349, 40.044259),
            range: 200,
            tilt: 10,
            heading: -145,
        };

        viewer = new GlobeView(renderer.domElement, p,  {
            renderer,
            webXR: { controllers: false },
        });
    });

    it('should store webXr', function () {
        assert.ok(viewer.webXR);
    });

    it('should initialize webXr', function () {
        const webXRManager = viewer.mainLoop.gfxEngine.renderer.xr;
        const sessionEvent = webXRManager.events.get('sessionstart');

        assert.ok(typeof sessionEvent === 'function');
    });
    it('should initialize webXr session', function () {
        const webXRManager = viewer.mainLoop.gfxEngine.renderer.xr;
        assert.ok(webXRManager.enabled === undefined);
        assert.ok(viewer._camXR === undefined);
        webXRManager.dispatchEvent({ type: 'sessionstart' });
        assert.ok(webXRManager.enabled);
        assert.ok(viewer._camXR);
    });
});
