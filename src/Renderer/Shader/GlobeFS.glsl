#define SHADER_NAME ShaderMaterial
#define VERTEX_TEXTURES



#define USE_LOGDEPTHBUF
#define USE_LOGDEPTHBUF_EXT

#ifdef USE_LOGDEPTHBUF

    uniform float logDepthBufFC;

    #ifdef USE_LOGDEPTHBUF_EXT

        //#extension GL_EXT_frag_depth : enable
        varying float vFragDepth;

    #endif

#endif

// BUG CHROME 50 UBUNTU 16.04
// Lose context on compiling shader with too many IF STATEMENT
// runconformance/glsl/bugs/conditional-discard-in-loop.html
// conformance/glsl/bugs/nested-loops-with-break-and-continue.html
// Resolve CHROME unstable 52

const float PI          = 3.14159265359;
const float INV_TWO_PI  = 1.0 / (2.0*PI);
const float PI2         = 1.57079632679;

const float PI4         = 0.78539816339;
// const float poleSud     = -82.0 / 180.0 * PI;
// const float poleNord    =  84.0 / 180.0 * PI;
const vec4 fogColor = vec4( 0.76, 0.85, 1.0, 1.0);

//uniform sampler2D   dTextures_00[TEX_UNITS];
uniform sampler2D   dTextures_01[TEX_UNITS];
uniform vec3        pitScale_L01[TEX_UNITS];

uniform vec4        paramLayers[8];
uniform vec2        paramBLayers[8];
uniform int         layerSequence[8];

uniform int         pickingRender;
uniform int         nbTextures[8];

uniform float       distanceFog;
uniform int         RTC;
uniform int         selected;
uniform int         layerVisible;

uniform int         nColorLayer;
uniform int         uuid;
uniform int         debug;
uniform vec3        lightPosition;
uniform int         lightingOn;

varying vec2        vUv_0;
varying float       vUv_1;
varying vec3        vNormal;
varying vec4        pos;

#if defined(BORDERLINE)
    const float sLine = 0.008;
#endif
const float borderS = 0.007;

// GLSL 1.30 only accepts constant expressions when indexing into arrays,
// so we have to resort to an if/else cascade.

/*
vec4 colorAtIdUv(sampler2D dTextures[TEX_UNITS],int id, vec2 uv){

    // for (int i = 0; i < TEX_UNITS; ++i)
    //     if(i == id)
    //         return texture2D(dTextures[i],  pitUV(uv,pitScale_L01[i]));

    if (id == 0) return texture2D(dTextures[0],  pitUV(uv,pitScale_L01[0]));
    else if (id == 1) return texture2D(dTextures[1],  pitUV(uv,pitScale_L01[1]));
    else if (id == 2) return texture2D(dTextures[2],  pitUV(uv,pitScale_L01[2]));
    else if (id == 3) return texture2D(dTextures[3],  pitUV(uv,pitScale_L01[3]));
    else if (id == 4) return texture2D(dTextures[4],  pitUV(uv,pitScale_L01[4]));
    else if (id == 5) return texture2D(dTextures[5],  pitUV(uv,pitScale_L01[5]));
    else if (id == 6) return texture2D(dTextures[6],  pitUV(uv,pitScale_L01[6]));
    else if (id == 7) return texture2D(dTextures[7],  pitUV(uv,pitScale_L01[7]));
    else if (id == 8) return texture2D(dTextures[8],  pitUV(uv,pitScale_L01[8]));
    else if (id == 9) return texture2D(dTextures[9],  pitUV(uv,pitScale_L01[9]));
    else if (id == 10) return texture2D(dTextures[10],  pitUV(uv,pitScale_L01[10]));
    else if (id == 11) return texture2D(dTextures[11],  pitUV(uv,pitScale_L01[11]));
    else if (id == 12) return texture2D(dTextures[12],  pitUV(uv,pitScale_L01[12]));
    else if (id == 13) return texture2D(dTextures[13],  pitUV(uv,pitScale_L01[13]));
    else if (id == 14) return texture2D(dTextures[14],  pitUV(uv,pitScale_L01[14]));
    //else if (id == 15) return texture2D(dTextures[15],  pitUV(uv,pitScale_L01[15]));
    else return vec4(0.0,0.0,0.0,0.0);

}

*/

const vec4 bitSh = vec4( 256.0 * 256.0 * 256.0, 256.0 * 256.0, 256.0, 1.0 );
const vec4 bitMsk = vec4( 0.0, 1.0 / 256.0, 1.0 / 256.0, 1.0 / 256.0 );

