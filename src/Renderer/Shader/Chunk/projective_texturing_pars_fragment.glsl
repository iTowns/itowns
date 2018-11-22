uniform sampler2D projectiveTexture[NUM_TEXTURES];
varying vec4      projectiveTextureCoords[NUM_TEXTURES];
uniform float     projectiveTextureAlphaBorder;

struct Distortion {
    vec2 size;
#if USE_DISTORTION
    vec2 pps;
    vec4 polynom;
    vec3 l1l2;
#endif
};

uniform Distortion projectiveTextureDistortion[NUM_TEXTURES];

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

vec4 projectiveTextureColor(vec4 coords, Distortion distortion, sampler2D texture)
{
    vec3 p = coords.xyz / coords.w;
    if(p.z * p.z < 1.) {
#if USE_DISTORTION
        p.xy *= distortion.size;
        distort(p.xy, distortion.polynom, distortion.l1l2, distortion.pps);
        p.xy /= distortion.size;
#endif

        float d = getAlphaBorder(p.xy);
        if(d > 0.) {

#if DEBUG_ALPHA_BORDER
            vec3 r = texture2D(texture, p.xy).rgb;
            return vec4( r.r * d, r.g, r.b, 1.0);
#else
            return d * texture2D(texture, p.xy);
#endif

        }
    }
    return vec4(0.);
}
