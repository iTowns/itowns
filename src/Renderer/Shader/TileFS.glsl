#include <logdepthbuf_pars_fragment>

// BUG CHROME 50 UBUNTU 16.04
// Lose context on compiling shader with too many IF STATEMENT
// runconformance/glsl/bugs/conditional-discard-in-loop.html
// conformance/glsl/bugs/nested-loops-with-break-and-continue.html
// Resolve CHROME unstable 52

const vec4 CFog = vec4( 0.76, 0.85, 1.0, 1.0);
const vec4 CWhite = vec4(1.0,1.0,1.0,1.0);
const vec4 COrange = vec4( 1.0, 0.3, 0.0, 1.0);
const vec4 CRed = vec4( 1.0, 0.0, 0.0, 1.0);

#define MAX_TEXTURE_COUNT_PER_PM_LAYER 4

// Per layer uniforms
uniform vec3        paramLayers[ColorLayersCount];
uniform bool        visibility[ColorLayersCount];
uniform sampler2D   atlasTextures [ColorLayersCount];

INSERT_OFFSET_SCALE_UNIFORMS

uniform float       distanceFog;
uniform int         colorLayersCount;
uniform vec3        lightPosition;

uniform vec3        noTextureColor;

// Options global
uniform bool        selected;
uniform bool        lightingEnabled;

varying vec2        vUv_WGS84;
varying float       vUv_PM;
varying vec3        vNormal;

uniform float opacity;

vec4 applyWhiteToInvisibleEffect(vec4 color, float intensity) {
    float a = (color.r + color.g + color.b) * 0.333333333;
    color.a *= 1.0 - pow(abs(a), intensity);
    return color;
}

vec4 applyLightColorToInvisibleEffect(vec4 color, float intensity) {
    float a = max(0.05,1.0 - length(color.xyz - CWhite.xyz));
    color.a *= 1.0 - pow(abs(a), intensity);
    color.rgb *= color.rgb * color.rgb;
    return color;
}

#if defined(DEBUG)
    uniform bool showOutline;
    const float sLine = 0.008;
#endif

vec4 paramByIndex(vec4 offsetScale[MAX_TEXTURE_COUNT_PER_PM_LAYER], int index) {
REPLACE_PARAM_BY_INDEX
}

vec4 mixLayerColor(vec4 diffuseColor, vec4 layerColor, vec3 layerParams) {
    float lum = 1.0;

    if(layerParams.z > 2.0) {
        layerColor.rgb /= layerColor.a;
        layerColor = applyLightColorToInvisibleEffect(layerColor, layerParams.z);
        layerColor.rgb *= layerColor.a;
    } else if(layerParams.z > 0.0) {
        layerColor.rgb /= layerColor.a;
        layerColor = applyWhiteToInvisibleEffect(layerColor, layerParams.z);
        layerColor.rgb *= layerColor.a;
    }

    return diffuseColor * (1.0 - layerColor.a * layerParams.y) + layerColor * layerParams.y;
}

#if defined(MATTE_ID_MODE) || defined(DEPTH_MODE)
#include <packing>
uniform int  uuid;
#endif

void main() {
    #include <logdepthbuf_fragment>

    #if defined(MATTE_ID_MODE)
        gl_FragColor = packDepthToRGBA(float(uuid) / (256.0 * 256.0 * 256.0));
    #elif defined(DEPTH_MODE)
        #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
            float z = gl_FragDepthEXT ;
        #else
            float z = gl_FragCoord.z;
        #endif
        gl_FragColor = packDepthToRGBA(z);
    #else

    #if defined(DEBUG)
    if (showOutline && (vUv_WGS84.x < sLine || vUv_WGS84.x > 1.0 - sLine || vUv_WGS84.y < sLine || vUv_WGS84.y > 1.0 - sLine)) {
        gl_FragColor = CRed;
        return;
    }
    #endif

    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
        float depth = gl_FragDepthEXT / gl_FragCoord.w;
    #else
        float depth = gl_FragCoord.z / gl_FragCoord.w;
    #endif

    // Reconstruct PM uv and PM subtexture id (see TileGeometry)
    vec2 uvPM ;
    uvPM.x             = vUv_WGS84.x;
    float y            = vUv_PM;
    int pmSubTextureIndex = int(floor(y));
    uvPM.y             = y - float(pmSubTextureIndex);

    float fogIntensity = 1.0/(exp(depth/distanceFog));
    vec4 diffuseColor = vec4(noTextureColor, 1.0);

    // --------------8<----------------------
    REPLACE_COLOR_LAYER
    // --------------8<----------------------

    // Selected
    if(selected) {
        diffuseColor = mix(COrange, diffuseColor, 0.5 );
    }

    // Fog
    gl_FragColor = mix(CFog, diffuseColor, fogIntensity);
    gl_FragColor.a = 1.0;

    if(lightingEnabled) {   // Add lighting
        float light = min(2. * dot(vNormal, lightPosition),1.);
        gl_FragColor.rgb *= light;
    }
    gl_FragColor.a = opacity;
    #endif
}
