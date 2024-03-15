import assert from 'assert';
import proj4 from 'proj4';
import * as THREE from 'three';
import Extent from 'Core/Geographic/Extent';
import PlanarView from 'Core/Prefab/PlanarView';
import C3DTBatchTable from 'Core/3DTiles/C3DTBatchTable';
import C3DTilesSource from 'Source/C3DTilesSource';
import C3DTilesLayer from 'Layer/C3DTilesLayer';
import sinon from 'sinon';
import Fetcher from 'Provider/Fetcher';
import Renderer from './bootstrap';

const tileset = {};

// Create a 'fake' tile content for this test purpose
function createTileContent(tileId) {
    const geometry = new THREE.SphereGeometry(15, 32, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });

    // Add _BATCHID geometry attributes
    const array = [];
    let currentBatchId = Math.round(Math.random() * 50);
    for (let index = 0; index < geometry.attributes.position.count; index++) {
        array.push(currentBatchId);

        // Change randomly batch id
        if (Math.random() > 0.5) {
            currentBatchId = Math.round(Math.random() * 50);
        }
    }
    geometry.setAttribute('_BATCHID', new THREE.BufferAttribute(Int32Array.from(array), 1));

    const result = new THREE.Mesh(geometry, material);
    result.batchTable = new C3DTBatchTable();
    result.tileId = tileId;

    return result;
}

describe('3DTilesLayer Style', () => {
    let view;
    let $3dTilesLayer;
    let source;
    let stubFetcherJson;

    before(function () {
        stubFetcherJson = sinon.stub(Fetcher, 'json')
            .callsFake(() => Promise.resolve(tileset));

        // Define crs
        proj4.defs('EPSG:3946', '+proj=lcc +lat_1=45.25 +lat_2=46.75 +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

        // Define geographic extent: CRS, min/max X, min/max Y
        const extent = new Extent('EPSG:3946',
            1840816.94334, 1843692.32501,
            5175036.4587, 5177412.82698);

        const renderer = new Renderer();

        view = new PlanarView(renderer.domElement, extent, { renderer, noControls: true });
    });

    after(function () {
        stubFetcherJson.restore();
    });

    it('should instance C3DTilesLayer', function (done) {
        source = new C3DTilesSource({
            url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/' +
                    '3DTiles/lyon1_with_surface_type_2018/tileset.json',
        });

        $3dTilesLayer = new C3DTilesLayer('id_layer',
            { source },
            view,
        );

        $3dTilesLayer.style = {
            fill: {
                color: (c3DTileFeature) => {
                    if (c3DTileFeature.batchId > 1) {
                        return 'red';
                    } else {
                        return 'blue';
                    }
                },
                opacity: (c3DTileFeature) => {
                    if (c3DTileFeature.getInfo().something) {
                        return 0.1;
                    } else if (c3DTileFeature.userData.something === 'random') {
                        return 1;
                    } else {
                        return 0.5;
                    }
                },
            },
        };

        source.whenReady
            .then(() => {
                assert.ok(source.isC3DTilesSource);
                done();
            })
            .catch(done);
    });

    it('Load tile content', function () {
        for (let index = 0; index < 10; index++) {
            const tileContent = createTileContent(index);
            $3dTilesLayer.object3d.add(tileContent);
            $3dTilesLayer.onTileContentLoaded(tileContent);
        }
    });

    it('Set c3DTileFeatures user data', function () {
        for (const [, tileC3DTileFeatures] of $3dTilesLayer.tilesC3DTileFeatures) {
            for (const [, c3DTileFeature] of tileC3DTileFeatures) {
                // eslint-disable-next-line guard-for-in
                if (Math.random() > 0.5) {
                    c3DTileFeature.userData.something = 'random';
                }
            }
        }
        $3dTilesLayer.updateStyle();
        assert.deepStrictEqual($3dTilesLayer.materialCount, 4);// 4 materials have been created for this styling
    });
});
