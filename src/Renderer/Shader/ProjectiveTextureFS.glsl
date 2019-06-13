#include <itowns/precision_qualifier>
#include <logdepthbuf_pars_fragment>
#include <itowns/projective_texturing_pars_fragment>
varying vec3 vNormal;

struct noPT {
    vec3 lightDirection;
    vec3 ambient;
    float opacity;
};

uniform noPT noProjectiveMaterial;

void main(void)
{
    #include <logdepthbuf_fragment>
    #ifdef USE_BASE_MATERIAL
    float nDotVP = (max(0.1, dot(vNormal, normalize(noProjectiveMaterial.lightDirection))));
    vec3 color = vec3(nDotVP) + noProjectiveMaterial.ambient;
    #else
    vec3 color = vec3(0.0);
    #endif
    vec4 aColor;
    float alpha = 0.0;

    #pragma unroll_loop
    for (int i = 0; i < ORIENTED_IMAGES_COUNT; i++) {
        aColor = projectiveTextureColor(projectiveTextureCoords[ ORIENTED_IMAGES_COUNT - 1 - i ], projectiveTextureDistortion[ ORIENTED_IMAGES_COUNT - 1 - i ], projectiveTexture[ ORIENTED_IMAGES_COUNT - 1 - i ], mask[ORIENTED_IMAGES_COUNT - 1 - i]);

        #ifdef USE_BASE_MATERIAL
        color = aColor.a == 1.0 ? aColor.rgb : mix(color, aColor.rgb, aColor.a);
        alpha = min(1.0, aColor.a + alpha);
        #else
        color += aColor.rgb * aColor.a;
        alpha += aColor.a;
        #endif
    }

    #ifdef USE_BASE_MATERIAL
    alpha = alpha < 1.0 ? max(noProjectiveMaterial.opacity, alpha) : 1.0 ;
    gl_FragColor = vec4(color, alpha * opacity);
    #else
    gl_FragColor = vec4(color / alpha, opacity);
    #endif

}
