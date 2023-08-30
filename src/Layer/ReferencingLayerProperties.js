
// next step is move these properties to Style class
// and hide transparent mechanism

function ReferLayerProperties(material, layer) {
    if (layer && layer.isGeometryLayer) {
        let transparent = material.transparent;
        material.layer = layer;

        if (material.uniforms && material.uniforms.opacity != undefined) {
            Object.defineProperty(material.uniforms.opacity, 'value', {
                get: () => material.layer.opacity,
            });
        } else if (material.opacity != undefined) {
            Object.defineProperty(material, 'opacity', {
                get: () => material.layer.opacity,
            });
        }
        if (material.uniforms && material.uniforms.mode != undefined) {
            Object.defineProperty(material.uniforms.mode, 'value', {
                get: () => material.layer.pntsMode,
            });
        }
        if (material.uniforms && material.uniforms.sizeMode != undefined) {
            Object.defineProperty(material.uniforms.sizeMode, 'value', {
                get: () => material.layer.pntsSize,
            });
        }
        if (material.uniforms && material.uniforms.minAttenuateSize != undefined) {
            Object.defineProperty(material.uniforms.minAttenuateSize, 'value', {
                get: () => material.layer.pntsMinAttenuateSize,
            });
        }
        if (material.uniforms && material.uniforms.maxAttenuateSize != undefined) {
            Object.defineProperty(material.uniforms.maxAttenuateSize, 'value', {
                get: () => material.layer.pntsMaxAttenuateSize,
            });
        }

        Object.defineProperty(material, 'wireframe', {
            get: () => material.layer.wireframe,
        });
        Object.defineProperty(material, 'transparent', {
            get: () => {
                if (transparent != material.layer.opacity < 1.0) {
                    material.needsUpdate = true;
                    transparent = material.layer.opacity < 1.0;
                }
                return transparent;
            },
        });
    }

    return material;
}

export default ReferLayerProperties;
