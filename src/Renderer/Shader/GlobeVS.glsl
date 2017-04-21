const float PI          = 3.14159265359;
const float INV_TWO_PI  = 1.0 / (2.0*PI);
const float PI4         = 0.78539816339;
const vec4 CWhite = vec4(1.0,1.0,1.0,1.0);

attribute float     uv_pm;
attribute vec2      uv_wgs84;
attribute vec3      position;
attribute vec3      normal;

/** adddeeeeed for tests purposes only  **/
uniform sampler2D   dTextures_00[1];
uniform sampler2D   dTextures_01[TEX_UNITS];
uniform vec3        offsetScale_L01[TEX_UNITS];
uniform vec4        paramLayers[8];
uniform int         loadedTexturesCount[8];
uniform bool        visibility[8];
uniform int         colorLayersCount;
/*****************************************/

uniform vec3        offsetScale_L00[1];
uniform bool        useRTC;
uniform float       periArcLati;
uniform mat4        mVPMatRTC;

uniform mat4        projectionMatrix;
uniform mat4        modelViewMatrix;
uniform mat4        modelMatrix;
uniform vec3        cameraPosition;

uniform vec3        mouse3D;
uniform float       timing;

varying vec2        vUv_WGS84;
varying float       vUv_PM;
varying vec3        vNormal;
varying vec4        pos;
varying float       dist;
varying float       height;
varying float       kindaHeightMouse3D;
varying float       lightIntensity;

float noise;
vec2    vVv;

highp float decode32(highp vec4 rgba) {
    highp float Sign = 1.0 - step(128.0,rgba[0])*2.0;
    highp float Exponent = 2.0 * mod(rgba[0],128.0) + step(128.0,rgba[1]) - 127.0;
    highp float Mantissa = mod(rgba[1],128.0)*65536.0 + rgba[2]*256.0 +rgba[3] + float(0x800000);
    highp float Result =  Sign * exp2(Exponent) * (Mantissa * exp2(-23.0 ));
    return Result;
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

vec3 rgb2hsv(vec3 c)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}


float getHeightAt(vec2 uv){

    return max(texture2D( dTextures_00[0], uv).w, 0.);
}

// 4 connex averaging using weighted (distance parameter)
vec4 AverageColor( sampler2D dTextures[TEX_UNITS],vec3 offsetScale[TEX_UNITS],int id, vec2 uv, float dist){

    float distMax = min(dist/50000., 0.02);
    vec4 cc1 = colorAtIdUv(dTextures, offsetScale, id, vec2(clamp(uv.x + distMax,0.,1.), uv.y));
    vec4 cc2 = colorAtIdUv(dTextures, offsetScale, id, vec2(clamp(uv.x - distMax,0.,1.), uv.y));
    vec4 cc3 = colorAtIdUv(dTextures, offsetScale, id, vec2(uv.x, uv.y + clamp(distMax,0.,1.)));
    vec4 cc4 = colorAtIdUv(dTextures, offsetScale, id, vec2(uv.x, uv.y - clamp(distMax,0.,1.)));

    return (cc1 + cc2 + cc3 + cc4)  / 4.;
}

