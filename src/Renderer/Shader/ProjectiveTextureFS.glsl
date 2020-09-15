#include <itowns/WebGL2_pars_fragment>
#include <itowns/precision_qualifier>
#include <logdepthbuf_pars_fragment>
#include <itowns/projective_texturing_pars_fragment>
varying vec3 vNormal;

#ifdef USE_BASE_MATERIAL
struct noPT {
    vec3 lightDirection;
    vec3 ambient;
    float opacity;
};

uniform noPT noProjectiveMaterial;
#endif

void main(void)
{
    #include <logdepthbuf_fragment>
    #ifdef USE_BASE_MATERIAL
    float nDotVP = (max(0.1, dot(vNormal, normalize(noProjectiveMaterial.lightDirection))));
    vec4 color = vec4(noProjectiveMaterial.ambient + nDotVP, 0.0);
    #else
    vec4 color = vec4(0.0);
    #endif

    #pragma unroll_loop
    for (int i = 0; i < ORIENTED_IMAGES_COUNT; i++) {
        color = projectiveTextureColor(projectiveTextureCoords[ ORIENTED_IMAGES_COUNT - 1 - i ], projectiveTextureDistortion[ ORIENTED_IMAGES_COUNT - 1 - i ], projectiveTexture[ ORIENTED_IMAGES_COUNT - 1 - i ], mask[ORIENTED_IMAGES_COUNT - 1 - i], color);
    }

    #ifdef USE_BASE_MATERIAL
    color.a = color.a < 1.0 ? max(noProjectiveMaterial.opacity, color.a) : 1.0 ;
    gl_FragColor = vec4(color.rgb, color.a * opacity);
    #else
    gl_FragColor = vec4(color.rgb / color.a, opacity);
    #endif

}
