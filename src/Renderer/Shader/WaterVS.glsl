uniform mat4 textureMatrix;
uniform float time;
varying vec4 mirrorCoord;
varying vec3 worldPosition;
varying vec3 modelPosition;
varying vec3 surfaceX;
varying vec3 surfaceY;
varying vec3 surfaceZ;
varying vec2 vuv;
void main()
{
    vuv = uv;
    mirrorCoord = modelMatrix * vec4(position, 1.0);
    worldPosition = mirrorCoord.xyz;
    modelPosition = position;
    surfaceX = vec3( modelMatrix[0][0], modelMatrix[0][1], modelMatrix[0][2]);
    surfaceY = vec3( modelMatrix[1][0], modelMatrix[1][1], modelMatrix[1][2]);
    surfaceZ = vec3( modelMatrix[2][0], modelMatrix[2][1], modelMatrix[2][2]);
    mirrorCoord = textureMatrix * mirrorCoord;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}