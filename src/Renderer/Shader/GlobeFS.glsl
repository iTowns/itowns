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
uniform sampler2D   dTextures_00[1];
uniform sampler2D   dTextures_01[TEX_UNITS];
uniform sampler2D   effectTexture;
uniform sampler2D   cloudsTexture;
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
uniform int         sunOn;
uniform vec3        sunPosition;
uniform float       elevationEffectOn; 
uniform float       heightMapEffectOn;
uniform float       fogEffectOn;
uniform float       fireOn;
uniform float       diffractionOn;
uniform float       hideSea;
uniform float       time;
uniform float       slide;


varying vec2        vUv_WGS84;
varying float       vUv_PM;
varying vec3        vNormal;
varying vec4        pos;
varying float       altitude;
varying vec2        vVv;

const vec3 islandCenter = vec3(3370247.4958533593, -2284640.7292576847, -4912345.35489408);
//const vec4 fogColor = vec4(0.94, 0.9, 0.8, 1.);

vec2 iResolution = vec2(1920., 1080.);

#if defined(DEBUG)
    const float sLine = 0.008;
#endif



// Shader effects functions ************************************************


// rendering params
const float sphsize=.7; // planet size
const float dist=.27; // distance for glow and distortion
const float perturb=.3; // distortion amount of the flow around the planet
const float displacement=.015; // hot air effect
const float windspeed=.4; // speed of wind flow
const float steps=110.; // number of steps for the volumetric rendering
const float stepsize=.025; 
const float brightness=.43;
const vec3 planetcolor=vec3(0.55,0.4,0.3);
const float fade=.005; //fade by distance
const float glow=3.5; // glow amount, mainly on hit side


// fractal params
const int iterations=13; 
const float fractparam=.7;
const vec3 offset=vec3(1.5,2.,-1.5);


float wind(vec3 p) {
        float iGlobalTime = time / 1000.;
	float d=max(0.,dist-max(0.,length(p)-sphsize)/sphsize)/dist; // for distortion and glow area
	float x=max(0.2,p.x*2.); // to increase glow on left side
	p.y*=1.+max(0.,-p.x-sphsize*.25)*1.5; // left side distortion (cheesy)
	p-=d*normalize(p)*perturb; // spheric distortion of flow
	p+=vec3(iGlobalTime*windspeed,0.,0.); // flow movement
	p=abs(fract((p+offset)*.1)-.5); // tile folding 
	for (int i=0; i<iterations; i++) {  
		p=abs(p)/dot(p,p)-fractparam; // the magic formula for the hot flow
	}
	return length(p)*(1.+d*glow*x)+d*glow*x; // return the result with glow applied
}

vec4 fire( vec2 fragCoord)
{
        float iGlobalTime = time / 200.;
	// get ray dir	
	vec2 uv = fragCoord.xy / iResolution.xy-.5;
	vec3 dir=vec3(uv,1.);
	dir.x*=iResolution.x/iResolution.y;
	vec3 from=vec3(0.,0.,-2.+texture2D(effectTexture,uv*.5+iGlobalTime).x*stepsize); //from+dither

	// volumetric rendering
	float v=0., l=-0.0001, t=iGlobalTime*windspeed*.2;
	for (float r=10.;r<steps;r++) {
		vec3 p=from+r*dir*stepsize;
		float tx=texture2D(effectTexture,uv*.2+vec2(t,0.)).x*displacement; // hot air effect
		if (length(p)-sphsize-tx>0.)
		// outside planet, accumulate values as ray goes, applying distance fading
			v+=min(50.,wind(p))*max(0.,1.-r*fade); 
		else if (l<0.) 
		//inside planet, get planet shading if not already 
		//loop continues because of previous problems with breaks and not always optimizes much
			l=pow(max(.53,dot(normalize(p),normalize(vec3(-1.,.5,-0.3)))),4.)
			*(.5+texture2D(effectTexture,uv*vec2(2.,1.)*(1.+p.z*.5)+vec2(tx+t*.5,0.)).x*2.);
		}
	v/=steps; v*=brightness; // average values and apply bright factor
	vec3 col=vec3(v*1.25,v*v,v*v*v)+l*planetcolor; // set color
	col*=1.-length(pow(abs(uv),vec2(5.)))*14.; // vignette (kind of)
	return vec4(col,1.0);
}

vec4 diffraction(vec2 fragCoord ){
        float t = time/200.;
        vec2 r = iResolution;
	vec3 c;
	float l,z=t;
	for(int i=0;i<3;i++) {
		vec2 uv,p=fragCoord.xy/r;
		uv=p;
		p-=.5;
		p.x*=r.x/r.y;
		z+=.07;
		l=length(p);
		uv+=p/l*(sin(z)+1.)*abs(sin(l*9.-z*2.));
		c[i]=.01/length(abs(mod(uv,1.)-.5));
	}
    return vec4(c/l,t);
}



// *****************************************************************************

















vec4 getParamLayers(int id)
{

    for (int layer = 0; layer < 8; layer++)
        if(layer == id)
            return paramLayers[layer];

    return vec4(0.0,0.0,0.0,0.0);
}


