import * as itowns from 'itowns';
import * as THREE from 'three';
// eslint-disable-next-line import/no-unresolved
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as Layers from '../Layers';
import { View3D } from '../Views';
import type { LayerType, SceneType } from '../Types';
import { BlockEventsIfFromPanel } from '../Utils';
import { BIMLoader } from '../ModelLoaders';

const configContainer = document.createElement('div');
configContainer.id = 'point-cloud-config';

const configText = document.createElement('p');
configText.textContent = 'Instantly switch between rendering styles';
configContainer.appendChild(configText);

const buttonsContainer = document.createElement('div');
buttonsContainer.id = 'point-cloud-buttons';
configContainer.appendChild(buttonsContainer);

const colorButton = document.createElement('button');
colorButton.textContent = 'Color';
buttonsContainer.appendChild(colorButton);

const classificationButton = document.createElement('button');
classificationButton.textContent = 'Classification';
buttonsContainer.appendChild(classificationButton);

export const CombinedDataScene: SceneType = {
    title: 'Combine Your Data',
    description:
        'Visualize multiple data sources together to create rich, layered maps.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 4.860377, 45.760213),
        range: 2500,
        tilt: 35,
        heading: 30,
    },
    layers: [],
    view: undefined,
    meshes: [],
    ready: false,
    getView: () => {
        if (!CombinedDataScene.view) {
            throw new Error('Combined Data Scene view is not initialized');
        }
        return CombinedDataScene.view;
    },
    getItownsView: () => CombinedDataScene.getView().getItownsView(),
    event: function update(/* dt */) {
        const view = CombinedDataScene.getItownsView();
        if (CombinedDataScene.meshes!.length) {
            for (let i = 0; i < CombinedDataScene.meshes!.length; i++) {
                const mesh = CombinedDataScene.meshes![i];
                if (mesh && mesh.scale.z < 1) {
                    mesh.scale.z = Math.min(1.0, mesh.scale.z + 0.005);
                    mesh.updateMatrixWorld(true);
                }
            }
            view.notifyChange(view.camera3D, true);
        }
    },
    onCreate: async () => {
        if (CombinedDataScene.ready) {
            return;
        }
        CombinedDataScene.view = new View3D();

        const view = CombinedDataScene.getItownsView();

        // Set the environment map for all physical materials in the scene.
        // Otherwise, mesh with only diffuse colors will appear black.
        const environment = new RoomEnvironment();
        const pmremGenerator = new THREE.PMREMGenerator(view.renderer);
        view.scene.environment = pmremGenerator.fromScene(environment).texture;
        pmremGenerator.dispose();

        function scaleZ(mesh: THREE.Mesh) {
            mesh.children.forEach((c) => {
                c.scale.z = 0.01;
                CombinedDataScene.meshes!.push(c);
            });
        }

        CombinedDataScene.layers.push(
            await Layers.OrthoFetcherLayer.getLayer(),
        );
        CombinedDataScene.layers.push(
            await Layers.WorldDTMFetcherLayer.getLayer(),
        );
        CombinedDataScene.layers.push(
            await Layers.IgnMntHighResFetcherLayer.getLayer(),
        );
        CombinedDataScene.layers.push(
            await Layers.FlatBuildingsLayer.getLayer(),
        );
        CombinedDataScene.layers.push(await Layers.ParksLayer.getLayer());
        CombinedDataScene.layers.push(
            await Layers.Buildings3dLayer.getLayer(scaleZ),
        );
        CombinedDataScene.layers.push(await Layers.TreesLayer.getLayer());

        await CombinedDataScene.view.addLayers(CombinedDataScene.layers);

        const pointCloudLayer = (await Layers.PointCloudLayer.getLayer(
            view.referenceCrs,
        )) as LayerType as itowns.CopcLayer;
        CombinedDataScene.layers.push(pointCloudLayer);
        await itowns.View.prototype.addLayer.call(view, pointCloudLayer);

        colorButton.addEventListener('click', () => {
            pointCloudLayer.material.mode = itowns.PNTS_MODE.COLOR;
            colorButton.classList.add('active');
            classificationButton.classList.remove('active');
            view.notifyChange(pointCloudLayer, true);
        });

        classificationButton.addEventListener('click', () => {
            pointCloudLayer.material.mode = itowns.PNTS_MODE.CLASSIFICATION;
            classificationButton.classList.add('active');
            colorButton.classList.remove('active');
            view.notifyChange(pointCloudLayer, true);
        });

        classificationButton.classList.add('active');
        colorButton.classList.remove('active');

        const viewerDiv = CombinedDataScene.view.getViewerDiv();
        viewerDiv.appendChild(configContainer);

        BlockEventsIfFromPanel(viewerDiv, configContainer);

        const model = await BIMLoader.getModel();

        model.scale.set(4, 4, 4);

        const coord = new itowns.Coordinates('EPSG:4326', 4.861377, 45.760513);
        coord.z = 175; // elevation offset

        // Position in the view CRS
        model.position.copy(coord.as(view.referenceCrs).toVector3());

        // Align glTF's Y-up to the local ground normal
        model.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            coord.geodesicNormal,
        );

        const rotation = [0, 110, 0];
        const eulerRot = new THREE.Euler(
            THREE.MathUtils.degToRad(rotation[2]),
            -THREE.MathUtils.degToRad(rotation[1]),
            -THREE.MathUtils.degToRad(rotation[0]),
            'ZYX',
        );
        model.quaternion.multiply(
            new THREE.Quaternion().setFromEuler(eulerRot),
        );

        // Notify that the model has been updated
        model.updateMatrixWorld(true);

        CombinedDataScene.meshes?.push(model);

        CombinedDataScene.ready = true;
    },
    onEnter: async () => {
        const view = CombinedDataScene.getItownsView();
        configContainer.style.display = 'block';
        view.scene.add(...CombinedDataScene.meshes!);
        view.addFrameRequester(
            itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER,
            CombinedDataScene.event,
        );
    },
    onExit: async () => {
        const view = CombinedDataScene.getItownsView();
        configContainer.style.display = 'none';
        view.scene.remove(...CombinedDataScene.meshes!);
        view.removeFrameRequester(
            itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER,
            CombinedDataScene.event,
        );
    },
};
