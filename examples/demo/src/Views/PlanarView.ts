import * as itowns from 'itowns';
// @ts-expect-error setupLoadingScreen imported from import-map
// eslint-disable-next-line import/no-unresolved
import setupLoadingScreen from 'LoadingScreen';
import View from './View';

// store record of instances per extent
const PlanarViewInstances: { [key: string]: PlanarView } = {};

class PlanarView extends View {
    static _instance: PlanarView;

    constructor(extent: itowns.Extent) {
        super();
        this.id = 'PlanarView';

        const extentKey = extent.crs + extent.toString();
        if (PlanarViewInstances[extentKey]) {
            return PlanarViewInstances[extentKey];
        }
        PlanarViewInstances[extentKey] = this;

        const div = document.createElement('div');
        this.viewerDiv = document.body.appendChild(div);
        this.viewerDiv.setAttribute('id', 'viewerDiv');

        this.view = new itowns.PlanarView(this.viewerDiv, extent);

        setupLoadingScreen(this.viewerDiv, this.view);

        this.setupUI();
        this.setVisible(false);

        PlanarView._instance = this;
    }
}

export default PlanarView;
