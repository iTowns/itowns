import * as itowns from 'itowns';
// @ts-expect-error setupLoadingScreen imported from import-map
// eslint-disable-next-line import/no-unresolved
import setupLoadingScreen from 'LoadingScreen';
import View from './View';

class ImmersiveView extends View {
    static _instance: ImmersiveView | undefined;

    constructor() {
        super();
        this.id = 'ImmersiveView';

        if (ImmersiveView._instance) {
            return ImmersiveView._instance;
        }

        const div = document.createElement('div');
        this.viewerDiv = document.body.appendChild(div);
        this.viewerDiv.setAttribute('id', 'viewerDiv');

        const placement = {
            coord: new itowns.Coordinates('EPSG:4326', 2.33481381, 48.85060296),
            range: 25,
        };

        this.view = new itowns.GlobeView(this.viewerDiv, placement, {
            // @ts-expect-error noControls property undefined
            noControls: true,
            handleCollision: false,
            // Change the subdisvision threshold to get better performances
            // and avoid requesting many unnecessary tiles
            sseSubdivisionThreshold: 10,
        });

        // create Immersive control
        // @ts-expect-error controls property requires more parameters
        this.view.controls = new itowns.StreetControls(this.view, {
            // @ts-expect-error animationDuration property undefined
            animationDuration: 50,
        });

        // limit camera far, to increase performance
        // @ts-expect-error camera3D far property undefined
        this.view.camera3D.far = 10000;
        // @ts-expect-error camera3D near property undefined
        this.view.camera3D.near = 0.1;

        // open camera fov
        // @ts-expect-error camera3D fov property undefined
        this.view.camera3D.fov = 75;
        // @ts-expect-error camera3D updateProjectionMatrix method undefined
        this.view.camera3D.updateProjectionMatrix();

        const view = this.view as itowns.GlobeView & { skyManager: { enabled: boolean } };
        if (view.skyManager && view.skyManager.enabled) {
            view.skyManager.enabled = false;
        }

        setupLoadingScreen(this.viewerDiv, view);

        this.setVisible(false);

        ImmersiveView._instance = this;
    }

    clearInstance() {
        if (!ImmersiveView._instance) {
            return;
        }

        try {
            ImmersiveView._instance.view!.dispose();
        } catch (e) {
            console.error('Error disposing ImmersiveView instance:', e);
        }
        const div = ImmersiveView._instance.getViewerDiv();
        if (div.parentNode) {
            div.parentNode.removeChild(div);
        }
        ImmersiveView._instance = undefined;
    }
}

export default ImmersiveView;
