import * as THREE from 'three';
import assert from 'assert';
import { updateLayeredMaterialNodeImagery } from '../../src/Process/LayeredMaterialNodeProcessing';
import FeatureProcessing from '../../src/Process/FeatureProcessing';
import TileMesh from '../../src/Core/TileMesh';
import Extent from '../../src/Core/Geographic/Extent';
import OBB from '../../src/Renderer/ThreeExtended/OBB';
import LayeredMaterial from '../../src/Renderer/LayeredMaterial';
import DataSourceProvider, { supportedFetchers } from '../../src/Provider/DataSourceProvider';
import TileProvider from '../../src/Provider/TileProvider';
import WMTSSource from '../../src/Source/WMTSSource';
import WMSSource from '../../src/Source/WMSSource';
import WFSSource from '../../src/Source/WFSSource';
import ColorLayer from '../../src/Layer/ColorLayer';
import GeometryLayer from '../../src/Layer/GeometryLayer';
import GlobeLayer from '../../src/Core/Prefab/Globe/GlobeLayer';
import Feature2Mesh from '../../src/Renderer/ThreeExtended/Feature2Mesh';

const holes = require('../data/geojson/holes.geojson.json');

supportedFetchers.set('image/png', () => Promise.resolve(new THREE.Texture()));
supportedFetchers.set('application/json', () => Promise.resolve(holes));


