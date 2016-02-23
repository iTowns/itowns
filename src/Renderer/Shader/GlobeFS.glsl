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
uniform sampler2D   textureNoise;
uniform int         RTC;
uniform int         selected;
uniform int         uuid;
uniform int         pickingRender;
uniform int         nbTextures_00;
uniform int         nbTextures_01;
uniform float       distanceFog;
uniform int         debug;
uniform float       time;
uniform int         animateWater;
uniform float       waterHeight; // above ellipsoid
varying vec2        vUv_0;
varying float       vUv_1;
varying vec2        vVv;
varying vec3        vNormal;
varying vec4        pos;
varying float        dv;

vec3 lightPosition = vec3(10000000.,10000000.,10000000.);

//#define BORDERLINE

#if defined(BORDERLINE)
const float sLine = 0.002;
#endif
const float borderS = 0.007;


// GLSL 1.30 only accepts constant expressions when indexing into arrays,
// so we have to resort to an if/else cascade.
vec4 colorAtIdUv(int id, vec2 uv){

    vec4 diffuseColor;
         if (id == 0) diffuseColor = texture2D(dTextures_01[0], uv);
    else if (id == 1) diffuseColor = texture2D(dTextures_01[1], uv);
    else if (id == 2) diffuseColor = texture2D(dTextures_01[2], uv);
    else if (id == 3) diffuseColor = texture2D(dTextures_01[3], uv);
    else if (id == 4) diffuseColor = texture2D(dTextures_01[4], uv);
    else if (id == 5) diffuseColor = texture2D(dTextures_01[5], uv);
    else if (id == 6) diffuseColor = texture2D(dTextures_01[6], uv);
    else if (id == 7) diffuseColor = texture2D(dTextures_01[7], uv);
    else discard;
        
    return diffuseColor;            
}

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
        vec4 diffuseColor;

        if (0 <= idd && idd < TEX_UNITS)
        {
            diffuseColor = colorAtIdUv(idd,uvO);
            if(RTC == 1)
                gl_FragColor = mix(fogColor, diffuseColor, fog );
            else
                gl_FragColor = diffuseColor;
        }

        if (animateWater ==1){

            //    if(diffuseColor.b> diffuseColor.r && diffuseColor.b> diffuseColor.g || diffuseColor.a  == 0. ||
            //      diffuseColor.r == 1. && diffuseColor.g == 1. && diffuseColor.b == 1.) {   // Water
            
            float dv2  = texture2D(dTextures_00[0], vVv).w;
            if(dv2 <= waterHeight){  //Alti

                float speed = 0.4;
                float noiseScale = 0.5;
                float orignalCoef = 0.6;

                vec2 uvTime =  uvO + vec2( -0.1, .1 ) * mod(time * speed, 1.);	
                vec4 noiseColor = texture2D( textureNoise, uvTime );
                vec2 uvNoise = uvO + noiseScale * uvO * vec2(noiseColor.r, noiseColor.b ); 
                float coefDistCam = (length(cameraPosition.xyz) - 6400000.) / 400000.;

                vec4 color = texture2D( textureNoise, uvNoise); 
                float l = (max(color.r,max(color.g,color.b)) + min(color.r,min(color.g,color.b))) / 2.;
                l *= l*1.5;

                
                orignalCoef = clamp(coefDistCam, 0.4,1.)  ; 
                if(diffuseColor.r == 1. && diffuseColor.g ==1. && diffuseColor.b ==1.) 
                    orignalCoef = -0.1; 
                gl_FragColor =  gl_FragColor * orignalCoef + (1.- orignalCoef) * (texture2D( textureNoise, uvO ) * l + texture2D( textureNoise, uvO ) * 0.5);


                // Specular reflection on water
                // lightPosition = vec3( pos.xyz +  vNormal.xyz  * 1000.);
                vec3 lightDirection = normalize(lightPosition - pos.xyz);
                vec3 normal = normalize(vNormal);
                float materialShininess = 4.;
                float specularLightWeighting = 0.0;

                vec3 eyeDirection = normalize(cameraPosition - pos.xyz);
                vec3 reflectionDirection = reflect(-lightDirection, normal);
                specularLightWeighting = pow(max(dot(reflectionDirection, eyeDirection), 0.0), materialShininess);

                //    gl_FragColor.rgb *= (1. + specularLightWeighting);

               
                    /*
                                            vec2 cPos = -1.0 + 2.0 * uvO;
                                            float cLength = length(cPos);

                                            vec2 uv = uvO +(cPos/cLength)*cos(cLength*12.0-time*4.0)*0.03;
                                            vec3 col = texture2D(textureNoise,uv).xyz;

                                            gl_FragColor = vec4(col,1.0);
                    */
            }
 if(diffuseColor.r == 1. && diffuseColor.g == 1. && diffuseColor.b == 1. || diffuseColor.a  == 0.) gl_FragColor = vec4(.5,0.,0.,1.);
    }

    if(debug > 0)
       gl_FragColor = vec4( 1.0, 1.0, 0.0, 1.0);
   }
}