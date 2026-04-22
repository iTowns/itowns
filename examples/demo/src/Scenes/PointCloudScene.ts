import * as itowns from 'itowns';
import { View3D } from '../Views';
import * as Layers from '../Layers';
import type { LayerType, SceneType } from '../Types';
import { BlockEventsIfFromPanel } from '../Utils';

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

export const PointCloudScene: SceneType = {
    title: 'Handle Billions of Points',
    description: 'Display massive LiDAR datasets with optimized streaming. '
    + 'Supports EPT, COPC, LAS and 3D Tiles with various rendering styles.',
    placement: {
        coord: new itowns.Coordinates('EPSG:4326', 4.85160666022384, 45.76111582920194),
        range: 1000,
        tilt: 14,
        heading: 220,
    },
    layers: [],
    view: undefined,
    ready: false,
    getView: () => {
        if (!PointCloudScene.view) {
            throw new Error('Point Cloud Scene view is not initialized');
        }
        return PointCloudScene.view;
    },
    getItownsView: () => PointCloudScene.getView().getItownsView(),
    onCreate: async () => {
        if (PointCloudScene.ready) {
            return;
        }
        PointCloudScene.view = new View3D();

        const itownsView = PointCloudScene.getItownsView();

        PointCloudScene.layers.push(await Layers.OrthoFetcherLayer.getLayer());
        PointCloudScene.layers.push(await Layers.WorldDTMFetcherLayer.getLayer());
        PointCloudScene.layers.push(await Layers.IgnMntHighResFetcherLayer.getLayer());

        await PointCloudScene.view.addLayers(PointCloudScene.layers);

        const pointCloudLayer = (await Layers.PointCloudLayer.getLayer(itownsView.referenceCrs)) as
            LayerType as itowns.CopcLayer & {
                material: {
                    mode: number,
                },
            };
        PointCloudScene.layers.push(pointCloudLayer);
        await itowns.View.prototype.addLayer.call(itownsView, pointCloudLayer);

        colorButton.addEventListener('click', () => {
            pointCloudLayer.material.mode = itowns.PNTS_MODE.COLOR;
            colorButton.classList.add('active');
            classificationButton.classList.remove('active');
            itownsView.notifyChange(pointCloudLayer, true);
        });

        classificationButton.addEventListener('click', () => {
            pointCloudLayer.material.mode = itowns.PNTS_MODE.CLASSIFICATION;
            classificationButton.classList.add('active');
            colorButton.classList.remove('active');
            itownsView.notifyChange(pointCloudLayer, true);
        });

        pointCloudLayer.material.mode = itowns.PNTS_MODE.COLOR;
        colorButton.classList.add('active');
        classificationButton.classList.remove('active');

        const viewerDiv = PointCloudScene.view.getViewerDiv();
        viewerDiv.appendChild(configContainer);

        BlockEventsIfFromPanel(viewerDiv, configContainer);

        PointCloudScene.ready = true;
    },
    onEnter: async () => {
        configContainer.style.display = 'block';

        const layer = Layers.PointCloudLayer.cachedLayer as itowns.CopcLayer & {
            material: {
                mode: number,
            },
        };
        if (layer.material.mode === itowns.PNTS_MODE.COLOR) {
            classificationButton.classList.remove('active');
            colorButton.classList.add('active');
        } else {
            colorButton.classList.remove('active');
            classificationButton.classList.add('active');
        }
    },
    onExit: async () => {
        configContainer.style.display = 'none';
    },
};
