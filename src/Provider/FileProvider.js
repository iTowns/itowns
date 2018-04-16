import * as THREE from 'three';
import Feature2Mesh from '../Renderer/ThreeExtended/Feature2Mesh';

function readFile(file, type) {
    return new Promise((resolve, reject) => {
        var fr = new FileReader();
        fr.onload = () => { resolve(fr.result); };
        fr.onerror = () => { fr.abort(); reject(new DOMException('FileReader error.')); };
        if (type === 'arrayBuffer') {
            fr.readAsArrayBuffer(file);
        } else {
            fr.readAsBinaryString(file);
        }
    });
}

function assignLayer(object, layer) {
    if (object) {
        object.layer = layer.id;
        object.layers.set(layer.threejsLayer);
        for (const c of object.children) {
            assignLayer(c, layer);
        }
        return object;
    }
}

export default {
    preprocessDataLayer(layer, view, scheduler) {
        const file = layer.file;
        const parser = layer.parser
            || scheduler.getFormatParser(layer.format)
            || scheduler.getFormatParser(file.type)
            || scheduler.getFormatParser(file.name.split('.').pop().toLowerCase());
        if (!parser)
        {
            throw new Error(`No parser available for file "${file.name}"`);
        }
        var options = layer.options || {};
        options.crs = view.referenceCrs;

        layer.name = layer.name || file.name;
        layer.update = layer.update || (() => {});
        layer.convert = layer.convert ? layer.convert : Feature2Mesh.convert(options);
        layer.object3d = layer.object3d || new THREE.Group();
        layer.threejsLayer = layer.threejsLayer || view.mainLoop.gfxEngine.getUniqueThreejsLayer();

        function addObject(obj) {
            if (obj && !obj.object3d) {
                obj.object3d = layer.convert(obj);
            }
            if (obj && obj.object3d) {
                layer.object3d.add(obj.object3d);
                assignLayer(obj.object3d, layer);
                view.camera.camera3D.layers.enable(layer.threejsLayer);
                view.notifyChange(true);
            } else {
                console.warn(obj, ' has no object3d key');
            }
            return obj;
        }
        return readFile(file, parser.fetchtype).then(content => parser.parse(content, options)).then(addObject);
    },

    executeCommand(/* command */) {},
};
