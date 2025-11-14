import * as itowns from 'itowns';
import View from '../Views/View.js';

class ImmersiveView extends View {
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
            noControls: true,
            handleCollision: false,
            // Change the subdisvision threshold to get better performances and avoid requesting many unnecessary tiles
            sseSubdivisionThreshold: 10,
        });

        // create Immersive control
        this.view.controls = new itowns.StreetControls(this.view, {
            animationDuration: 50,
        });

        // limit camera far, to increase performance
        this.view.camera3D.far = 10000;
        this.view.camera3D.near = 0.1;

        // open camera fov
        this.view.camera3D.fov = 75;
        this.view.camera3D.updateProjectionMatrix();

        this.setVisible(false);

        ImmersiveView._instance = this;
    }
}

export default ImmersiveView;