float heightAt(vec2 v){
    return max(texture2D( dTextures_00[0], v ).w, 0.);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
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
                     //   if(layer == 1 && diffuseColor.r >=0.9 && diffuseColor.g >=0.9 && diffuseColor.b >=0.9) diffuseColor =  vec4(0.0, 0.0, 0.0, 1.0); layerColor;
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

            diffuseColor = vec4(0.,0.,0.,1. );//vec4( 0.04, 0.23, 0.35, 1.0);
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



// EFFECTS *********************************************************************
    
    

    float alti  = -666.;

    // Elevation effects
    if(elevationEffectOn == 1.){
        if(alti  == -666.) alti = max(texture2D( dTextures_00[0], vVv ).w, 0.);
        float currentMaxAlti = mod(time, 3000.);
        if(alti >= currentMaxAlti) //elevationMaxToDraw)
            gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0);

        if (alti >= 1. && alti >= currentMaxAlti - 5. && alti <= currentMaxAlti + 5.)
            gl_FragColor = vec4( 1.0, .0, 1.0, 1.0);
    }

    // Elevation effects
    if(heightMapEffectOn == 1.){
        if(alti  == -666.) alti = max(texture2D( dTextures_00[0], vVv ).w, 0.);
        vec3 rgb = hsv2rgb(vec3(alti/3200., 0.7, 1.));
        gl_FragColor = mix(gl_FragColor, vec4(rgb,1.), 0.9 );
    }
    
    // sun effects
    if(sunOn == 1){
        //float light = 1. - distance(pos.xyz, sunPosition) / 20000.;
        //gl_FragColor.rgb *= light;

        // Normals
        if(alti  == -666.) alti = max(texture2D( dTextures_00[0], vVv ).w, 0.);
        float distUV = 1. / 256.;
        float dzdx = (heightAt(vec2(vVv.x + distUV, vVv.y)) - heightAt(vec2(vVv.x - distUV, vVv.y))) / 2.0;
        float dzdy = (heightAt(vec2(vVv.x, vVv.y + distUV)) - heightAt(vec2(vVv.x, vVv.y - distUV))) / 2.0;

        vec3 d = vec3(-dzdx, -dzdy, 1.0);
        vec3 n = normalize(d);
        vec3 sunDir = normalize(sunPosition - islandCenter);
        float light = min(2. * dot(n, sunDir),1.);
        vec4 colorLight =  vec4(gl_FragColor.rgb * light, 1.);
        
        gl_FragColor = mix(gl_FragColor, colorLight, 0.25 );
      //  gl_FragColor.rgb *= 1. - distance(pos.xyz, sunPosition) / 20000.;
    }

    // fog effects
    if(fogEffectOn == 1.){

        if(alti  == -666.) alti = max(texture2D( dTextures_00[0], vVv ).w, 0.);
        float d =  .8;//clamp( 1. - distance(pos.xyz, islandCenter) / 50000., 0., 1.);

        // float fogFactor = clamp( mod(time/10., 3000.) / altitude, 0., 1.);
        // gl_FragColor = mix(gl_FragColor, fogColor, fogFactor * d);

        float fogFactor = clamp( mod(time, 4000.) / 4000., 0., 1.);
        if(altitude>=450. && altitude <= 1500.){

          // gl_FragColor = mix(gl_FragColor, fogColor, fogFactor * d);
            float coordU = mod(vUv_WGS84.x + fogFactor / 100., 1.00000);
            float coordV = mod(vUv_WGS84.y + fogFactor / 100., 1.00000);
            vec4 colorT = texture2D(cloudsTexture, vec2(coordU, coordV));
            if(colorT.a > .8)
                gl_FragColor = mix(gl_FragColor, colorT, fogFactor * d);

        }
        
      
                // if(gl_FragCoord.y > 200.) gl_FragColor = vec4( 1.0, 1.0, 0.0, 1.0);
         if(alti <= 0.) gl_FragColor = texture2D(effectTexture, vUv_WGS84);  //gl_FragColor = vec4( .0, .0, 0.0, 1.0);
    }
    
    // Slide effects
    if(slide == 1.){
         float dif = gl_FragCoord.x - mod(time /3.,4000.);
         if (dif > 0.){
            if(dif < 5.)    
                 gl_FragColor = vec4(1. - dif / 5., 0., 0., 1.);
               else 
                 gl_FragColor = vec4(0., 0., 0., 1.);
            
        }       
    }

    // fire Effect (>0 alti)
    if(fireOn == 1.){
        gl_FragColor = fire(gl_FragCoord.xy);
    }


    // Diffraction Effect (>0 alti)
    if(diffractionOn == 1.){
        gl_FragColor = diffraction(gl_FragCoord.xy); //fire
    }

    // All Effects just on Island (>0 alti)
    if(hideSea == 1.)
        if (texture2D( dTextures_00[0], vVv ).w <= 0.)
            gl_FragColor = vec4( .0, .0, 0.0, 1.0);

 

    if(debug > 0)
       gl_FragColor = vec4( 1.0, 1.0, 0.0, 1.0);

}



