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

uniform int         nbTextures[8];

uniform float       distanceFog;
uniform int         selected;
uniform int         layerVisible;

uniform int         nColorLayer;
uniform int         uuid;
uniform int         debug;
uniform vec3        lightPosition;
uniform int         lightingOn;
uniform float       time;

varying vec2        vUv_WGS84;
varying float       vUv_PM;
varying vec3        vNormal;
varying vec4        pos;

#if defined(DEBUG)
    const float sLine = 0.008;
#endif

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


// Function to detect contour of detection for smooth blending
vec4 smoothContours(vec3 pitScale[TEX_UNITS], int textureInd, vec2 posCar, vec2 posCurrent ){

    vec4 colPosCar     =  colorAtIdUv(dTextures_01, pitScale, textureInd, posCar);
    vec4 colPosCurrent =  colorAtIdUv(dTextures_01, pitScale, textureInd, posCurrent);
    
    vec4 colOut = colPosCar;
    vec4 colM1  = colorAtIdUv(dTextures_01, pitScale, textureInd, vec2(posCar.x -10./256., posCar.y));
    if(colM1.a >=1.) {
        
        colOut = mix (colPosCar, colPosCurrent, 0.5);
    }

    return colOut;
}


void main() {

    #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)

	   gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;

    #endif

    #if defined(DEBUG)
         if(vUv_WGS84.x < sLine || vUv_WGS84.x > 1.0 - sLine || vUv_WGS84.y < sLine || vUv_WGS84.y > 1.0 - sLine)
             gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0);
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
            float fog = 1.0/(exp(depth/distanceFog));
        #else
            float fog = 1.0;
        #endif

        vec4 diffuseColor =  vec4( 1.0, 1.0, 1.0, 1.0);
        int validTextureCount = 0;

        // TODO Optimisation des uv1 peuvent copier pas lignes!!
        for (int layer = 0; layer < 8; layer++) {
           if(layer == nColorLayer) {
                break;
           }

            vec4 params = getParamLayers(layerSequence[layer]);
            vec2 paramsB = getParamBLayers(layerSequence[layer]);

            if(params.z == 1.0 && params.w > 0.0) {
                bool projWGS84 = params.y == 0.0;
                int layerTexturesOffset = int(params.x);
                int textureIndex = layerTexturesOffset + (projWGS84 ? 0 : pmSubTextureIndex);

                if (0 <= textureIndex && textureIndex < nbTextures[1]) {

                    vec4 layerColor = colorAtIdUv(
                        dTextures_01,
                        pitScale_L01,
                        textureIndex,
                        projWGS84 ? vUv_WGS84 : uvPM);

                  //  if (layerColor.a > 0.0) {
                        validTextureCount++;
                        float lum = 1.0;
                        
                                    /*        
                                        if (layerColor.a < 1.0) {
                                            layerColor = colorAtIdUv(
                                                dTextures_01,
                                                pitScale_L01,
                                                textureIndex,
                                                vec2( clamp(uvPM.x + mod(time/100., 1.), 0.,1.), uvPM.y));
                                        }
                                   */

                   
                   float currentTranslation = mod(time/100., 1.);
                /*
                   // Kaleidoscope fun
                   uvPM.x = uvPM.x > currentTranslation ? 1. - uvPM.x : uvPM.x;
                   layerColor = colorAtIdUv(dTextures_01, pitScale_L01, textureIndex, uvPM);
                */

                
                   // Need to know the direction..
                   if(uvPM.y>0.5) currentTranslation = -currentTranslation*1.5;
                   vec2 previousPos = vec2(clamp(uvPM.x + currentTranslation, 0.,1.), uvPM.y);
                   vec4 colPrevPos =  colorAtIdUv(dTextures_01, pitScale_L01, textureIndex, previousPos);
                   vec4 currentColor = colorAtIdUv(dTextures_01, pitScale_L01, textureIndex, uvPM);

                   if (colPrevPos.a < 1.0) { // was car -> draw car  // Need opacity smooth with contour
                                // layerColor = colPrevPos; //vec4(1.,0.,0.,0.5);
                       layerColor = smoothContours(pitScale_L01, textureIndex, previousPos, uvPM);
                   }else
                        if (currentColor.a < 1.0) {  // is car -> needs inpainting
                            layerColor = colorAtIdUv(dTextures_01, pitScale_L01, textureIndex, vec2(uvPM.x+0.2,uvPM.y));
                   }
 
              

                        if(paramsB.x > 0.0) {
                            vec3 white = vec3(1.0,1.0,1.0);
                            vec3 coul = vec3(layerColor.xyz);
                            float a = 1.0 - length(coul-white);
                            a =  max(a,0.05);
                            if(paramsB.x > 2.0) {
                                a = (layerColor.r + layerColor.g + layerColor.b)/3.0;
                                layerColor*= layerColor*layerColor;
                            }

                            lum = 1.0-pow(abs(a),paramsB.x);
                        }

                        diffuseColor = mix( diffuseColor, layerColor, 1.);//lum*params.w );//* layerColor.a);

                        

                      //  diffuseColor.a = 1.;
                 //   }
                }
#if defined(DEBUG)
                else {
                    // Invalid texture -> error color
                    diffuseColor = vec4(1.0, 0.0, 1.0, 1.0);
                }
#endif

            }

        }

        // No texture color
        if (validTextureCount == 0 ){

            diffuseColor = vec4( 0.04, 0.23, 0.35, 1.0);
        }

        // Selected
        if(selected == 1){
            diffuseColor = mix(vec4( 1.0, 0.3, 0.0, 1.0), diffuseColor, 0.5 );
        }

        // Fog
        gl_FragColor = mix(fogColor, diffuseColor, fog );

        gl_FragColor.a = 1.0;

        if(lightingOn == 1) {   // Add lighting
            float light = min(2. * dot(vNormal, lightPosition),1.);
            gl_FragColor.rgb *= light;
        }
    }

    if(debug > 0)
       gl_FragColor = vec4( 1.0, 1.0, 0.0, 1.0);

}
