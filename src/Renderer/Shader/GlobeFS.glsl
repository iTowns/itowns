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

////////Water/////////////////////////
uniform sampler2D mirrorSampler;
uniform float alpha;
uniform float time;
uniform float distortionScale;
uniform float noiseScale;
uniform sampler2D normalSampler;
uniform vec3 sunColor;
uniform vec3 sunDirection;
uniform vec3 eye;
uniform vec3 waterColor;
//uniform sampler2D maskSampler;


varying vec4 mirrorCoord;
varying vec3 worldPosition;
varying vec3 modelPosition;
varying vec3 surfaceX;
varying vec3 surfaceY;
varying vec3 surfaceZ;
varying vec2 vuv_water;
//////////////////////////////////////


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

///////////Water/////////////////////
void sunLight(const vec3 surfaceNormal, const vec3 eyeDirection, in float shiny, 
                  in float spec, in float diffuse, inout vec3 diffuseColor, inout vec3 specularColor)
{
    vec3 reflection = normalize(reflect(-sunDirection, surfaceNormal));
    float direction = max(0.0, dot(eyeDirection, reflection));
    specularColor += pow(direction, shiny) * sunColor * spec;
    diffuseColor += max(dot(sunDirection, surfaceNormal), 0.0) * sunColor * diffuse;
}

vec3 getNoise(in vec2 uv)
{
    vec2 uv0 = uv / (103.0 * noiseScale) + vec2(time / 17.0, time / 29.0);
    vec2 uv1 = uv / (107.0 * noiseScale) - vec2(time / -19.0, time / 31.0);
    vec2 uv2 = uv / (vec2(8907.0, 9803.0) * noiseScale) + vec2(time / 101.0, time /   97.0);
    vec2 uv3 = uv / (vec2(1091.0, 1027.0) * noiseScale) - vec2(time / 109.0, time / -113.0);
    vec4 noise = texture2D(normalSampler, uv0) +
    texture2D(normalSampler, uv1) +
    texture2D(normalSampler, uv2) +
    texture2D(normalSampler, uv3);
    
    return noise.xyz * 0.5 - 1.0;
}

vec4 createWater(vec3 eye, vec3 worldPosition, vec3 modelPosition,vec3 surfaceX, vec3 surfaceY, vec3 surfaceZ, float distortionScale,
                    vec4 mirrorCoord, sampler2D mirrorSampler, vec3 waterColor, vec3 sunColor, sampler2D maskSampler, vec2 vuv_water, float alpha)



{
    vec3 worldToEye = eye - worldPosition;
    vec3 eyeDirection = normalize(worldToEye);
    vec3 noise = getNoise(modelPosition.xy * 1.0);
    vec3 distordCoord = noise.x * surfaceX + noise.y * surfaceY;
    vec3 distordNormal = distordCoord + surfaceZ;
  
    if(dot(eyeDirection, surfaceZ) < 0.0)
            distordNormal = distordNormal * -1.0;
  
    vec3 diffuseLight = vec3(0.0);
    vec3 specularLight = vec3(0.0);
    
    sunLight(distordNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight);
  
    float distance = length(worldToEye);
    vec2 distortion = distordCoord.xy * distortionScale * sqrt(distance) * 0.07;
    vec3 mirrorDistord = mirrorCoord.xyz + vec3(distortion.x, distortion.y, 1.0);
    
    vec3 reflectionSample = texture2DProj(mirrorSampler, mirrorDistord).xyz;
    
    float theta = max(dot(eyeDirection, distordNormal), 0.0);
    float reflectance = 0.3 + (1.0 - 0.3) * pow((1.0 - theta), 3.0);
    vec3 scatter = max(0.0, dot(distordNormal, eyeDirection)) * waterColor;
    vec3 albedo = mix(sunColor * diffuseLight * 0.3 + scatter, (vec3(0.1) + reflectionSample * 0.9 + reflectionSample * specularLight), reflectance);
    
    vec4 cm = texture2D(maskSampler, vuv_water);
    
    vec3 outgoingLight = albedo;
    return mix( vec4( outgoingLight, alpha ), vec4(1.0, 1.0,1.0,1.0), cm.r );
}

////////////////////////////////////


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

                    if (layerColor.a > 0.0) {
                        validTextureCount++;
                        float lum = 1.0;

                        if(paramsB.x > 0.0) {
                            vec3 white = vec3(1.0,1.0,1.0);
                            vec3 coul = vec3(layerColor.xyz);
                            float a = 1.0 - length(coul-white);
                            a =  max(a,0.05);
                            if(paramsB.x > 2.0) {
                                a = (layerColor.r + layerColor.g + layerColor.b)/3.0;
                                layerColor*= layerColor*layerColor;
                            }
                            
                            if(paramsB.x == -1.0){
                                layerColor*= createWater(vec3 eye, vec3 worldPosition, vec3 modelPosition,vec3 surfaceX, vec3 surfaceY, vec3 surfaceZ, float distortionScale,
                                                             vec4 mirrorCoord, sampler2D mirrorSampler, vec3 waterColor, vec3 sunColor, sampler2D layerColor, vec2 vuv_water, float alpha);
                            }

                            lum = 1.0-pow(abs(a),paramsB.x);
                        }

                        diffuseColor = mix( diffuseColor,layerColor, lum*params.w * layerColor.a);
                    }
                }
#if defined(DEBUG)
                else {
                    // Invalid texture -> error color
                    diffuseColor = vec4(1.0, 0.0, 1.0, 1.0);
                }
#endif

            }

        }

        if (validTextureCount > 0) {

            if(selected == 1){
                diffuseColor = mix(vec4( 1.0, 0.3, 0.0, 1.0), diffuseColor, 0.5 );
            }

            gl_FragColor = RTC == 1 ? mix(fogColor, diffuseColor, fog ) : diffuseColor;


        } else {
            gl_FragColor = vec4( 0.04, 0.23, 0.35, 1.0);
        }

        gl_FragColor.a = 1.0;

        if(lightingOn == 1) {   // Add lighting
            float light = min(2. * dot(vNormal, lightPosition),1.);
            gl_FragColor.rgb *= light;
        }
    }

    if(debug > 0)
       gl_FragColor = vec4( 1.0, 1.0, 0.0, 1.0);

}
