struct Layer {
    int textureOffset;
    int crs;
    int effect_type;
    float effect_parameter;
    float opacity;
    bool transparent;
};

#include <itowns/custom_header_colorLayer>

uniform sampler2D   map;
uniform vec4        colorOffsetScales;

vec3 uvs[NUM_CRS];

float getBorderDistance(vec2 uv) {
    vec2 p2 = min(uv, 1. -uv);
    return min(p2.x, p2.y);
}

float tolerance = 0.99;

vec4 applyWhiteToInvisibleEffect(vec4 color) {
    float a = dot(color.rgb, vec3(0.333333333));
    if (a >= tolerance) {
        color.a = 0.0;
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
