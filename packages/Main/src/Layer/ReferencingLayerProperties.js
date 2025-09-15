
// next step is move these properties to Style class
function ReferLayerProperties(material, layer) {
    if (layer && layer.isGeometryLayer) {
        material.layer = layer;

        let opacity;
        if (material.uniforms && material.uniforms.opacity != undefined) {
            opacity = material.uniforms.opacity.value;
            Object.defineProperty(material.uniforms.opacity, 'value', {
                get: () => material.layer.opacity * opacity,
                set: (value) => { opacity = value; },
            });
        } else if (material.opacity != undefined) {
            opacity = material.opacity;
            Object.defineProperty(material, 'opacity', {
                get: () => material.layer.opacity * opacity,
                set: (value) => { opacity = value; },
            });
        }

        if (material.uniforms && material.uniforms.mode != undefined) {
            Object.defineProperty(material.uniforms.mode, 'value', {
                get: () => material.layer.pntsMode,
            });
        }

        if (material.uniforms && material.uniforms.shape != undefined) {
            Object.defineProperty(material.uniforms.shape, 'value', {
                get: () => material.layer.pntsShape,
            });
        }

        if (material.uniforms && material.uniforms.sizeMode != undefined) {
            Object.defineProperty(material.uniforms.sizeMode, 'value', {
                get: () => material.layer.pntsSizeMode,
            });
        }

        if (material.uniforms && material.uniforms.minAttenuatedSize != undefined) {
            Object.defineProperty(material.uniforms.minAttenuatedSize, 'value', {
                get: () => material.layer.pntsMinAttenuatedSize,
            });
        }

        if (material.uniforms && material.uniforms.maxAttenuatedSize != undefined) {
            Object.defineProperty(material.uniforms.maxAttenuatedSize, 'value', {
                get: () => material.layer.pntsMaxAttenuatedSize,
            });
        }

        if (material.uniforms && material.uniforms.scale != undefined) {
            Object.defineProperty(material.uniforms.scale, 'value', {
                get: () => material.layer.scale,
            });
        }

        let wireframe = material.wireframe;
        Object.defineProperty(material, 'wireframe', {
            get: () => material.layer.wireframe || wireframe,
            set: (value) => { wireframe = value; },
        });

        let transparent = material.transparent;
        let tPrev = transparent;
        Object.defineProperty(material, 'transparent', {
            get: () => {
                const t = material.layer.opacity < 1.0 || transparent;
                if (t !== tPrev) {
                    material.needsUpdate = true;
                    tPrev = t;
                }
                return t;
            },
            set: (value) => { transparent = value; },
        });
    }

    return material;
}

/**
 * Patches castShadow and receiveShadow on a THREE.Object3D so that they
 * combine the layer value with a local per-object value:
 *   getter returns `layer.<prop> && localValue`
 *   setter stores the local value
 *
 * @param {THREE.Object3D} object3d - The object to patch
 * @param {GeometryLayer} layer - The layer whose shadow properties are combined
 */
export function referShadowProperties(object3d, layer) {
    if (!layer) { return; }

    let _castShadow = true;
    Object.defineProperty(object3d, 'castShadow', {
        get() { return layer.castShadow && _castShadow; },
        set(value) { _castShadow = value; },
        configurable: true,
    });

    let _receiveShadow = true;
    Object.defineProperty(object3d, 'receiveShadow', {
        get() { return layer.receiveShadow && _receiveShadow; },
        set(value) { _receiveShadow = value; },
        configurable: true,
    });
}

export default ReferLayerProperties;
