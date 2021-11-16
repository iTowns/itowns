struct Layer {
    int textureOffset;
    int crs;
    int effect_type;
    float effect_parameter;
    float opacity;
    bool transparent;
};

#include <itowns/custom_header_colorLayer>

uniform sampler2D   colorTextures[NUM_FS_TEXTURES];
uniform vec4        colorOffsetScales[NUM_FS_TEXTURES];
uniform Layer       colorLayers[NUM_FS_TEXTURES];
uniform int         colorTextureCount;

vec3 uvs[NUM_CRS];

float getBorderDistance(vec2 uv) {
    vec2 p2 = min(uv, 1. -uv);
    return min(p2.x, p2.y);
}

float tolerance = 0.99;

vec4 applyWhiteToInvisibleEffect(vec4 color, float intensity) {
    float a = dot(color.rgb, vec3(0.333333333));
    if (a >= tolerance) {
        color.a *= 1.0 - pow(abs(a), intensity);
    }
    return color;
}

vec4 applyLightColorToInvisibleEffect(vec4 color, float intensity) {
    float a = max(0.05,1. - length(color.xyz - 1.));
    color.a *= 1.0 - pow(abs(a), intensity);
    color.rgb *= color.rgb * color.rgb;
    return color;
}

#if defined(DEBUG)
uniform bool showOutline;
uniform vec3 outlineColors[NUM_CRS];
uniform float outlineWidth;

vec4 getOutlineColor(vec3 outlineColor, vec2 uv) {
    float alpha = 1. - clamp(getBorderDistance(uv) / outlineWidth, 0., 1.);
    return vec4(outlineColor, alpha);
}
#endif

uniform float minBorderDistance;
vec4 getLayerColor(int textureOffset, sampler2D tex, vec4 offsetScale, Layer layer) {
    if ( textureOffset >= colorTextureCount ) return vec4(0);

    vec3 uv;
    // #pragma unroll_loop
    for ( int i = 0; i < NUM_CRS; i ++ ) {
        if ( i == layer.crs ) uv = uvs[ i ];
    }

    float borderDistance = getBorderDistance(uv.xy);
    if (textureOffset != layer.textureOffset + int(uv.z) || borderDistance < minBorderDistance ) return vec4(0);
    vec4 color = texture2D(tex, pitUV(uv.xy, offsetScale));
    if (layer.effect_type == 3) {
        #include <itowns/custom_body_colorLayer>
    } else {
        if (layer.transparent && color.a != 0.0) {
            color.rgb /= color.a;
        }

        if (layer.effect_type == 1) {
            color = applyLightColorToInvisibleEffect(color, layer.effect_parameter);
        } else if (layer.effect_type == 2) {
            color = applyWhiteToInvisibleEffect(color, layer.effect_parameter);
        }
    }
    color.a *= layer.opacity;
    return color;
}
