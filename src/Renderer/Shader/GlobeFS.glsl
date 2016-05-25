
#version 100

#extension GL_EXT_frag_depth : enable

#define SHADER_NAME ShaderMaterial
#define VERTEX_TEXTURES

precision highp float;
precision highp int;

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

const int   TEX_UNITS   = 8;
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


//#define BORDERLINE

vec2    pitUV(vec2 uvIn, vec3 pit)
{
    vec2  uv;
    uv.x = uvIn.x* pit.z + pit.x;
    uv.y = 1.0 -( (1.0 - uvIn.y) * pit.z + pit.y);

    return uv;
}

#if defined(BORDERLINE)
    const float sLine = 0.008;
#endif
const float borderS = 0.007;

// GLSL 1.30 only accepts constant expressions when indexing into arrays,
// so we have to resort to an if/else cascade.


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
    else return vec4(0.0,0.0,0.0,0.0);

}


 vec4 getParam(int id){

    for (int i = 0; i < 32; ++i)
         if(i == id)
             return paramLayers[i];

}

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

void main() {

    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	   gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

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
        vec2 uvO ;
        uvO.x           = vUv_0.x;
        float y         = vUv_1;
        int idd         = int(floor(y));
        uvO.y           = y - float(idd);
        idd             = nbTextures[1]/nColorLayer - idd - 1; // TODO l'inversion des textures peut etre retirer


        if(nbTextures[1] == idd)
        {
            idd     = nbTextures[1] - 1 ;
            uvO.y   = 0.0;
        }

        gl_FragColor    = vec4( 0.04, 0.23, 0.35, 1.0);

        #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
            float depth = gl_FragDepthEXT / gl_FragCoord.w;
            float fog = 1.0/(exp(depth/distanceFog));
        #else
            float fog = 1.0;
        #endif

        if (0 <= idd && idd < nbTextures[1])
        {

            //vec3 params = getParam(0);
            //int pit = int(params.x);
            //vec4 diffuseColor = colorAtIdUv(dTextures_01,idd+pit, uvO);

            vec4 diffuseColor = colorAtIdUv(dTextures_01,idd, uvO);

            if(nColorLayer>1)
            {
                vec4 params = getParam(1);
                if(params.z == 1.0 && params.w > 0.0)
                    {


                        vec4 diffuseColor2 = colorAtIdUv(dTextures_01,idd+nbTextures[1]/nColorLayer, uvO);


                        float a = (diffuseColor2.r + diffuseColor2.g + diffuseColor2.b)/3.0;

                        float lum = 1.0-pow(a,2.5);

                        diffuseColor2*= diffuseColor2*diffuseColor2;
                        diffuseColor = mix( diffuseColor,diffuseColor2, lum*getParam(1).w);

                        //diffuseColor = diffuseColor*(vv) + diffuseColor2*(1.0-vv);
                    }
            }

            if(RTC == 1)
            {
                //diffuseColor = vec4(diffuseColor.xyz,params.y*diffuseColor.w);
                //gl_FragColor = mix(fogColor, diffuseColor, fog );
                gl_FragColor = diffuseColor;
            }
            else
            {
                 gl_FragColor = diffuseColor;

            }
        }

        if(lightingOn == 1){   // Add lighting
            float light = dot(vNormal, lightPosition); //normalize(pos.xyz)
            gl_FragColor.rgb *= light;
        }
    }

    if(debug > 0)
       gl_FragColor = vec4( 1.0, 1.0, 0.0, 1.0);

}
