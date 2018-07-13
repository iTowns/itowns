import * as THREE from 'three';

import pitUV from './Chunk/pitUV.glsl';
import precision_qualifier from './Chunk/precision_qualifier.glsl';
import project_pars_vertex from './Chunk/project_pars_vertex.glsl';
import projective_texturing_vertex from './Chunk/projective_texturing_vertex.glsl';
import projective_texturing_pars_vertex from './Chunk/projective_texturing_pars_vertex.glsl';
import projective_texturing_pars_fragment from './Chunk/projective_texturing_pars_fragment.glsl';

const ShaderChunk = {
    pitUV,
    precision_qualifier,
    projective_texturing_vertex,
    projective_texturing_pars_vertex,
    projective_texturing_pars_fragment,
    project_pars_vertex,
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
