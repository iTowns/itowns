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


uniform sampler2D   dTextures_01[TEX_UNITS];
uniform vec4        offsetScale_L01[TEX_UNITS];

// offset texture | Projection | fx | Opacity
uniform vec4        paramLayers[8];
uniform int         loadedTexturesCount[8];
uniform bool        visibility[8];

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
         if (showOutline && (vUv_WGS84.x < sLine || vUv_WGS84.x > 1.0 - sLine || vUv_WGS84.y < sLine || vUv_WGS84.y > 1.0 - sLine))
             gl_FragColor = CRed;
         else
    #endif
    {
        // Reconstruct PM uv and PM subtexture id (see TileGeometry)
        vec2 uvPM ;
        uvPM.x             = vUv_WGS84.x;
        float y            = vUv_PM;
        int pmSubTextureIndex = int(floor(y));
        uvPM.y             = y - float(pmSubTextureIndex);

        #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
            float depth = gl_FragDepthEXT / gl_FragCoord.w;
        #else
            float depth = gl_FragCoord.z / gl_FragCoord.w;
        #endif

        float fogIntensity = 1.0/(exp(depth/distanceFog));

        vec4 diffuseColor = vec4(noTextureColor, 1.0);
        bool validTexture = false;

        // TODO Optimisation des uv1 peuvent copier pas lignes!!
        for (int layer = 0; layer < 8; layer++) {
            if(layer == colorLayersCount) {
                break;
            }

            if(visibility[layer]) {
                vec4 paramsA = paramLayers[layer];

                if(paramsA.w > 0.0) {
                    bool projWGS84 = paramsA.y == 0.0;
                    int pmTextureCount = int(paramsA.y);
                    int textureIndex = int(paramsA.x) + (projWGS84 ? 0 : pmSubTextureIndex);

                    if (!projWGS84 && pmTextureCount <= pmSubTextureIndex) {
                        continue;
                    }

                    #if defined(DEBUG)
                    if (showOutline && !projWGS84 && (uvPM.x < sLine || uvPM.x > 1.0 - sLine || uvPM.y < sLine || uvPM.y > 1.0 - sLine)) {
                        gl_FragColor = COrange;
                        return;
                    }
                    #endif

                    /* if (0 <= textureIndex && textureIndex < loadedTexturesCount[1]) */ {

                        // TODO: Try other OS before delete dead
                        // get value in array, the index must be constant
                        // Strangely it's work with function returning a global variable, doesn't work on Chrome Windows
                        // vec4 layerColor = texture2D(dTextures_01[getTextureIndex()],  pitUV(projWGS84 ? vUv_WGS84 : uvPM,pitScale_L01[getTextureIndex()]));
                        vec4 layerColor = colorAtIdUv(
                            dTextures_01,
                            offsetScale_L01,
                            textureIndex,
                            projWGS84 ? vUv_WGS84 : uvPM);

                        if (layerColor.a > 0.0 && paramsA.w > 0.0) {
                            validTexture = true;
                            if(paramsA.z > 2.0) {
                                layerColor.rgb /= layerColor.a;
                                layerColor = applyLightColorToInvisibleEffect(layerColor, paramsA.z);
                                layerColor.rgb *= layerColor.a;
                            } else if(paramsA.z > 0.0) {
                                layerColor.rgb /= layerColor.a;
                                layerColor = applyWhiteToInvisibleEffect(layerColor, paramsA.z);
                                layerColor.rgb *= layerColor.a;
                            }

                            // Use premultiplied-alpha blending formula because source textures are either:
                            //     - fully opaque (layer.transparent = false)
                            //     - or use premultiplied alpha (texture.premultiplyAlpha = true)
                            // Note: using material.premultipliedAlpha doesn't make sense since we're manually blending
                            // the multiple colors in the shader.
                            diffuseColor = diffuseColor * (1.0 - layerColor.a * paramsA.w) + layerColor * paramsA.w;
                        }
                    }
                }
            }
        }

        // No texture color
        if (!validTexture) {
            diffuseColor.rgb = noTextureColor;
        }

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
    }
    gl_FragColor.a = opacity;
    #endif
}