//#define RGBA_ELEVATION
float dv;
void main() {

        vUv_WGS84 = uv_wgs84;
        vUv_PM = uv_pm;
        vec2 uvPM ;
        uvPM.x  = vUv_WGS84.x;

        vec4 vPosition;
        mat4 projModelViewMatrix = useRTC ? mVPMatRTC : projectionMatrix * modelViewMatrix;

        /* imagery texture work   */
        float y            = vUv_PM;
        int pmSubTextureIndex = int(floor(y));
        uvPM.y             = y - float(pmSubTextureIndex);


        vec4 diffuseColor = vec4(0.,0.,0.,1.);
        bool validTexture = false;
        vec4 cc = vec4(0.,0.,0.,1.);
        float dist1 = 0.05;
        vec4 featureColor = vec4(0.,0.,0.,1.);
        float featureTree = 0.;
        for (int layer = 0; layer < 8; layer++) {
     
             if(true /*visibility[layer] */) {
                vec4 paramsA = paramLayers[layer];
                if(paramsA.w > 0.0) {
                    bool projWGS84 = paramsA.y == 0.0;
                    int textureIndex = int(paramsA.x) + (projWGS84 ? 0 : pmSubTextureIndex);

                    vec4 layerColor = AverageColor(
                            dTextures_01,
                            offsetScale_L01,
                            textureIndex,
                            projWGS84 ? vUv_WGS84 : uvPM,
                            dist1);
                    featureColor = layerColor; 
                    
                    if (layerColor.a > 0.0 ) {
                        validTexture = true;
                        float lum = 1.0;

                        if( paramsA.z > 0.0  ) {
                            float a = max(0.05,1.0 - length(layerColor.xyz-CWhite.xyz));
                            if(paramsA.z > 2.0) {
                                a = (layerColor.r + layerColor.g + layerColor.b)*0.333333333;
                                layerColor*= layerColor*layerColor;
                            }
                            lum = 1.0-pow(abs(a),paramsA.z);
                        }
                        if(layer == 1) {
                            cc = layerColor;
                            cc.a = 0.;
                                        //  cc.a = 20.;   // for roads
                                        // if(layerColor.b > 0.1) cc.a = 0.;    
                                        //  if(layerColor.r <0.2 && layerColor.g < 0.2 && layerColor.b < 0.2) cc.a = 0.; 

                            
                            // for buildings
                            if(featureColor.a>0.1)
                                cc.a = 10. + (featureColor.r + featureColor.g + featureColor.b) * 4.;
                           // if(featureColor.r >= 0.95 && featureColor.g >= 0.40 && featureColor.g <= 0.55 && featureColor.b >= 0.3  && featureColor.b <= 0.7) cc.a = 14.;   
     
                        }

                         if(layer == 2) {
                            cc = layerColor;
                            cc.a = 0.;
                            // for trees
                            if(featureColor.r >= 0.1 || featureColor.g >= 0.1 || featureColor.b >= 0.1) featureTree = 9. + diffuseColor.r*10. + mod(timing * diffuseColor.g * 100.,5.);   
     
                        }
                        diffuseColor = mix( diffuseColor,layerColor, lum*paramsA.w * layerColor.a);
                    }

                }
            }
        }


        /**************************/

        if(loadedTexturesCount[0] > 0)
        {

            vVv = vec2(
            vUv_WGS84.x * offsetScale_L00[0].z + offsetScale_L00[0].x,
            (1.0 - vUv_WGS84.y) * offsetScale_L00[0].z + offsetScale_L00[0].y);

            dv = getHeightAt(vVv);
            



        // Compute normal from local heightMap
            //float x = viewportCoord.x;
            //float y = viewportCoord.y;
            float dist1 = 1. / 128.;////16.;
            float xP1y = getHeightAt(vec2(vVv.x + dist1, vVv.y));
            float xM1y = getHeightAt(vec2(vVv.x - dist1, vVv.y));
            float xyP1 = getHeightAt(vec2(vVv.x, vVv.y + dist1));
            float xyM1 = getHeightAt(vec2(vVv.x, vVv.y - dist1));
            float dxdz = 1. * (xP1y - xM1y)/2.0;
            float dydz = 1. * (xyP1 - xyM1)/2.0;

            vec3 direction = vec3(abs(dxdz), abs(dydz), 1.0);
            float magnitude = sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
            float magnitude2D = sqrt(direction.x * direction.x + direction.y * direction.y);

            
            vec3 directionNormalized = direction/magnitude;

           // vec3 alpesNeg = vec3(-4491078.446235264, -4500291.881522427, 361203.25638397987);
            vec3 lightDir = vec3(1., 1., 0.);
            lightIntensity =  abs(clamp(dot(directionNormalized, lightDir), -1.0, 1.0));  ////clamp(dot(normalFromDepth, lightDir), 0.0, 1.0);
            
            if(0.008* (abs(dxdz) + abs(dydz)) <0.2) lightIntensity = 0.;
            // lightIntensity = 0.008* (abs(dxdz) + abs(dydz));
            // lightIntensity = 0.01 * (abs(dxdz) + abs(dydz));

    /* NOISE  */

        // get screencords for fun
        vec4 posCenter = projModelViewMatrix *  vec4( position ,1.0 ) ; //projectionMatrix * modelViewMatrix * pos;
        vec3 ndc = posCenter.xyz / posCenter.w; //perspective divide/normalize
        vec2 viewportCoord = ndc.xy * 0.5 + 0.5; //ndc is -1 to 1 in GL. scale for 0 to 1

        // get a turbulent 3d noise using the normal, normal to high freq
        noise = 1.0 *  -.1 * turbulence( .5 * direction);// normal );

        // get a 3d noise using the position, low frequency
                        //  float b = 2.0 * pnoise( /*0.05 * position + */ vVv.x * vec3( 2.0 * timing), vec3( 10.0 ) );
        float b = 2.0 * pnoise( sin( mod(viewportCoord.y  , 1.) * 3.14) /*sin(viewportCoord.y * 3.14)*/ /* * sin(vUv_WGS84.y * 3.14)*/ * 0.2 *  vec3( timing * 5.), vec3( .5 ) );
                        //  float b = 5.0 * pnoise( 0.05 * position + vec3( 2.0 * vVv.x * 10. ), vec3( 100.0 ) );
                        //  float displacement = 0.2 * vUv_WGS84.x * vUv_WGS84.y   * 10. * (- noise + b);
       

/*
        float a = mod(timing,1.); // * 100.;
        float coefDisplacement = 20.;
        vec3 newPosition = position + vec3(cos(vVv.x *3.14)*coefDisplacement,sin(vVv.x *3.14)*coefDisplacement,cos(vVv.x *3.14)*coefDisplacement) * cos(vVv.x *3.14);
        vec3 posT = newPosition; //position * vec3(0,0,0);
        vec3 currentPos = mix(posT, position, a);
*/
    /**********/

            float dvD = dv; //floor(dv / (timing*100.)) * timing *100.;

            vNormal     = normal;
            float jump = abs(mod(timing * 10., 1.) - viewportCoord.y) < 0.2 ? 0.2 - abs(mod(timing * 10., 1.) - viewportCoord.y) : 0.;
            vPosition   = vec4( position +  vNormal  /* * dv */   *  (dv + cc.a + featureTree  /* * jump * 3.*/) , 1.0 );
            height = dv;
        }
        else
            vPosition = vec4( position ,1.0 );


        pos = modelMatrix *  vPosition ;
        // dist = distance(mouse3D, pos.xyz);  // Distance between mouse3D and vertex position
        dist = abs(distance(mouse3D, cameraPosition) - distance(cameraPosition, pos.xyz)); // Distance for 'real' bokeh effect
        

        


  //      if(dist < 1000.) {
            vec3 alpes = vec3(4491078.446235264, 4500291.881522427, -361203.25638397987);
            kindaHeightMouse3D = length(mouse3D) - length(alpes) + 300.;
           // float coef =  1. + (1000. - dist) / 10000.;
            float coef =  1.2;// + (1000. - dist) / 10000.;
           // vPosition   = vec4( position +  vNormal  * dv * displacement /* coef*/ ,1.0 );
            height = dv;

         //   if(height > kindaHeightMouse3D + 20.) vPosition   = vec4( position +  vNormal  * dv * coef ,1.0 );
         //    if(height <  1200.) vPosition   = vec4( position +  vNormal   ,1.0 );
            //vPosition.y += (1000. - dist) / 10.;
  //      }
/*
        if (abs(distance(pos.xyz, cameraPosition)) < 10000.)
            vPosition.y += 0.5* distance(pos.xyz, cameraPosition);
*/

        gl_Position = projModelViewMatrix * vPosition;
        

        #ifdef USE_LOGDEPTHBUF

            gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;

            #ifdef USE_LOGDEPTHBUF_EXT

                vFragDepth = 1.0 + gl_Position.w;

            #else

                gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;

            #endif

        #endif



}
