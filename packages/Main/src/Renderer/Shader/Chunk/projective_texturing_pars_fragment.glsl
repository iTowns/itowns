uniform sampler2D projectiveTexture[ORIENTED_IMAGES_COUNT];
uniform sampler2D mask[ORIENTED_IMAGES_COUNT];
varying vec4      projectiveTextureCoords[ORIENTED_IMAGES_COUNT];
uniform float     projectiveTextureAlphaBorder;
uniform float     opacity;
uniform bool      boostLight;

struct Distortion {
    vec2 size;
#if USE_DISTORTION
    vec2 pps;
    vec4 polynom;
    vec3 l1l2;
#endif
};

uniform Distortion projectiveTextureDistortion[ORIENTED_IMAGES_COUNT];

float getAlphaBorder(vec2 p)
{
    vec2 d = clamp(projectiveTextureAlphaBorder * min(p, 1. - p), 0., 1.);
    return min(d.x, d.y);
}

#if USE_DISTORTION
void distort(inout vec2 p, vec4 polynom, vec2 pps)
{
    vec2 v = p - pps;
    float v2 = dot(v, v);
    if (v2 > polynom.w) {
        p = vec2(-1.);
    }
    else {
        p += (v2 * (polynom.x + v2 * (polynom.y + v2 * polynom.z) ) ) * v;
    }
}

void distort(inout vec2 p, vec4 polynom, vec3 l1l2, vec2 pps)
{
    if ((l1l2.x == 0.) && (l1l2.y == 0.)) {
        distort(p, polynom, pps);
    } else {
        vec2 AB = (p - pps) / l1l2.z;
        float R = length(AB);
        float lambda = atan(R) / R;
        vec2 ab = lambda * AB;
        float rho2 = dot(ab, ab);
        float r357 = 1. + rho2* (polynom.x + rho2* (polynom.y + rho2 * polynom.z));
        p = pps + l1l2.z * (r357 * ab + vec2(dot(l1l2.xy, ab), l1l2.y * ab.x));
    }
}
#endif

vec4 mixBaseColor(vec4 aColor, vec4 baseColor) {
    #ifdef USE_BASE_MATERIAL
        baseColor.rgb = aColor.a == 1.0 ? aColor.rgb : mix(baseColor, aColor, aColor.a).rgb;
        baseColor.a = min(1.0, aColor.a + baseColor.a);
    #else
        baseColor.rgb += aColor.rgb * aColor.a;
        baseColor.a += aColor.a;
    #endif
    return baseColor;
}

vec4 projectiveTextureColor(vec4 coords, Distortion distortion, sampler2D tex, sampler2D mask, vec4 baseColor) {
    vec3 p = coords.xyz / coords.w;
    if(p.z * p.z < 1.) {
#if USE_DISTORTION
        p.xy *= distortion.size;
        distort(p.xy, distortion.polynom, distortion.l1l2, distortion.pps);
        p.xy /= distortion.size;
#endif

        float d = getAlphaBorder(p.xy) * texture2D(mask, p.xy).r;

        if(d > 0.) {

#if DEBUG_ALPHA_BORDER
        vec3 r = texture2D(tex, p.xy).rgb;
        return mixBaseColor(vec4( r.r * d, r.g, r.b, 1.0), baseColor);
#else
        vec4 color = texture2D(tex, p.xy);
        color.a *= d;
        if (boostLight) {
            return mixBaseColor(vec4(sqrt(color.rgb), color.a), baseColor);
        } else {
            return mixBaseColor(color, baseColor);
        }
#endif

        }
    }
    return mixBaseColor(vec4(0.), baseColor);
}
