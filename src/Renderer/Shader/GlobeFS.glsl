// BUG CHROME 50 UBUNTU 16.04
// Lose context on compiling shader with too many IF STATEMENT
// runconformance/glsl/bugs/conditional-discard-in-loop.html
// conformance/glsl/bugs/nested-loops-with-break-and-continue.html
// Resolve CHROME unstable 52

const float PI          = 3.14159265359;
const float INV_TWO_PI  = 1.0 / (2.0*PI);
const float PI2         = 1.57079632679;

const float PI4         = 0.78539816339;
const int nbPointsP = 6;
// const float poleSud     = -82.0 / 180.0 * PI;
// const float poleNord    =  84.0 / 180.0 * PI;
const vec4 fogColor = vec4( 0.76, 0.85, 1.0, 1.0);

//uniform sampler2D   dTextures_00[TEX_UNITS];
uniform sampler2D   dTextures_01[TEX_UNITS];
uniform sampler2D   featureTexture;
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
uniform int         RTC;
uniform vec3        lightPosition;
uniform int         lightingOn;
uniform vec4        bbox;
uniform int         rasterFeatures;
uniform int         nbFeatLines;
uniform vec3        lineFeatures[100];
uniform vec3        polygonFeatures[6];

varying vec2        vUv_WGS84;
varying float       vUv_PM;
varying vec3        vNormal;
varying vec4        pos;
varying float       dv;

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

#define resolution vec2(500.0, 500.0)
#define Thickness 0.00001

float drawLine(vec2 p1, vec2 p2, float thickness) {

    vec2 tileWH = vec2(bbox.z - bbox.x, bbox.w - bbox.y);
    vec2 currentCoord = vec2(bbox.x + vUv_WGS84.x * tileWH.x, bbox.y + vUv_WGS84.y * tileWH.y);
    vec2 currentCoordDeg = currentCoord / PI * 180.;

    vec2 uv = currentCoordDeg;// gl_FragCoord.xy / resolution.xy;

    float a = abs(distance(p1, uv));
    float b = abs(distance(p2, uv));
    float c = abs(distance(p1, p2));

    if ( a >= c || b >=  c ) return 0.0;

    float p = (a + b + c) * 0.5;

    // median to (p1, p2) vector
    float h = 2. / c * sqrt( p * ( p - a) * ( p - b) * ( p - c));

    return mix(1.0, 0.0, smoothstep(0.5 * thickness, 1.5 * thickness, h));
}

int intersectsegment(vec2 A, vec2 B, vec2 I, vec2 P){

   vec2 D,E;
   D.x = B.x - A.x;
   D.y = B.y - A.y;
   E.x = P.x - I.x;
   E.y = P.y - I.y;
   float denom = D.x*E.y - D.y*E.x;
   if (denom == 0.)
       return -1;   // erreur, cas limite
   float t = - (A.x*E.y-I.x*E.y-E.x*A.y+E.x*I.y) / denom;
   if (t < 0. || t >= 1.)
      return 0;
   float u = - (-D.x*A.y+D.x*I.y+D.y*A.x-D.y*I.x) / denom;
   if (u < 0. || u >= 1.)
      return 0;
   return 1;
}

// tab is array of polygon poins. nbp length of tab. P is current frag point
bool collision(vec3 tab[6], const int nbp, vec2 P){

  vec2 I = vec2(10.,50.);
  int nbintersections = 0;
  for(int i=0; i < nbPointsP; i++)
  {
     vec2 A = tab[i].xy;
     vec2 B = tab[i+1].xy;
     int iseg = intersectsegment(A,B,I,P); 
     nbintersections += iseg;
  }
     return mod(float(nbintersections),2.) == 0.;
}


float drawLines(float thickness){
    float feat = 0.;
    for( int i= 0; i< 99; ++i){    //  return drawLine(vec2(6.840534210205076,45.92121428068), vec2(6.904134750366209,45.93273669875063));
       // if(i < nbFeatLines)
        if(lineFeatures[i+1].x != 0. && lineFeatures[i+1].y != 0.)
            feat += drawLine(lineFeatures[i].xy, lineFeatures[i+1].xy, thickness);
    }
    return clamp(feat,0.,1.);
}

float drawContourPoly(float thickness){
    float feat = 0.;
    for( int i= 0; i< 6; ++i){
        feat += drawLine(polygonFeatures[i].xy, polygonFeatures[i+1].xy, thickness);
    }
    return clamp(feat,0.,1.);
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

        // No texture color
        if (validTextureCount == 0 ){

            diffuseColor = vec4( 0.04, 0.23, 0.35, 1.0);
        }

        // Selected
        if(selected == 1){
            diffuseColor = mix(vec4( 1.0, 0.3, 0.0, 1.0), diffuseColor, 0.5 );
        }

        // Fog
        if(RTC == 1)
            gl_FragColor = mix(fogColor, diffuseColor, fog );
        else
            gl_FragColor = diffuseColor;

        gl_FragColor.a = 1.0;

        if(lightingOn == 1) {   // Add lighting
            float light = min(2. * dot(vNormal, lightPosition),1.);
            gl_FragColor.rgb *= light;
        }
    }


    if(false/*rasterFeatures == 1*/){
        
        float featureValue, featureOpacity;
        vec4 featureColor;
        // POLYGONS
/*        float featurePolygonOpacity = .5;
        vec4 featurePolygonColor = vec4( 0., 0.71, 0.6, 1.);
        vec2 tileWH = vec2(bbox.z - bbox.x, bbox.w - bbox.y);
        vec2 currentCoord = vec2(bbox.x + vUv_WGS84.x * tileWH.x, bbox.y + vUv_WGS84.y * tileWH.y);
        vec2 currentCoordDeg = currentCoord / PI * 180.;
        bool c = collision( polygonFeatures, nbPointsP, currentCoordDeg);
        if(c) gl_FragColor  = mix(gl_FragColor, featurePolygonColor , featurePolygonOpacity);

        // POLYGONS CONTOURS
        featureValue = drawContourPoly(0.0004); //drawFeatures();
        featureOpacity = 1.;
        featureColor = vec4(0.,0.16,0.31, 1.);
        if(c) gl_FragColor = mix(gl_FragColor, featureColor , featureValue * featureOpacity);
*/
        // LINES
        featureValue = drawLines(0.00005); //drawFeatures();
        featureOpacity = 1.;
        featureColor = vec4(0.,0.16,0.31, 1.);
        gl_FragColor = mix(gl_FragColor, featureColor , featureValue * featureOpacity);

        
    }

    if(debug > 0)
       gl_FragColor = vec4( 1.0, 1.0, 0.0, 1.0);

}