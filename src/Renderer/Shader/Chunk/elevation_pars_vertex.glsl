#if NUM_VS_TEXTURES > 0
    struct Layer {
        float scale;
        float bias;
        int mode;
        float zmin;
        float zmax;
    };

    uniform Layer       elevationLayers[NUM_VS_TEXTURES];
    uniform sampler2D   elevationTextures[NUM_VS_TEXTURES];
    uniform vec4        elevationOffsetScales[NUM_VS_TEXTURES];
    uniform int         elevationTextureCount;

    highp float decode32(highp vec4 rgba) {
        highp float Sign = 1.0 - step(128.0,rgba[0])*2.0;
        highp float Exponent = 2.0 * mod(rgba[0],128.0) + step(128.0,rgba[1]) - 127.0;
        highp float Mantissa = mod(rgba[1],128.0)*65536.0 + rgba[2]*256.0 +rgba[3] + float(0x800000);
        highp float Result =  Sign * exp2(Exponent) * (Mantissa * exp2(-23.0 ));
        return Result;
    }

    float getElevationMode(vec2 uv, sampler2D tex, int mode) {
        if (mode == ELEVATION_RGBA)
            return decode32(texture2D( tex, uv ).abgr * 255.0);
        if (mode == ELEVATION_DATA || mode == ELEVATION_COLOR)
        #if defined(WEBGL2)
            return texture2D( tex, uv ).r;
        #else
            return texture2D( tex, uv ).w;
        #endif
        return 0.;
    }

    float getElevation(vec2 uv, sampler2D tex, vec4 offsetScale, Layer layer) {
        uv = uv * offsetScale.zw + offsetScale.xy;
        float d = getElevationMode(uv, tex, layer.mode);
        if (d < layer.zmin || d > layer.zmax) d = 0.;
        return d * layer.scale + layer.bias;
    }
#endif
