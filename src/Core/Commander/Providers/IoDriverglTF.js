/**
 * Generated On: 2015-10-5
 * Class: IoDriverglTF
 */

import IoDriver from 'Core/Commander/Providers/IoDriver';
import GltfLoader from 'Renderer/ThreeExtented/GLTFLoader';

function IoDriverglTF() {
    //Constructor
       this.GltfLoader = new GltfLoader();
}

IoDriverglTF.prototype = new IoDriver();

IoDriverglTF.prototype.parseGltf = function (buffer) {
    if (!buffer)
        { throw new Error('Error processing GLTF'); }

    return this.GltfLoader.parse(buffer).then(data => ({
        scene: data.scene
    }));
}

IoDriverglTF.prototype.read = function (url) {
    return fetch(url).then((response) => {
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Error loading ${url}: status ${response.status}`);
        }
        return response.json();
    }).then(buffer => this.parseGltf(buffer));
};

export default IoDriverglTF;
