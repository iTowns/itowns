// BUG CHROME 50 UBUNTU 16.04
// Lose context on compiling shader with too many IF STATEMENT
// runconformance/glsl/bugs/conditional-discard-in-loop.html
// conformance/glsl/bugs/nested-loops-with-break-and-continue.html
// Resolve CHROME unstable 52

const vec4 CFog = vec4( 0.76, 0.85, 1.0, 1.0);
const vec4 CWhite = vec4(1.0,1.0,1.0,1.0);
const vec4 CBlueOcean = vec4( 0.04, 0.23, 0.35, 1.0);
const vec4 COrange = vec4( 1.0, 0.3, 0.0, 1.0);
const vec4 CRed = vec4( 1.0, 0.0, 0.0, 1.0);


uniform sampler2D   dTextures_01[TEX_UNITS];
uniform vec3        offsetScale_L01[TEX_UNITS];

// offset texture | Projection | fx | Opacity
uniform vec4        paramLayers[8];
uniform int         loadedTexturesCount[8];
uniform bool        visibility[8];

uniform float       distanceFog;
uniform int         colorLayersCount;
uniform vec3        lightPosition;
uniform float       timing;

// Options global
uniform bool        selected;
uniform bool        lightingEnabled;
uniform vec3        mouse3D;

varying vec2        vUv_WGS84;
varying float       vUv_PM;
varying vec3        vNormal;
varying vec4        pos;
varying float       dist;
varying float       height;
varying float       kindaHeightMouse3D;
varying float       lightIntensity;

#if defined(DEBUG)
    uniform bool showOutline;
    const float sLine = 0.008;
#endif

// Note see after in code
// int textureIndex = 0;
// int getTextureIndex() {
//     return textureIndex;
// }



// 4 connex averaging using weighted (distance parameter)
vec4 AverageColor( sampler2D dTextures[TEX_UNITS],vec3 offsetScale[TEX_UNITS],int id, vec2 uv, float dist){

    float distMax = min(dist/50000., 0.02);
    vec4 cc1 = colorAtIdUv(dTextures, offsetScale, id, vec2(clamp(uv.x + distMax,0.,1.), uv.y));
    vec4 cc2 = colorAtIdUv(dTextures, offsetScale, id, vec2(clamp(uv.x - distMax,0.,1.), uv.y));
    vec4 cc3 = colorAtIdUv(dTextures, offsetScale, id, vec2(uv.x, uv.y + clamp(distMax,0.,1.)));
    vec4 cc4 = colorAtIdUv(dTextures, offsetScale, id, vec2(uv.x, uv.y - clamp(distMax,0.,1.)));

    return (cc1 + cc2 + cc3 + cc4)  / 4.;
}



/*********************** Perlin noise Functions ******************************/

