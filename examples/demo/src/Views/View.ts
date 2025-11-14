import * as itowns from 'itowns';

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

    setVisible(visible: boolean) {
        if (!this.viewerDiv) {
            throw new Error('viewerDiv is not defined');
        }

        this.viewerDiv.setAttribute('id', visible ? 'viewerDiv' : this.id);
        this.viewerDiv.style.display = visible ? 'block' : 'none';
    }

    getView() {
        if (!this.view) {
            throw new Error('view is not defined');
        }
        return this.view;
    }

    getViewerDiv() {
        if (!this.viewerDiv) {
            throw new Error('viewerDiv is not defined');
        }
        return this.viewerDiv;
    }
}

export default View;
