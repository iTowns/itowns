#include <itowns/precision_qualifier>
#include <logdepthbuf_pars_fragment>
#include <itowns/pitUV>
#include <itowns/color_layers_pars_fragment>
#if MODE == MODE_FINAL
#include <fog_pars_fragment>
#include <itowns/overlay_pars_fragment>
#include <normal_pars_fragment>
#endif
// TODO move to MODE_FINAL?
#include <common>
#include <lights_lambert_pars_fragment>
#include <lights_pars_begin>
#include <itowns/mode_pars_fragment>

uniform vec3        diffuse;
uniform float       opacity;
varying vec3        vUv; // uv.x/uv_1.x, uv.y, uv_1.y
varying vec2        vHighPrecisionZW;

void main() {
    #include <logdepthbuf_fragment>

#if MODE == MODE_ID

    #include <itowns/mode_id_fragment>

#elif MODE == MODE_DEPTH

    #include <itowns/mode_depth_fragment>

#else

    gl_FragColor = vec4(diffuse, opacity);

    uvs[0] = vec3(vUv.xy, 0.);

#if NUM_CRS > 1
    uvs[1] = vec3(vUv.x, fract(vUv.z), floor(vUv.z));
#endif

    vec4 color;
    #pragma unroll_loop
    for ( int i = 0; i < NUM_FS_TEXTURES; i ++ ) {
        color = getLayerColor( i , colorTextures, colorOffsetScales[ i ], colorLayers[ i ]);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, color.rgb, color.a);
    }

  #if DEBUG == 1
    if (showOutline) {
        #pragma unroll_loop
        for ( int i = 0; i < NUM_CRS; i ++) {
            color = getOutlineColor( outlineColors[ i ], uvs[ i ].xy);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, color.rgb, color.a);
        }
    }
  #endif

    vec3 normal = normalize(vNormal);
	vec4 diffuseColor = gl_FragColor;
    float specularStrength = 1.;
    ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));

    #include <lights_lambert_fragment>
    #include <lights_fragment_begin>
    #include <lights_fragment_end>

    gl_FragColor.rgb = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;

    #include <fog_fragment>
    #include <itowns/overlay_fragment>

#endif
}
