import * as itowns from 'itowns';
// @ts-expect-error FeatureToolTip imported from import-map
// eslint-disable-next-line import/no-unresolved
import FeatureToolTip from 'FeatureToolTip';
// @ts-expect-error GuiTools imported from import-map
// eslint-disable-next-line import/no-unresolved
import GuiTools from 'GuiTools';

class View {
    id: string;
    view: itowns.View | null;
    viewerDiv: HTMLDivElement | null;
    guiTools: GuiTools | null = null;

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

    getGuiTools() {
        if (!this.guiTools) {
            throw new Error(`guiTools of view '${this.id}' is not defined`);
        }
        return this.guiTools;
    }

    setVisible(visible: boolean) {
        if (!this.viewerDiv) {
            throw new Error('viewerDiv is not defined');
        }

        this.viewerDiv.setAttribute('id', visible ? 'viewerDiv' : this.id);
        this.viewerDiv.style.display = visible ? 'block' : 'none';

        if (visible) {
            FeatureToolTip.init(this.viewerDiv, this.view);
        }
    }

    addLayer(layer: itowns.Layer) {
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

    addLayers(layers: itowns.Layer[]) {
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

    setupUI() {
        this.guiTools = new GuiTools('menuDiv', this.view);
        this.guiTools.gui.hide();
    }
}

export default View;
