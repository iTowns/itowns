
#ifdef USE_LOGDEPTHBUF

    #ifdef USE_LOGDEPTHBUF_EXT

        varying float vFragDepth;

    #endif

    uniform float logDepthBufFC;

#endif

#define EPSILON 1e-6

uniform sampler2D positions; //RenderTarget containing the transformed positions
uniform sampler2D gribVectors;

varying float vSpeed;

varying float opacity;

const float radius = 6400000.;

bool beyondHorizon(vec3 p, vec3 camera, vec3 center)
{

/*
    vec3 vt = p - camera;
    vec3 vc = center - camera;

    float d = dot(vt, vc);
    float magnitude = length(vc);
    float magnitudeSquared = vc.x * vc.x + vc.y * vc.y + vc.z * vc.z - 1.0;

    return d > magnitudeSquared;  //magnitude * magnitude - 1.0;
*/

    float cvX = cameraPosition.x / radius;
    float cvY = cameraPosition.y / radius;
    float cvZ = cameraPosition.z / radius;

    float vhMagnitudeSquared = cvX * cvX + cvY * cvY + cvZ * cvZ - 1.0;

    float tX = p.x / radius;
    float tY = p.y / radius;
    float tZ = p.z / radius;

    float vtX = tX - cvX;
    float vtY = tY - cvY;
    float vtZ = tZ - cvZ;
    float vtMagnitudeSquared = vtX * vtX + vtY * vtY + vtZ * vtZ;

    // VT dot VC is the inverse of VT dot CV
    float vtDotVc = -(vtX * cvX + vtY * cvY + vtZ * cvZ);

    return vtDotVc > vhMagnitudeSquared &&
                 vtDotVc * vtDotVc / vtMagnitudeSquared > vhMagnitudeSquared;

}


void main()
{
    gl_PointSize = 2.; 


    //the mesh is a normalized square so the uvs = the xy positions of the vertices
    vec4 posAndSpeed = texture2D( positions, position.xy );  // xyz:pos, w:speed

    //float distToCam = distance(posAndSpeed.xyz, cameraPosition);
    //opacity = distToCam > length(cameraPosition) ? 0. : 1.;  // If points are on the back side of the sphere
    opacity = beyondHorizon(posAndSpeed.xyz, cameraPosition, vec3(0.,0.,0.)) ? 0. : 1.;
   

    vSpeed = posAndSpeed.w;
    //pos now contains a 3D position in space, we can use it as a regular vertex
    //regular projection of our position
    gl_Position = projectionMatrix * modelViewMatrix * vec4( posAndSpeed.xyz, 1.0 );




     #ifdef USE_LOGDEPTHBUF

            gl_Position.z = log2(max( EPSILON, gl_Position.w + 1.0 )) * logDepthBufFC;

            #ifdef USE_LOGDEPTHBUF_EXT

                vFragDepth = 1.0 + gl_Position.w;

            #else

                gl_Position.z = (gl_Position.z - 1.0) * gl_Position.w;

            #endif

      #endif
}


