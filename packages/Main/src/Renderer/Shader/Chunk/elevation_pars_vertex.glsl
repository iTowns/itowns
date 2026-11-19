#if NUM_VS_TEXTURES > 0
    struct Layer {
        float scale;
        float bias;
        int mode;
        float zmin;
        float zmax;
    };

    uniform Layer       elevationLayers[NUM_VS_TEXTURES];
    uniform sampler2DArray   elevationTextures;
    uniform vec4        elevationOffsetScales[NUM_VS_TEXTURES];
    uniform int         elevationTextureCount;
    uniform float       geoidHeight;

    float getElevationMode(vec2 uv, sampler2DArray tex, int mode) {
        if (mode == ELEVATION_RGBA)
            return -10000.0 + dot(texture(tex, vec3(uv, 0.0)).rgb * 255.0, vec3(65536.0, 256.0, 1.0)) * 0.1;
        if (mode == ELEVATION_DATA || mode == ELEVATION_COLOR)
            return texture(tex, vec3(uv, 0.0)).r;
        return 0.;
    }

    float getElevation(vec2 uv, sampler2DArray tex, vec4 offsetScale, Layer layer) {
        // Elevation textures are inverted along the y-axis
        uv = vec2(uv.x, 1.0 - uv.y);
        uv = uv * offsetScale.zw + offsetScale.xy;
        float d = clamp(getElevationMode(uv, tex, layer.mode), layer.zmin, layer.zmax);
        return d * layer.scale + layer.bias;
    }
#endif
