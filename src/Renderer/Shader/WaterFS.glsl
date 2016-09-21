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
uniform sampler2D maskSampler;
varying vec4 mirrorCoord;
varying vec3 worldPosition;
varying vec3 modelPosition;
varying vec3 surfaceX;
varying vec3 surfaceY;
varying vec3 surfaceZ;
varying vec2 vuv;
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
void main()
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
 vec4 cm = texture2D(maskSampler, vuv);
 vec3 outgoingLight = albedo;
gl_FragColor = mix( vec4( outgoingLight, alpha ), vec4(1.0, 1.0,1.0,1.0), cm.r );
}