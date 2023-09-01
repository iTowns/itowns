
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
