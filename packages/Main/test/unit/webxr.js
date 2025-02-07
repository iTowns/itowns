import assert from 'assert';
import View from 'Core/View';
import Renderer from './bootstrap';

describe('WebXR', function () {
    let viewer;
    before(async function () {
        const renderer = new Renderer();

        viewer = new View('EPSG:4326', renderer.domElement, {
            renderer,
            webXR: { scale: 0.005 },
        });
    });

    it('should initialize webXr', function () {
        const webXRManager = viewer.mainLoop.gfxEngine.renderer.xr;
        const sessionEvent = webXRManager.events.get('sessionstart');

        assert.ok(typeof sessionEvent === 'function');
    });

    it('should initialize webXr session', function () {
        const webXRManager = viewer.mainLoop.gfxEngine.renderer.xr;
        assert.ok(webXRManager.enabled === undefined);
        webXRManager.dispatchEvent({ type: 'sessionstart' });
        assert.ok(webXRManager.enabled);
    });

    it('should close webXr session', function () {
        const webXRManager = viewer.mainLoop.gfxEngine.renderer.xr;
        assert.ok(webXRManager.enabled);
        document.emitEvent('keydown', { key: 'Escape' });
        assert.ok(webXRManager.enabled === false);
        assert.ok(viewer);
    });
});
