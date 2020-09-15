import * as THREE from 'three';

import color_layers_pars_fragment from './Chunk/color_layers_pars_fragment.glsl';
import elevation_pars_vertex from './Chunk/elevation_pars_vertex.glsl';
import elevation_vertex from './Chunk/elevation_vertex.glsl';
import fog_fragment from './Chunk/fog_fragment.glsl';
import fog_pars_fragment from './Chunk/fog_pars_fragment.glsl';
import lighting_fragment from './Chunk/lighting_fragment.glsl';
import lighting_pars_fragment from './Chunk/lighting_pars_fragment.glsl';
import mode_pars_fragment from './Chunk/mode_pars_fragment.glsl';
import mode_depth_fragment from './Chunk/mode_depth_fragment.glsl';
import mode_id_fragment from './Chunk/mode_id_fragment.glsl';
import overlay_fragment from './Chunk/overlay_fragment.glsl';
import overlay_pars_fragment from './Chunk/overlay_pars_fragment.glsl';
import pitUV from './Chunk/pitUV.glsl';
import precision_qualifier from './Chunk/precision_qualifier.glsl';
import project_pars_vertex from './Chunk/project_pars_vertex.glsl';
import projective_texturing_vertex from './Chunk/projective_texturing_vertex.glsl';
import projective_texturing_pars_vertex from './Chunk/projective_texturing_pars_vertex.glsl';
import projective_texturing_pars_fragment from './Chunk/projective_texturing_pars_fragment.glsl';
import WebGL2_pars_vertex from './Chunk/WebGL2_pars_vertex.glsl';
import WebGL2_pars_fragment from './Chunk/WebGL2_pars_fragment.glsl';

const ShaderChunk = {
    color_layers_pars_fragment,
    elevation_pars_vertex,
    elevation_vertex,
    fog_fragment,
    fog_pars_fragment,
    lighting_fragment,
    lighting_pars_fragment,
    mode_depth_fragment,
    mode_id_fragment,
    mode_pars_fragment,
    overlay_fragment,
    overlay_pars_fragment,
    pitUV,
    precision_qualifier,
    projective_texturing_vertex,
    projective_texturing_pars_vertex,
    projective_texturing_pars_fragment,
    project_pars_vertex,
    WebGL2_pars_vertex,
    WebGL2_pars_fragment,
};

/**
 * Install chunks in a target, for example THREE.ShaderChunk, with adding an
 * optional path.
 *
 * @param {Object} target - The target to install the chunks into.
 * @param {Object} chunks - The chunks to install. The key of each chunk will be
 * the name of installation of the chunk in the target (plus an optional path).
 * @param {string} [path] - A path to add before a chunk name as a prefix.
 *
 * @return {Object} The target with installed chunks.
 */
ShaderChunk.install = function install(target, chunks, path) {
    if (!path) { return Object.assign(target, this); }
    Object.keys(chunks).forEach((key) => {
        if (key == 'install') { return; }
        target[path + key] = chunks[key];
    });

    return target;
};

// Install all default shaders under the itowns
ShaderChunk.install(THREE.ShaderChunk, ShaderChunk, 'itowns/');

export default ShaderChunk;