describe('Provide in Sources', function () {
    // Misc var to initialize a TileMesh instance
    const geom = new THREE.Geometry();
    geom.OBB = new OBB(new THREE.Vector3(), new THREE.Vector3(1, 1, 1));

    // Mock scheduler
    const context = {
        view: {
            notifyChange: () => true,
        },
        scheduler: {
            commands: [],
            execute: (cmd) => {
                context.scheduler.commands.push(cmd);
                return new Promise(() => { /* no-op */ });
            },
        },
    };

    const colorlayer = new ColorLayer();
    const globelayer = new GlobeLayer('globe', new THREE.Group());
    const featureLayer = new GeometryLayer('geom', new THREE.Group());
    featureLayer.update = FeatureProcessing.update;
    featureLayer.projection = 'EPSG:4978';
    featureLayer.mergeFeatures = false;
    function extrude() {
        return 5000;
    }

    function color() {
        return new THREE.Color(0xffcc00);
    }

    featureLayer.source = new WFSSource({
        url: 'http://',
        typeName: 'name',
        protocol: 'wms',
        format: 'application/json',
        extent: [-90, 90, -45, 45],
        projection: 'EPSG:4326',
    });

    featureLayer.convert = Feature2Mesh.convert({ color, extrude });
    globelayer.attach(featureLayer);

    context.elevationLayers = [];
    context.colorLayers = [colorlayer];

    beforeEach('reset state', function () {
        // clear commands array
        context.scheduler.commands = [];
    });

    it('should get wmts texture with DataSourceProvider', () => {
        colorlayer.source = new WMTSSource({
            url: 'http://',
            name: 'name',
            protocol: 'wmts',
            format: 'image/png',
            tileMatrixSet: 'WGS84G',
            zoom: {
                min: 0,
                max: 8,
            },
        });
        const zoom = 4;
        const tile = new TileMesh(
            colorlayer,
            geom,
            new LayeredMaterial(),
            new Extent('EPSG:4326', 0, 10, 0, 10),
            zoom);
        tile.material.visible = true;
        tile.parent = { };
        tile.material.indexOfColorLayer = () => 0;
        tile.material.isColorLayerDownscaled = () => true;
        tile.material.getColorLayerLevelById = () => 1;
        tile.material.getLayerTextures = () => [{}];

        updateLayeredMaterialNodeImagery(context, colorlayer, tile);
        updateLayeredMaterialNodeImagery(context, colorlayer, tile);
        DataSourceProvider.executeCommand(context.scheduler.commands[0]).then((textures) => {
            assert.equal(textures[0].coords.zoom, zoom);
            assert.equal(textures[0].coords.row, 7);
            assert.equal(textures[0].coords.col, 16);
        });
    });
    it('should get wms texture with DataSourceProvider', () => {
        colorlayer.source = new WMSSource({
            url: 'http://',
            name: 'name',
            protocol: 'wms',
            format: 'image/png',
            extent: [-90, 90, -45, 45],
            projection: 'EPSG:4326',
            zoom: {
                min: 0,
                max: 8,
            },
        });
        const zoom = 4;
        const tile = new TileMesh(
            colorlayer,
            geom,
            new LayeredMaterial(),
            new Extent('EPSG:4326', 0, 10, 0, 10),
            zoom);
        tile.material.visible = true;
        tile.parent = { material: { indexOfColorLayer: () => 0 } };
        tile.material.indexOfColorLayer = () => 0;
        tile.material.isColorLayerDownscaled = () => true;
        tile.material.getColorLayerLevelById = () => 1;
        tile.material.getLayerTextures = () => [{}];

        updateLayeredMaterialNodeImagery(context, colorlayer, tile, tile.parent);
        updateLayeredMaterialNodeImagery(context, colorlayer, tile, tile.parent);
        DataSourceProvider.executeCommand(context.scheduler.commands[0]).then((textures) => {
            assert.equal(textures[0].coords.zoom, zoom);
            assert.equal(textures[0].coords.west(), tile.extent.west());
            assert.equal(textures[0].coords.east(), tile.extent.east());
            assert.equal(textures[0].coords.north(), tile.extent.north());
            assert.equal(textures[0].coords.south(), tile.extent.south());
        });
    });
    it('should get 4 TileMesh from TileProvider', () => {
        const tile = new TileMesh(
            colorlayer,
            geom,
            new LayeredMaterial(),
            new Extent('EPSG:4326', 0, 10, 0, 10),
            4);
        tile.material.visible = true;
        tile.parent = { pendingSubdivision: false };
        tile.material.isColorLayerLoaded = () => true;
        globelayer.subdivideNode(context, tile);
        TileProvider.executeCommand(context.scheduler.commands[0]).then((tiles) => {
            assert.equal(tiles.length, 4);
            assert.equal(tiles[0].extent.west(), tile.extent.west());
            assert.equal(tiles[0].extent.east(), tile.extent.east() * 0.5);
            assert.equal(tiles[0].extent.north(), tile.extent.north());
            assert.equal(tiles[0].extent.south(), tile.extent.north() * 0.5);
        });
    });
    it('should get 3 meshs with WFS source and DataSourceProvider', () => {
        const tile = new TileMesh(
            colorlayer,
            geom,
            new LayeredMaterial(),
            new Extent('EPSG:4326', 0, 10, 0, 10),
            4);
        tile.material.visible = true;
        tile.parent = { pendingSubdivision: false };
        tile.material.isColorLayerLoaded = () => true;
        featureLayer.mergeFeatures = false;
        featureLayer.update(context, featureLayer, tile);
        DataSourceProvider.executeCommand(context.scheduler.commands[0]).then((features) => {
            assert.equal(features[0].children.length, 3);
        });
    });
    it('should get 1 mesh with WFS source and DataSourceProvider and mergeFeatures == true', () => {
        const tile = new TileMesh(
            colorlayer,
            geom,
            new LayeredMaterial(),
            new Extent('EPSG:4326', -10, 0, 0, 10),
            4);
        tile.material.visible = true;
        tile.parent = { pendingSubdivision: false };
        tile.material.isColorLayerLoaded = () => true;
        featureLayer.mergeFeatures = true;
        featureLayer.update(context, featureLayer, tile);
        DataSourceProvider.executeCommand(context.scheduler.commands[0]).then((features) => {
            assert.equal(features[0].children.length, 0);
        });
    });
});
