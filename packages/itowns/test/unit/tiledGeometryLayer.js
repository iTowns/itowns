import assert from 'assert';
import Extent from 'Core/Geographic/Extent';
import PlanarView from 'Core/Prefab/PlanarView';
import { CAMERA_TYPE } from 'Renderer/Camera';
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
        // perspective camera
        viewPerspective.tileLayer.subdivision(viewPerspective, viewPerspective.tileLayer, viewPerspective.tileLayer.level0Nodes[0]);
        assert.notEqual(viewPerspective.tileLayer.level0Nodes[0].screenSize, undefined);

        // orthographic camera
        viewOrtho.tileLayer.subdivision(viewOrtho, viewOrtho.tileLayer, viewOrtho.tileLayer.level0Nodes[0]);
        assert.notEqual(viewOrtho.tileLayer.level0Nodes[0].screenSize, undefined);
    });
});
