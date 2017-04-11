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
                        vec4 layerColor = colorAtIdUv(
                            dTextures_01,
                            offsetScale_L01,
                            textureIndex,
                            projWGS84 ? vUv_WGS84 : uvPM);
                        
                
                    /* // Bokeh effect
                        vec4 layerColor = AverageColor(
                            dTextures_01,
                            offsetScale_L01,
                            textureIndex,
                            projWGS84 ? vUv_WGS84 : uvPM,
                            dist);
                    */

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
}