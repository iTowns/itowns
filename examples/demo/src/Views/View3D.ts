import * as itowns from 'itowns';
import View from './View';

class View3D extends View {
    static _instance: View3D;

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

        this.setVisible(false);

        View3D._instance = this;
    }
}

export default View3D;
