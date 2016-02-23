#ifdef USE_LOGDEPTHBUF

	uniform float logDepthBufFC;

	#ifdef USE_LOGDEPTHBUF_EXT

		//#extension GL_EXT_frag_depth : enable
		varying float vFragDepth;

	#endif

#endif

const int   TEX_UNITS   = 8;
const float PI          = 3.14159265359;
const float INV_TWO_PI  = 1.0 / (2.0*PI);
const float PI2         = 1.57079632679;
const float PI4         = 0.78539816339;
const float poleSud     = -82.0 / 180.0 * PI;
const float poleNord    =  84.0 / 180.0 * PI;

uniform sampler2D   dTextures_00[1];
uniform sampler2D   dTextures_01[TEX_UNITS];
uniform vec3        pitScale2[TEX_UNITS];
uniform int         RTC;
uniform int         selected;
uniform int         uuid;
uniform int         pickingRender;
uniform int         nbTextures_00;
uniform int         nbTextures_01;
uniform float       distanceFog;
uniform int         debug;
varying vec2        vUv_0;
varying float       vUv_1;
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
const float sLine = 0.002;
#endif
const float borderS = 0.007;
void main() {

    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

    if(pickingRender == 1)
    {
        gl_FragColor =vec4(pos.x,pos.y,pos.z,uuid);

        #if defined(BORDERLINE)

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
        idd             = nbTextures_01 - idd - 1;

        if(nbTextures_01 == idd)
        {
            idd     = nbTextures_01 - 1 ;
            uvO.y   = 0.0;
        }

        #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
        gl_FragColor    = vec4( 0.04, 0.23, 0.35, 1.0);

        float depth = gl_FragDepthEXT / gl_FragCoord.w;
        //float distanceFog = 600000.0;
        //float fog = (distanceFog-depth)/distanceFog; // linear fog

        float fog = 1.0/(exp(depth/distanceFog));

        #else
        float fog = 0.0;
        #endif

        vec4 fogColor = vec4( 0.76, 0.85, 1.0, 1.0);
        float memoY = uvO.y;

        if (0 <= idd && idd < TEX_UNITS)
        {
            vec4 diffuseColor = vec4(0.0,0.0,0.0,0.0);
            // GLSL 1.30 only accepts constant expressions when indexing into arrays,
            // so we have to resort to an if/else cascade.
            if (idd == 0)
            {
                vec3 pit = pitScale2[0];                
                uvO = pitUV(uvO,pit);                                
                diffuseColor = texture2D(dTextures_01[0], uvO);
            }       
            else if (idd == 1) 
            {
                vec3 pit = pitScale2[1];                
                uvO = pitUV(uvO,pit);               
                diffuseColor = texture2D(dTextures_01[1], uvO);
            }
            else if (idd == 2) 
            {
                vec3 pit = pitScale2[2];                
                uvO = pitUV(uvO,pit);
                diffuseColor = texture2D(dTextures_01[2], uvO);
            }
            else if (idd == 3)
            {
                vec3 pit = pitScale2[3];                
                uvO = pitUV(uvO,pit);
                diffuseColor = texture2D(dTextures_01[3], uvO);
            }
            else if (idd == 4) diffuseColor = texture2D(dTextures_01[4], uvO);
            else if (idd == 5) diffuseColor = texture2D(dTextures_01[5], uvO);
            else if (idd == 6) diffuseColor = texture2D(dTextures_01[6], uvO);
            else if (idd == 7) diffuseColor = texture2D(dTextures_01[7], uvO);
            else
                discard;
            if(RTC == 1)
            {
                gl_FragColor = mix(fogColor, diffuseColor, fog );
            }
            else
            {
                gl_FragColor = diffuseColor;
                
            }
        }
    }

    if(debug > 0)
       gl_FragColor = vec4( 1.0, 1.0, 0.0, 1.0);

}
