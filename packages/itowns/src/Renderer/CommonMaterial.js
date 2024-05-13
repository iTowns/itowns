import * as THREE from 'three';

export default {
    setDefineMapping(object, PROPERTY, mapping) {
        Object.keys(mapping).forEach((key) => {
            object.defines[`${PROPERTY}_${key}`] = mapping[key];
        });
    },

    setDefineProperty(object, property, PROPERTY, initValue) {
        object.defines[PROPERTY] = initValue;
        Object.defineProperty(object, property, {
            get: () => object.defines[PROPERTY],
            set: (value) => {
                if (object.defines[PROPERTY] != value) {
                    object.defines[PROPERTY] = value;
                    object.needsUpdate = true;
                }
            },
        });
    },

    setUniformProperty(object, property, initValue) {
        object.uniforms[property] = new THREE.Uniform(initValue);
        Object.defineProperty(object, property, {
            get: () => object.uniforms[property].value,
            set: (value) => {
                if (object.uniforms[property].value != value) {
                    object.uniforms[property].value = value;
                }
            },
        });
    },
};
