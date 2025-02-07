import assert from 'assert';
import { Extent } from '@itowns/geographic';
import PlanarView from 'Core/Prefab/PlanarView';
import Renderer from './bootstrap';


describe('Planar View', function () {
    let renderer;
    let extent;

    before(function () {
        renderer = new Renderer();
        extent = new Extent('EPSG:4326', 0, 1, 0, 1);
    });

    it('should not instantiate controls if requested', function () {
        const planarView = new PlanarView(renderer.domElement, extent, { renderer, noControls: true });
        assert.ok(planarView.controls === undefined);
    });
});
