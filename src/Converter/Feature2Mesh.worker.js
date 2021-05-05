import * as THREE from 'three';
import PbfParser from 'Parser/PbfParser';
import Feature2Mesh from 'Converter/Feature2Mesh';

let backgroundLayer;

const convert = Feature2Mesh.convert({
    color: (properties) => {
        const style = properties.style;
        if (style.fill.color) {
            return new THREE.Color().set(style.fill.color);
        } else if (style.stroke.color) {
            return new THREE.Color().set(style.stroke.color);
        } else {
            return backgroundLayer;
        }
    },
    altitude: 0,
});

let filter;
let style;
const supportedLayers = [];

addEventListener('message', (e) => {
    const params = e.data;
    if (params.style) {
        style = params.style;
        style.layers.forEach((layer) => {
            if (layer.type === 'background') {
                backgroundLayer = new THREE.Color().set(layer.paint['background-color']);
            } else if (['fill', 'line'].includes(layer.type)) {
                supportedLayers.push(layer);
            }
        });
        filter = supportedLayers;
        postMessage({
            payload: { loaded: true },
            id: e.data.id,
        });

        return;
    }

    params.options.filter = filter;

    PbfParser.parse(params.file, params.options).then((collection) => {
        const mesh = convert(collection, { zoom: params.options.extentSource.zoom });
        if (mesh && mesh.type == 'Group') {
            const mes = mesh.children.map((m) => {
                // m.geometry.computeBoundingSphere();
                m.geometry.boundingSphere = new THREE.Sphere();
                // TODO compute with the dimension of vector tile feature.
                m.geometry.boundingSphere.center.set(2048, 2048, 0);
                m.geometry.boundingSphere.radius = 2900;
                // console.log('m.geometry.boundingSphere', m.geometry.boundingSphere);
                return {
                    type: m.type,
                    color: m.geometry.attributes.color ? m.geometry.attributes.color.array : undefined,
                    position: m.geometry.attributes.position ? m.geometry.attributes.position.array : undefined,
                    index: m.geometry.index ? m.geometry.index.array : undefined,
                    boundingSphere: m.geometry.boundingSphere,
                };
            });

            postMessage({
                payload: {
                    mes,
                    position: collection.position,
                    scale: collection.scale,
                },
                id: e.data.id,
            });
        } else if (mesh) {
            // mesh.geometry.computeBoundingSphere();
            mesh.geometry.boundingSphere = new THREE.Sphere();
            mesh.geometry.boundingSphere.set(2048, 2048, 0);
            mesh.geometry.boundingSphere.radius = 2900;
            const mes = [{
                type: mesh.type,
                color: mesh.geometry.attributes.color.array,
                position: mesh.geometry.attributes.position.array,
                index: mesh.geometry.index ? mesh.geometry.index.array : undefined,
                boundingSphere: mesh.geometry.boundingSphere,
            }];

            postMessage({
                payload: {
                    mes,
                    translation: collection.translation,
                    scale: collection.scale,
                },
                id: e.data.id,
            });
        } else {
            postMessage({
                payload: { mesh: null },
                id: e.data.id,
            });
        }
    });
});
