import * as itowns from 'itowns';
import View from './View';

class PointCloudView extends View {
    static _instance: PointCloudView;
    controls: itowns.PlanarControls | null;

    constructor() {
        super();
        this.id = 'PointCloudView';
        this.controls = null;

        if (PointCloudView._instance) {
            return PointCloudView._instance;
        }


        const div = document.createElement('div');
        this.viewerDiv = document.body.appendChild(div);
        this.viewerDiv.setAttribute('id', 'viewerDiv');

        this.view = new itowns.View('EPSG:4326', this.viewerDiv);
        this.controls = new itowns.PlanarControls(this.view);

        this.view.mainLoop.gfxEngine.renderer.setClearColor(0xdddddd);

        this.setVisible(false);

        PointCloudView._instance = this;
    }

    getControls(): itowns.PlanarControls {
        if (!this.controls) {
            throw new Error('PointCloudView controls undefined');
        }
        return this.controls;
    }
}

export default PointCloudView;
