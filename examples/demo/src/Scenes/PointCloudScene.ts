import * as itowns from 'itowns';
import View3D from '../Views/View3D';
import { LayerRepository } from '../Repositories/LayerRepository';
import type { SceneType } from '../Types/SceneType';

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
        coord: new itowns.Coordinates('EPSG:4326', 4.860377, 45.760213),
        range: 2000,
        tilt: 45,
        heading: 0,
    },
    layers: [],
    view: new View3D(),
    ready: false,
    onCreate: async () => {
        if (PointCloudScene.ready) {
            return;
        }
        PointCloudScene.view = new View3D();

        const view = PointCloudScene.view.getView();

        PointCloudScene.layers.push(await LayerRepository.orthoLayer.getLayer());
        PointCloudScene.layers.push(await LayerRepository.worldDTMLayer.getLayer());
        PointCloudScene.layers.push(await LayerRepository.ignMntHighResLayer.getLayer());

        await PointCloudScene.view.addLayers(PointCloudScene.layers);

        const source = new itowns.CopcSource({
            url: 'https://data.geopf.fr/telechargement/download/LiDARHD-NUALID/NUALHD_1-0__LAZ_LAMB93_OL_2025-02-20/LHD_FXX_0844_6520_PTS_LAMB93_IGN69.copc.laz',
        });
        const options = {
            mode: 2,
            opacity: 0.5,
        };
        const config = {
            source,
            crs: view.referenceCrs,
            sseThreshold: 4,
            pointBudget: 1000000,
            ...options,
        };
        const pointCloudLayer = new itowns.CopcLayer('PointCloudLayer', config);
        PointCloudScene.layers.push(pointCloudLayer);
        await itowns.View.prototype.addLayer.call(view, pointCloudLayer);

        colorButton.addEventListener('click', () => {
            // @ts-expect-error material.mode undefined
            pointCloudLayer.material.mode = itowns.PNTS_MODE.COLOR;
            colorButton.classList.add('active');
            classificationButton.classList.remove('active');
            view.notifyChange(pointCloudLayer, true);
        });

        classificationButton.addEventListener('click', () => {
            // @ts-expect-error material.mode undefined
            pointCloudLayer.material.mode = itowns.PNTS_MODE.CLASSIFICATION;
            classificationButton.classList.add('active');
            colorButton.classList.remove('active');
            view.notifyChange(pointCloudLayer, true);
        });

        classificationButton.classList.add('active');
        colorButton.classList.remove('active');

        const viewerDiv = PointCloudScene.view.getViewerDiv();
        viewerDiv.appendChild(configContainer);

        PointCloudScene.ready = true;
    },
    onEnter: async () => {
        configContainer.style.display = 'block';
    },
    onExit: async () => {
        configContainer.style.display = 'none';
    },
};
