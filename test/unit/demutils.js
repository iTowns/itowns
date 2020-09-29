import * as THREE from 'three';
import ElevationLayer from 'Layer/ElevationLayer';
import WMTSSource from 'Source/WMTSSource';
import HttpsProxyAgent from 'https-proxy-agent';
import assert from 'assert';
import GlobeView from 'Core/Prefab/GlobeView';
import Coordinates from 'Core/Geographic/Coordinates';
import Extent from 'Core/Geographic/Extent';
import { updateLayeredMaterialNodeElevation } from 'Process/LayeredMaterialNodeProcessing';
import TileMesh from 'Core/TileMesh';
import OBB from 'Renderer/OBB';
import LayerUpdateState from 'Layer/LayerUpdateState';
import DEMUtils from 'Utils/DEMUtils';
import MaterialLayer from 'Renderer/MaterialLayer';
import Renderer from './bootstrap';

describe('DemUtils', function () {
    const renderer = new Renderer();
    const placement = { coord: new Coordinates('EPSG:4326', 1.5, 43), zoom: 10 };
    const viewer = new GlobeView(renderer.domElement, placement, { renderer });

    const source = new WMTSSource({
        format: 'image/x-bil;bits=32',
        crs: 'EPSG:4326',
        url: 'https://wxs.ign.fr/3ht7xcw6f7nciopo16etuqp2/geoportail/wmts',
        name: 'ELEVATION.ELEVATIONGRIDCOVERAGE.SRTM3',
        tileMatrixSet: 'WGS84G',
        networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {
            // referrerPolicy: 'origin-when-cross-origin',
            crossOrigin: 'anonymous',
            // referrer: 'http://localhost:8080/examples/view_3d_map.html',
        },
    });
    source.url = 'https://github.com/iTowns/iTowns2-sample-data/blob/master/dem3_3_8.bil?raw=true';
    const elevationlayer = new ElevationLayer('worldelevation', { source });

    const context = {
        camera: viewer.camera,
        engine: viewer.mainLoop.gfxEngine,
        scheduler: {
            execute: (command) => {
                const provider = viewer.mainLoop.scheduler.getProtocolProvider(command.layer.protocol);
                return provider.executeCommand(command);
            },
        },
        view: viewer,
    };

    it('add elevation layer', (done) => {
        viewer.addLayer(elevationlayer).then((l) => {
            assert.equal('worldelevation', l.id);
            done();
        });
    });
    const tiles = [];
    const extent = new Extent('EPSG:4326', 5.625, 11.25, 45, 50.625);
    const coord = extent.center();
    it('load elevation texture', (done) => {
        const geom = new THREE.Geometry();
        geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));
        const material = { visible: true };
        const nodeLayer = new MaterialLayer(material, elevationlayer);
        material.getElevationLayer = () => nodeLayer;
        const tile = new TileMesh(geom, material, viewer.tileLayer, extent, 5);
        tile.layerUpdateState[elevationlayer.id] = new LayerUpdateState();
        tiles.push(tile);
        updateLayeredMaterialNodeElevation(context, elevationlayer, tile, {}).then(() => {
            assert.equal(nodeLayer.textures[0].image.data[0], 357.3833923339844);
            done();
        });
    });

    it('get elevation value at with PRECISE_READ_Z', () => {
        const elevation = DEMUtils.getElevationValueAt(viewer.tileLayer, coord, DEMUtils.PRECISE_READ_Z, tiles);
        assert.equal(elevation, 369.72571563720703);
    });

    it('get elevation value at with FAST_READ_Z', () => {
        const elevation = DEMUtils.getElevationValueAt(viewer.tileLayer, coord, DEMUtils.FAST_READ_Z, tiles);
        assert.equal(elevation,  311.4772033691406);
    });

    it('get terrain at with PRECISE_READ_Z', () => {
        const elevation = DEMUtils.getTerrainObjectAt(viewer.tileLayer, coord, DEMUtils.PRECISE_READ_Z, tiles);
        assert.equal(elevation.coord.z, 369.72571563720703);
    });

    it('get terrain at with FAST_READ_Z', () => {
        const elevation = DEMUtils.getTerrainObjectAt(viewer.tileLayer, coord, DEMUtils.FAST_READ_Z, tiles);
        assert.equal(elevation.coord.z,  311.4772033691406);
    });
});

