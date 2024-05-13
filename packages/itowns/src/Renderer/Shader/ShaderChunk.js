import * as THREE from 'three';
import color_layers_pars_fragment from './Chunk/color_layers_pars_fragment.glsl';
import elevation_pars_vertex from './Chunk/elevation_pars_vertex.glsl';
import elevation_vertex from './Chunk/elevation_vertex.glsl';
import geoid_vertex from './Chunk/geoid_vertex.glsl';
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
import projective_texturing_vertex from './Chunk/projective_texturing_vertex.glsl';
import projective_texturing_pars_vertex from './Chunk/projective_texturing_pars_vertex.glsl';
import projective_texturing_pars_fragment from './Chunk/projective_texturing_pars_fragment.glsl';

const custom_header_colorLayer = '// no custom header';
const custom_body_colorLayer = '// no custom body';

const itownsShaderChunk = {
    color_layers_pars_fragment,
    custom_body_colorLayer,
    custom_header_colorLayer,
    elevation_pars_vertex,
    elevation_vertex,
    geoid_vertex,
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
};

/**
 * The ShaderChunkManager manages the itowns chunks shader.
 * It adds chunks to THREE.ShaderChunk to compile shaders
 *
 * In itowns, if you want access to `ShaderChunkManager` instance :
 *
 * ```js
 * import ShaderChunk from 'Renderer/Shader/ShaderChunk';
 * ```
 * or
 * ```js
 * const ShaderChunk = itowns.ShaderChunk';
 * ```
 *
 * @property {Object} target - The target to install the chunks into.
 * @property {string} [path] - A path to add before a chunk name as a prefix.
 *
 */
class ShaderChunkManager {
    /**
     * Constructs a new instance ShaderChunkManager.
     *
     * @constructor
     *
     * @param {Object} target - The target to install the chunks into.
     * @param {string} [path] - A path to add before a chunk name as a prefix.
     *
     */
    constructor(target, path) {
        this.path = path;
        this.target = target;
        this.install();
    }
    /**
     * Set the header ColorLayer shader.
     *
     * @param  {string}  header  The glsl header
     */
    customHeaderColorLayer(header) {
        itownsShaderChunk.custom_header_colorLayer = header;
        this.target[`${this.path}custom_header_colorLayer`] = header;
    }

    /**
     * Set the body ColorLayer shader.
     * You could define you color terrain shader, with a header and a body.
     * the header defines yours fonctions and the body defines the process on ColorLayer.
     * @example <caption>Custom shader chunk</caption>
     *  itowns.ShaderChunk.customHeaderColorLayer(`
     *  // define yours methods
     *  vec4 myColor(vec4 color, float a) {
     *      return color * a;
     *  }
     * `);
     * itowns.ShaderChunk.customBodyColorLayer(`
     *  // the body set final color layer.
     *  // layer.amount_effect is variable, it could be change in Layer instance.
     *  color = myColor(color, layer.amount_effect)
     * `);
     *
     *  var colorLayer = new itowns.ColorLayer('OPENSM', {
     *    source,
     *    type_effect: itowns.colorLayerEffects.customEffect,
     *    amount_effect: 0.5,
     *  });
     *
     * @param  {string}  body  The glsl body
     */
    customBodyColorLayer(body) {
        itownsShaderChunk.custom_body_colorLayer = body;
        this.target[`${this.path}custom_body_colorLayer`] = body;
    }
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
    install(target = this.target, chunks = itownsShaderChunk, path = this.path) {
        Object.keys(chunks).forEach((key) => {
            Object.defineProperty(this, key, {
                get: () => chunks[key],
            });
            target[path + key] = chunks[key];
        });
        return target;
    }
}

const ShaderChunk = new ShaderChunkManager(THREE.ShaderChunk, 'itowns/');

export default ShaderChunk;
