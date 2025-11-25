import * as itowns from 'itowns';
// @ts-expect-error setupLoadingScreen imported from import-map
// eslint-disable-next-line import/no-unresolved
import setupLoadingScreen from 'LoadingScreen';
import View from './View';

// store record of instances per extent
const PlanarViewInstances: { [key: string]: PlanarView } = {};

class PlanarView extends View {
    extentKey: string;

    constructor(extent: itowns.Extent) {
        super();
        this.id = 'PlanarView';
        this.extentKey = extent.crs + extent.toString();

        if (PlanarViewInstances[this.extentKey]) {
            return PlanarViewInstances[this.extentKey];
        }
        PlanarViewInstances[this.extentKey] = this;

        const div = document.createElement('div');
        this.viewerDiv = document.body.appendChild(div);
        this.viewerDiv.setAttribute('id', 'viewerDiv');

        this.view = new itowns.PlanarView(this.viewerDiv, extent);

        setupLoadingScreen(this.viewerDiv, this.view);

        this.setVisible(false);
    }

    override setVisible(visible: boolean) {
        if (!this.viewerDiv) {
            throw new Error('viewerDiv is not defined');
        }

        this.viewerDiv.setAttribute('id', visible ? 'viewerDiv' : this.id + this.extentKey);
        this.viewerDiv.style.display = visible ? 'block' : 'none';
    }

    clearInstance() {
        for (const key of Object.keys(PlanarViewInstances)) {
            const instance = PlanarViewInstances[key];
            try {
                instance.view!.dispose();
            } catch (e) {
                console.error('Error disposing PlanarView instance:', e);
            }
            const div = instance.getViewerDiv();
            if (div.parentNode) {
                div.parentNode.removeChild(div);
            }
            delete PlanarViewInstances[key];
        }
    }
}

export default PlanarView;
