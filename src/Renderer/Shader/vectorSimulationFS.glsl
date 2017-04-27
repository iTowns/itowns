
uniform float timing;
uniform sampler2D positions;      // Data Texture: current positions
uniform sampler2D gribVectors;    // Data Texture: vector fields
uniform sampler2D initPositions;  // Data Texture: Initial positions for start of life particle

varying vec2 vUv;
varying float vParticleLife;

const float radius = 6450000.;//6378137.;
const float PI     = 3.14159265359;
const float distMax = 0.005;

float atan2(in float y, in float x)
{
    return x == 0.0 ? sign(y)*PI/2. : atan(y, x);
}

// Return 3D cartesian coordinates from angular coord (spheric estimation)
vec2 getUVCoordFrom3DPos(vec3 p){

    float r = radius ;  //length(p);
    float teta = atan(p.z, p.x);
    float gamma = acos(p.y / r);
    return vec2( -teta, gamma);       //vec2(teta / (PI/2.), gamma / (PI/4.));
}


// Return angular coord from angular 3D cartesian coordinates  (spheric estimation)
// coord lon lat  (x is lon , y is lat)
vec3 get3DPosFromCoord(vec2 coord){

   vec2  c = vec2( -coord.x , coord.y);
   float x = radius * cos(c.x) * sin(c.y);
   float y = radius * cos(c.y);
   float z = radius * sin(c.x) * sin(c.y);
   return vec3(x,y,z); 
}


vec2 getInterpolatedVectorField(vec2 uv){
    
    vec2 cc1 = texture2D(gribVectors, vec2(clamp(uv.x + distMax,0.,1.), uv.y)).rg;
    vec2 cc2 = texture2D(gribVectors, vec2(clamp(uv.x - distMax,0.,1.), uv.y)).rg;
    vec2 cc3 = texture2D(gribVectors, vec2(uv.x, uv.y + clamp(distMax,0.,1.))).rg;
    vec2 cc4 = texture2D(gribVectors, vec2(uv.x, uv.y - clamp(distMax,0.,1.))).rg;

    return (cc1 + cc2 + cc3 + cc4)  / 4.;
    
}



// Compute new position from current position p
// Uses gribVectors to ad displacement to current pos p
vec3 computeNewPosition(vec3 p){

    vec2 currentAngularPos = getUVCoordFrom3DPos(p);
    float longitude = currentAngularPos.x < 0. ? 2. * PI + currentAngularPos.x : currentAngularPos.x;
    vec2 currentAngularVectorField = getInterpolatedVectorField(vec2(longitude / (2. * PI), currentAngularPos.y / PI));
    vec2 newAngularPos = currentAngularPos + vec2(currentAngularVectorField.x, -currentAngularVectorField.y) / 10000.;
    vec3 new3DPos = get3DPosFromCoord(newAngularPos);
        //  vec3 initPos = texture2D( initPositions, vUv).rgb;
        //  if(distance(new3DPos, initPos) > 1000000.) new3DPos = initPos;
    return new3DPos;
}



void main()
{

    vec3 pos = texture2D( positions, vUv ).rgb;
    // vec2 angularPosition = getUVCoordFrom3DPos(pos);
    // vec3 debugPos = get3DPosFromCoord(angularPosition);

    vec3 newPos = computeNewPosition(pos);
    if( distance(mod(timing,1.), vParticleLife) < 0.001) newPos = texture2D( initPositions, vUv).rgb;

    float speed = distance(newPos, pos) / 5000.;
    //vec3 posIntermediate = pos + min(timing*5., 1.) * (newPos - pos);     //newPos - pos);
    gl_FragColor = vec4(newPos, speed); //vParticleLife); //1.0);  

}
