import * as itowns from 'itowns';
import type { LayerType } from '../Types/LayerType';

class View {
    id: string;
    view: itowns.View | null;
    viewerDiv: HTMLDivElement | null;

    constructor() {
        this.id = '';
        this.view = null;
        this.viewerDiv = null;
    }

    getId() {
        return this.id;
    }

    getView() {
        if (!this.view) {
            throw new Error(`view '${this.id}' is not defined`);
        }
        return this.view;
    }

    getViewerDiv() {
        if (!this.viewerDiv) {
            throw new Error(`viewerDiv of view '${this.id}' is not defined`);
        }
        return this.viewerDiv;
    }

    setVisible(visible: boolean) {
        if (!this.viewerDiv) {
            throw new Error('viewerDiv is not defined');
        }

        this.viewerDiv.setAttribute('id', visible ? 'viewerDiv' : this.id);
        this.viewerDiv.style.display = visible ? 'block' : 'none';
    }

    addLayer(layer: LayerType) {
        if (!this.view) {
            throw new Error(`view '${this.id}' is not defined`);
        }

        if (this.view.getLayerById(layer.id)) {
            return Promise.resolve();
        }

        try {
            return this.view.addLayer(layer);
        } catch (error) {
            console.error(`Error adding layer '${layer.id}' to view '${this.id}':`, error);
        }
    }

    addLayers(layers: LayerType[]) {
        if (!this.view) {
            throw new Error(`view '${this.id}' is not defined`);
        }

        const layerPromises = layers.map(async (layer) => {
            if (this.view!.getLayerById(layer.id)) {
                return Promise.resolve();
            }
            try {
                return await this.view!.addLayer(layer);
            } catch (error) {
                console.error(`Error adding layer '${layer.id}' to view '${this.id}':`, error);
            }
        });

        return Promise.all(layerPromises);
    }
}

export default View;
