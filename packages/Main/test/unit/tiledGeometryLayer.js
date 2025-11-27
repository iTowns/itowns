import assert from 'assert';
import { Extent, Coordinates } from '@itowns/geographic';
import PlanarView from 'Core/Prefab/PlanarView';
import { CAMERA_TYPE } from 'Renderer/Camera';
import GlobeView from 'Core/Prefab/GlobeView';
import Renderer from './bootstrap';



describe('TiledGeometryLayer', function () {
    const renderer = new Renderer();
    const extent = new Extent(
        'EPSG:4326',
        1000000, 1500000,
        1000000, 1500000,
    );
    const viewPerspective = new PlanarView(renderer.domElement, extent, { renderer });
    const viewOrtho = new PlanarView(renderer.domElement, extent, { renderer, cameraType: CAMERA_TYPE.ORTHOGRAPHIC });

    it('subdivide should compute a screenSize', function () {
        // perspective camera.c
        viewPerspective.tileLayer.subdivision({ camera: viewPerspective.camera }, viewPerspective.tileLayer.level0Nodes[0]);
        assert.notEqual(viewPerspective.tileLayer.level0Nodes[0].screenSize, undefined);

        // orthographic camera
        viewOrtho.tileLayer.subdivision({ camera: viewOrtho.camera }, viewOrtho.tileLayer.level0Nodes[0]);
        assert.notEqual(viewOrtho.tileLayer.level0Nodes[0].screenSize, undefined);
    });

    it('should allow hide skirt', function () {
        // planar view
        const viewPlanar = new PlanarView(renderer.domElement, extent, { renderer, hideSkirt: true });
        assert.ok(viewPlanar);

        // globe view
        const placement = { coord: new Coordinates('EPSG:4326', 4.631512, 43.675626), range: 3919 };
        const viewGlobe = new GlobeView(renderer.domElement, placement, { renderer, hideSkirt: true });
        assert.ok(viewGlobe);
    });
});
