class View {
    constructor() {
        this.id = '';
        this.view = null;
        this.viewerDiv = null;
    }

    getId() {
        return this.id;
    }

    setVisible(visible) {
        this.viewerDiv.setAttribute('id', visible ? 'viewerDiv' : this.id);
        this.viewerDiv.style.display = visible ? 'block' : 'none';
    }

    getView() {
        return this.view;
    }
}

export default View;