vec4 pack1K ( float depth ) {
    depth /= 100000000.0;
    vec4 res = mod( depth * bitSh * vec4( 255 ), vec4( 256 ) ) / vec4( 255 );
    res -= res.xxyz * bitMsk;
    return res;
}

// float unpack1K ( vec4 color ) {

//     const vec4 bitSh = vec4( 1.0 / ( 256.0 * 256.0 * 256.0 ), 1.0 / ( 256.0 * 256.0 ), 1.0 / 256.0, 1.0 );
//     return dot( color, bitSh ) * 100000000.0;

// }

vec4 getParamLayers(int id)
{

    for (int layer = 0; layer < 8; layer++)
        if(layer == id)
            return paramLayers[layer];

    return vec4(0.0,0.0,0.0,0.0);
}

vec2 getParamBLayers(int id)
{

    for (int layer = 0; layer < 8; layer++)
        if(layer == id)
            return paramBLayers[layer];

    return vec2(0.0,0.0);
}

void main() {

    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	   gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

    gl_FragColor = vec4( 1.0, 0.3, 0.0, 1.0);

    if(pickingRender == 1)
    {

        #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
            float z = 1.0/ gl_FragCoord.w ;
            gl_FragColor = pack1K(z);
        #else
            float z = gl_FragCoord.z / gl_FragCoord.w;
            gl_FragColor = pack1K(z);
        #endif

    }else
    #if defined(BORDERLINE)
         if(vUv_0.x < sLine || vUv_0.x > 1.0 - sLine || vUv_0.y < sLine || vUv_0.y > 1.0 - sLine)
             gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0);
         else
    #endif
    if(selected == 1 && (vUv_0.x < borderS || vUv_0.x > 1.0 - borderS || vUv_0.y < borderS || vUv_0.y > 1.0 - borderS))
        gl_FragColor = vec4( 1.0, 0.3, 0.0, 1.0);
   else
    {
        vec2 uvPM ;
        uvPM.x           = vUv_0.x;
        float y         = vUv_1;
        int idd         = int(floor(y));
        uvPM.y           = y - float(idd);
        vec2 uvWGS84 = vec2(vUv_0.x,1.0-vUv_0.y);

        // if(nbTextures[1] == idd)
        // {
        //     idd     = nbTextures[1] - 1 ;
        //     uvPM.y   = 0.0;
        // }

        gl_FragColor    = vec4( 0.04, 0.23, 0.35, 1.0);

        #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
            float depth = gl_FragDepthEXT / gl_FragCoord.w;
            float fog = 1.0/(exp(depth/distanceFog));
        #else
            float fog = 1.0;
        #endif

        if (0 <= idd && idd < nbTextures[1])
        {

            vec4 params;
            vec2 paramsB;
            int pit;
            bool projWGS84;
            vec4 diffuseColor =  vec4( 1.0, 1.0, 1.0, 1.0);

            // TODO Optimisation des uv1 peuvent copier pas lignes!!
            for (int layer = 0; layer < 8; layer++)
            {


               if(layer == nColorLayer)
                    break;

                params = getParamLayers(layerSequence[layer]);
                paramsB = getParamBLayers(layerSequence[layer]);

                if(params.z == 1.0 && params.w > 0.0)
                {

                        pit = int(params.x);
                        projWGS84 = params.y == 0.0;
                        vec4 layerColor = colorAtIdUv(dTextures_01,pitScale_L01, pit + (projWGS84 ? 0 : idd),projWGS84 ? uvWGS84 : uvPM);
                        float lum = 1.0;

                        if(paramsB.x > 0.0)
                        {
                            vec3 white = vec3(1.0,1.0,1.0);
                            vec3 coul = vec3(layerColor.xyz);
                            float a = 1.0 - length(coul-white);
                            a =  max(a,0.05);
                            if(paramsB.x > 2.0)
                            {
                                a = (layerColor.r + layerColor.g + layerColor.b)/3.0;
                                layerColor*= layerColor*layerColor;
                            }

                            lum = 1.0-pow(abs(a),paramsB.x);
                        }

                        diffuseColor = mix( diffuseColor,layerColor, lum*params.w);
                }

            }

            gl_FragColor = RTC == 1 ? mix(fogColor, diffuseColor, fog ) : diffuseColor;
           // gl_FragColor.a = 1.;
        }

        if(lightingOn == 1){   // Add lighting
            float light = min(2. * dot(vNormal, lightPosition),1.);
            gl_FragColor.rgb *= light;
        }
    }

    if(debug > 0)
       gl_FragColor = vec4( 1.0, 1.0, 0.0, 1.0);

}
