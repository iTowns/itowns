import * as itowns from 'itowns';
// @ts-expect-error setupLoadingScreen imported from import-map
// eslint-disable-next-line import/no-unresolved
import setupLoadingScreen from 'LoadingScreen';
import View from './View';

class PlanarView extends View {
    static _instance: PlanarView;
    controls: itowns.PlanarControls | null;

    constructor() {
        super();
        this.id = 'PlanarView';
        this.controls = null;

        if (PlanarView._instance) {
            return PlanarView._instance;
        }


        const div = document.createElement('div');
        this.viewerDiv = document.body.appendChild(div);
        this.viewerDiv.setAttribute('id', 'viewerDiv');

        this.view = new itowns.View('EPSG:4326', this.viewerDiv);
        this.controls = new itowns.PlanarControls(this.view);

        this.view.mainLoop.gfxEngine.renderer.setClearColor(0xdddddd);

        this.setVisible(false);

        setupLoadingScreen(this.viewerDiv, this.view);

        PlanarView._instance = this;
    }

    getControls(): itowns.PlanarControls {
        if (!this.controls) {
            throw new Error('PlanarView controls undefined');
        }
        return this.controls;
    }
}

export default PlanarView;
