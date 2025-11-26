import * as itowns from 'itowns';
// @ts-expect-error setupLoadingScreen imported from import-map
// eslint-disable-next-line import/no-unresolved
import setupLoadingScreen from 'LoadingScreen';
import View from './View';
import config from '../Config/config';

class View3D extends View {
    static _instance: View3D | undefined;
    protected atmosphereFrameRequester: (() => void) | undefined;

    constructor() {
        super();
        this.id = 'View3D';

        if (View3D._instance) {
            return View3D._instance;
        }

        const div = document.createElement('div');
        this.viewerDiv = document.body.appendChild(div);
        this.viewerDiv.setAttribute('id', 'viewerDiv');

        const placement = {
            coord: new itowns.Coordinates('EPSG:4326', 2.351323, 48.856712),
            range: 25000000,
        };

        this.view = new itowns.GlobeView(this.viewerDiv, placement);

        setupLoadingScreen(this.viewerDiv, this.view);

        this.atmosphereFrameRequester = () => {
            const view = this.view as itowns.GlobeView;
            view.skyManager.enabled = view.getDistanceFromCamera() > config.ATMOSPHERE_THRESHOLD;
        };
        this.view.addFrameRequester(
            itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER,
            this.atmosphereFrameRequester,
        );
        this.setVisible(false);

        View3D._instance = this;
    }

    clearInstance() {
        if (!View3D._instance) {
            return;
        }

        View3D._instance.view!.removeFrameRequester(
            itowns.MAIN_LOOP_EVENTS.BEFORE_RENDER,
            this.atmosphereFrameRequester,
        );
        try {
            View3D._instance.view!.dispose();
        } catch (e) {
            console.error('Error disposing View3D instance:', e);
        }
        const div = View3D._instance.getViewerDiv();
        if (div.parentNode) {
            div.parentNode.removeChild(div);
        }
        View3D._instance = undefined;
    }
}

export default View3D;
