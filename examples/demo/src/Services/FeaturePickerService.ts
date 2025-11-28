import * as itowns from 'itowns';
import { LayerRepository } from '../Repositories/LayerRepository';
import { LayerPromiseType } from '../Types/LayerPromiseType';
import View3D from '../Views/View3D';

/**
 * FeaturePicker module to handle feature picking on specified layers
 * and display their information in a container.
 */
const FeaturePickerService = {
    mouseDownPos: null as { x: number; y: number } | null,
    // currently, featureGeometryLayer needs to be passed before ColorLayer
    layers: [
        LayerRepository.buildingsLayer3D,
        LayerRepository.parksLayer,
    ] as (LayerPromiseType)[],
    pickingContent: [] as Record<string, unknown>[],
    container: null as HTMLDivElement | null,
    view: null as itowns.GlobeView | null,
    onClick: (event: Event) => {
        if (!(event instanceof MouseEvent)) {
            return;
        }

        if (!FeaturePickerService.view ||
        !FeaturePickerService.layers.length || !FeaturePickerService.container) {
            return;
        }

        // check drag with allowed threshold
        if (!FeaturePickerService.mouseDownPos) {
            return;
        }
        const dx = event.clientX - FeaturePickerService.mouseDownPos.x;
        const dy = event.clientY - FeaturePickerService.mouseDownPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
            return;
        }

        const coords = {
            x: event.clientX,
            y: event.clientY,
        };

        const layerIds = FeaturePickerService.layers.map(layer => layer.id);

        const results = FeaturePickerService.view.pickFeaturesAt(
            coords,
            3,
            ...layerIds,
        );

        FeaturePickerService.pickingContent = [];

        // picking results' properties are named after layer id
        for (const [layerId, featureArray] of Object.entries(results)) {
            if (!featureArray || featureArray.length === 0) {
                continue;
            }

            const layerPromise = FeaturePickerService.layers.find(layer => layer.id === layerId);
            if (!layerPromise || !layerPromise.getPickingInfo) {
                continue;
            }

            // featureProperties structure depends on layer type and data source
            const featureProperties = layerPromise.getPickingInfo(featureArray[0]);

            if (featureProperties) {
                FeaturePickerService.pickingContent.push(featureProperties);
            }
        }

        if (FeaturePickerService.pickingContent.length === 0) {
            FeaturePickerService.container.innerHTML =
                'Click on a feature to display informations.';
            return;
        }

        FeaturePickerService.container.innerHTML = '<h3>Features Info:</h3>';

        for (let i = 0; i < FeaturePickerService.pickingContent.length; i++) {
            const featureProps = FeaturePickerService.pickingContent[i];
            const propH = document.createElement('h4');
            propH.innerHTML = `--- Feature ${i + 1} ---`;
            FeaturePickerService.container!.appendChild(propH);

            for (const [key, value] of Object.entries(featureProps)) {
                const propP = document.createElement('p');
                propP.innerHTML = `<strong>${key}:</strong> ${value}`;
                FeaturePickerService.container!.appendChild(propP);
            }
        }
    },
    onMouseDown: (event: Event) => {
        if (!(event instanceof MouseEvent)) {
            return;
        }
        FeaturePickerService.mouseDownPos = { x: event.clientX, y: event.clientY };
    },
    enable: (view: View3D) => {
        FeaturePickerService.view = view.getView() as itowns.GlobeView;
        const viewerDiv = view.getViewerDiv();

        let container = viewerDiv.querySelector<HTMLDivElement>('#feature-picking-info');

        if (!container) {
            container = document.createElement('div');
            container.id = 'feature-picking-info';
            viewerDiv.appendChild(container);
            viewerDiv.addEventListener('mouseup', FeaturePickerService.onClick);
            viewerDiv.addEventListener('mousedown', FeaturePickerService.onMouseDown);

            // Prevent interaction with the viewer
            // when interacting with the feature info panel
            const blockIfFromPanel = (e: Event) => {
                if (
                    FeaturePickerService.container &&
                    e.target instanceof Node &&
                    FeaturePickerService.container.contains(e.target)
                ) {
                    e.stopImmediatePropagation();
                }
            };
            viewerDiv.addEventListener('pointerdown', blockIfFromPanel, true);
            viewerDiv.addEventListener('pointermove', blockIfFromPanel, true);
            viewerDiv.addEventListener('pointerup', blockIfFromPanel, true);
            viewerDiv.addEventListener('wheel', blockIfFromPanel, true);
        }
        FeaturePickerService.container = container;
        FeaturePickerService.container.innerHTML = 'Click on a feature to display informations.';
    },
};

export default FeaturePickerService;