vec3 mod289(vec3 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

// Classic Perlin noise, periodic variant
float pnoise(vec3 P, vec3 rep)
{
  vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period
  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); // Integer part + 1, mod period
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

float turbulence( vec3 p ) {
    float w = 100.0;
    float t = -.5;
    for (float f = 1.0 ; f <= 10.0 ; f++ ){
        float power = pow( 2.0, f );
        t += abs( pnoise( vec3( power * p ), vec3( 10.0, 10.0, 10.0 ) ) / power );
    }
    return t;
}

/************************************************************/

float b; //for clouds noise

void main() {

    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	   gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

    #if defined(DEBUG)
         if (showOutline && (vUv_WGS84.x < sLine || vUv_WGS84.x > 1.0 - sLine || vUv_WGS84.y < sLine || vUv_WGS84.y > 1.0 - sLine))
             gl_FragColor = CRed;
         else
    #endif
    {
        // Reconstruct PM uv and PM subtexture id (see TileGeometry)
        vec2 uvPM ;

        vec4 cc = colorAtIdUv(dTextures_01, offsetScale_L01, 0, vUv_WGS84);
        float t = mod(timing, 1.);
        uvPM.x  = vUv_WGS84.x; //(vUv_WGS84.x > t  ? 2. * t -  vUv_WGS84.x: vUv_WGS84.x);   //0.5 - vUv_WGS84.x + timing / 2.; //mod(vUv_WGS84.x - timing  ,1.); //vUv_WGS84.x ;//mod(vUv_WGS84.x + cc.r * timing /* * lightIntensity*/ ,1.);

        float y            = vUv_PM;
        int pmSubTextureIndex = int(floor(y));
        uvPM.y             = y - float(pmSubTextureIndex);

        #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
            float depth = gl_FragDepthEXT / gl_FragCoord.w;
            float fogIntensity = 1.0/(exp(depth/distanceFog));
        #else
            float fogIntensity = 1.0;
        #endif

        vec4 diffuseColor = CWhite;
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
                    int textureIndex = int(paramsA.x) + (projWGS84 ? 0 : pmSubTextureIndex);

                    /* if (0 <= textureIndex && textureIndex < loadedTexturesCount[1]) */ {

                        // TODO: Try other OS before delete dead
                        // get value in array, the index must be constant
                        // Strangely it's work with function returning a global variable, doesn't work on Chrome Windows
                        // vec4 layerColor = texture2D(dTextures_01[getTextureIndex()],  pitUV(projWGS84 ? vUv_WGS84 : uvPM,pitScale_L01[getTextureIndex()]));
                  /*      vec4 layerColor = colorAtIdUv(
                            dTextures_01,
                            offsetScale_L01,
                            textureIndex,
                            projWGS84 ? vUv_WGS84 : uvPM);
                        
                */
                     // Bokeh effect
                        vec4 layerColor = AverageColor(
                            dTextures_01,
                            offsetScale_L01,
                            textureIndex,
                            projWGS84 ? vUv_WGS84 : uvPM,
                            dist);
                    

                        if (layerColor.a > 0.0) {
                            validTexture = true;
                            float lum = 1.0;

                            if(paramsA.z > 0.0) {
                                float a = max(0.05,1.0 - length(layerColor.xyz-CWhite.xyz));
                                if(paramsA.z > 2.0) {
                                    a = (layerColor.r + layerColor.g + layerColor.b)*0.333333333;
                                    layerColor*= layerColor*layerColor;
                                }
                                lum = 1.0-pow(abs(a),paramsA.z);
                            }

                      /* Dynamic Road highlighting */
                       /*     if(layer == 1) {
                                float currentY = mod(timing * 10., 1.);
                                float distToCurrentY = abs(gl_FragCoord.y / 1094. - currentY);
                                if(distToCurrentY < 0.2) layerColor.a = min(4. * (0.2  - distToCurrentY), 1.); else layerColor.a = 0.;
                                if(layerColor.b > 0.1) layerColor.a = 0.;    
                                if(layerColor.r <0.2 && layerColor.g < 0.2 && layerColor.b < 0.2) layerColor.a = 0.; 
                            }*/
                      /*****************************/
                            diffuseColor = mix( diffuseColor, layerColor, lum*paramsA.w * layerColor.a);
                            
                        }
                    }
                }
    // #if defined(DEBUG)
    //                 else {
    //                     // Invalid texture -> error color
    //                     diffuseColor = vec4(1.0, 0.0, 1.0, 1.0);
    //                 }
    // #endif

            }
        }

        // No texture color
        if (!validTexture) {

            diffuseColor = CBlueOcean;
        }

        // Selected
        if(selected) {
            diffuseColor = mix(COrange, diffuseColor, 0.5 );
        }


    /* NOISE  */

        // get screencords for fun
        vec2 viewportCoord = gl_FragCoord.xy / vec2(1920., 1200.); //ndc is -1 to 1 in GL. scale for 0 to 1

        // get a turbulent 3d noise using the normal, normal to high freq
        //float noise = 1.0 *  -1. * turbulence( .25 * vec3(vUv_WGS84.x,vUv_WGS84.y,vUv_WGS84.x)/*vNormal*/ *1. * mod(timing,1.) * 10.);// normal );
        float noise = 1.0 *  -1. * turbulence( .25 * vec3(viewportCoord.x,viewportCoord.y,viewportCoord.x)/*vNormal*/ *1. * mod(timing,1.) * 10.);// normal );

        // get a 3d noise using the position, low frequency
        // float b = 2.0 * pnoise( /*0.05 * position + */ vVv.x * vec3( 2.0 * timing), vec3( 10.0 ) );
        //b = 2.0 * pnoise( mod(viewportCoord.x  , 1.) +  mod(viewportCoord.y  , 1.) * 1. *  vec3( timing * 5.), vec3( 20. ) );
        b = noise / 2.; //2.0 * pnoise( vUv_WGS84.x * vec3( 2.0 * timing), vec3( 10.0 ) );
        
    /************/
       

        // Fog
        gl_FragColor = mix(CFog, diffuseColor, fogIntensity);

        if(lightingEnabled) {   // Add lighting
            float light = min(2. * dot(vNormal, lightPosition),1.);
            gl_FragColor.rgb *= light;
        }
    }

    if(mouse3D.x != 0.)  {
                if(dist < 1000.) {
                        //    gl_FragColor.rgb -= vec3(dist/1000.,0.,0.);
                         //   float h = mod(height, 10.) < 2. ? 0.5 : 0.;
                     //       if( kindaHeightMouse3D < height) gl_FragColor.xyz -= 0.2;
                     //       if( kindaHeightMouse3D < height + 20. && kindaHeightMouse3D > height - 20.) gl_FragColor.xyz = vec3(0.);
                     //       gl_FragColor.rgb +=  vec3(h, h, h);
                     //       gl_FragColor.rgb += vec3(0.2,0.2,0.2);

                         //    gl_FragColor.rgb += 0.5; 
                }
    }

    //if( mod(height, 100.) > 99.) gl_FragColor.rgb = vec3(0.,1.,0.); 
   // gl_FragColor.rgb *= min(.5 + lightIntensity, 1.);
   // gl_FragColor.rgb -= lightIntensity;
    //gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.,0.,0.), lightIntensity);
    
//  if(pos.y>0.) gl_FragColor.rgb = vec3(0.,1.,0.);

  //   gl_FragColor.rgb -= abs(b);
}