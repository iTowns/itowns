#if USE_DISPLACEMENTMAP
    #include <displacementmap_pars_vertex>

    struct Layer {
        float scale;
        float bias;
        int mode;
        float zmin;
        float zmax;
    };

    uniform Layer       elevationLayer;
    uniform float       geoidHeight;

    highp float decode32(highp vec4 rgba) {
        highp float Sign = 1.0 - step(128.0,rgba[0])*2.0;
        highp float Exponent = 2.0 * mod(rgba[0],128.0) + step(128.0,rgba[1]) - 127.0;
        highp float Mantissa = mod(rgba[1],128.0)*65536.0 + rgba[2]*256.0 +rgba[3] + float(0x800000);
        highp float Result =  Sign * exp2(Exponent) * (Mantissa * exp2(-23.0 ));
        return Result;
    }

    float getElevationMode(vec2 uv, sampler2D tex, int mode) {
        if (mode == ELEVATION_RGBA)
            return decode32(texture(tex, uv).abgr * 255.0);
        if (mode == ELEVATION_DATA || mode == ELEVATION_COLOR)
            return texture(tex, uv).r;
        return 0.;
    }

    float getElevation(Layer layer) {
        vec2 uv = vDisplacementMapUv;
        // Elevation textures are stored top-to-bottom (v=0 at north), flip after offset
        uv.y = 1.0 - uv.y;
        float d = clamp(getElevationMode(uv, displacementMap, layer.mode), layer.zmin, layer.zmax);
        return d * layer.scale + layer.bias;
    }
#endif
