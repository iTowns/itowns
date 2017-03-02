uniform vec3 v3LightPosition;   // The direction vector to the light source
uniform vec3 v3InvWavelength;   // 1 / pow(wavelength, 4) for the red, green, and blue channels
uniform float fCameraHeight;    // The camera's current height
uniform float fCameraHeight2;   // fCameraHeight^2
uniform float fOuterRadius;     // The outer (atmosphere) radius
uniform float fOuterRadius2;    // fOuterRadius^2
uniform float fInnerRadius;     // The inner (planetary) radius
uniform float fInnerRadius2;    // fInnerRadius^2
uniform float fKrESun;          // Kr * ESun
uniform float fKmESun;          // Km * ESun
uniform float fKr4PI;           // Kr * 4 * PI
uniform float fKm4PI;           // Km * 4 * PI
uniform float fScale;           // 1 / (fOuterRadius - fInnerRadius)
uniform float fScaleDepth;      // The scale depth (i.e. the altitude at which the atmosphere's average density is found)
uniform float fScaleOverScaleDepth; // fScale / fScaleDepth

const int nSamples = 3;
const float fSamples = 3.0;

varying vec3 v3Direction;
varying vec3 c0;
varying vec3 c1;

float scale(float fCos) {
    float x = 1.0 - fCos;
    return fScaleDepth * exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));
}

void main(void) {
    float lengthCamera = length(cameraPosition);
    float cameraHeight2 = lengthCamera * lengthCamera;

    // Get the ray from the camera to the vertex and its length (which is the far point of the ray passing through the atmosphere)
    vec3 v3Ray = position - cameraPosition;
    float fFar = length(v3Ray);
    v3Ray /= fFar;

    // Calculate the closest intersection of the ray with the outer atmosphere (which is the near point of the ray passing through the atmosphere)
    float B = 2.0 * dot(cameraPosition, v3Ray);
    float C = cameraHeight2 - fOuterRadius2;
    float fDet = max(0.0, B*B - 4.0 * C);
    float fNear = 0.5 * (-B - sqrt(fDet));

    // Calculate the ray's starting position, then calculate its scattering offset
    vec3 v3Start = cameraPosition + v3Ray * fNear;
    fFar -= fNear;
    float fStartAngle = dot(v3Ray, v3Start) / fOuterRadius;
    float fStartDepth = exp(-1.0 / fScaleDepth);
    float fStartOffset = fStartDepth * scale(fStartAngle);

    // Initialize the scattering loop variables
    float fSampleLength = fFar / fSamples;
    float fScaledLength = fSampleLength * fScale;
    vec3 v3SampleRay = v3Ray * fSampleLength;
    vec3 v3SamplePoint = v3Start + v3SampleRay * 0.5;

    // Now loop through the sample rays
    vec3 v3FrontColor = vec3(0.0, 0.0, 0.0);
    for(int i=0; i<nSamples; i++)
    {
        float fHeight = length(v3SamplePoint);
        float fDepth = exp(fScaleOverScaleDepth * (fInnerRadius - fHeight));
        float fLightAngle = dot(v3LightPosition, v3SamplePoint) / fHeight;
        float fCameraAngle = dot(v3Ray, v3SamplePoint) / fHeight;
        float fScatter = (fStartOffset + fDepth * (scale(fLightAngle) - scale(fCameraAngle)));
        vec3 v3Attenuate = exp(-fScatter * (v3InvWavelength * fKr4PI + fKm4PI));

        v3FrontColor += v3Attenuate * (fDepth * fScaledLength);
        v3SamplePoint += v3SampleRay;
    }

    // Finally, scale the Mie and Rayleigh colors and set up the varying variables for the pixel shader
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    c0 = v3FrontColor * (v3InvWavelength * fKrESun);
    c1 = v3FrontColor * fKmESun;
    v3Direction = cameraPosition - position;
}