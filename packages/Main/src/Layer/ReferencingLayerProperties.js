
// next step is move these properties to Style class
function ReferLayerProperties(material, layer) {
    if (layer && layer.isGeometryLayer) {
        let transparent = material.transparent;
        material.layer = layer;

        const getOpacity = () => {
            const styleOpacity = material.layer.style.fill?.opacity;
            const layerOpacity = material.layer.opacity;
            return styleOpacity ? styleOpacity * layerOpacity : layerOpacity;
        };

        if (material.uniforms && material.uniforms.opacity != undefined) {
            Object.defineProperty(material.uniforms.opacity, 'value', {
                get: () => getOpacity(),
            });
        } else if (material.opacity != undefined) {
            Object.defineProperty(material, 'opacity', {
                get: () => getOpacity(),
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

        Object.defineProperty(material, 'wireframe', {
            get: () => material.layer.wireframe,
        });

        Object.defineProperty(material, 'transparent', {
            get: () => {
                const needTransparency = getOpacity() < 1.0;
                if (transparent != needTransparency) {
                    material.needsUpdate = true;
                    transparent = needTransparency;
                }
                return transparent;
            },
        });
    }

    return material;
}

export default ReferLayerProperties;
