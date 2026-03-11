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

  vec4 color = texture(map, pitUV(vUv.xy, colorOffsetScales));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, color.rgb, color.a);

  #if DEBUG == 1
    if (showOutline) {
        color = getOutlineColor( outlineColors[ 0 ], vUv.xy);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, color.rgb, color.a);
    }
    #endif

    // if no lights are defined, keep flat shading
    #if NUM_DIR_LIGHTS + NUM_SPOT_LIGHTS + NUM_POINT_LIGHTS + NUM_HEMI_LIGHTS > 0
        vec3 normal = normalize(vNormal);
        vec4 diffuseColor = gl_FragColor;
        float specularStrength = 1.;
        ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));

        #include <lights_lambert_fragment>
        #include <lights_fragment_begin>
        #include <lights_fragment_end>

        gl_FragColor.rgb = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
    #endif

    #include <fog_fragment>
    #include <itowns/overlay_fragment>

#endif
}
