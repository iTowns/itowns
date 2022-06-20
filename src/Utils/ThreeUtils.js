/**
 * Find threejs textures from a material
 * @param {Material} material the threejs material holding textures
 * @returns {Array} an array of textures in the material
 */
function findTextures(material) {
    const textures = [];
    if (material.alphaMap) {
        textures.push(material.map);
    }
    if (material.aoMap) {
        textures.push(material.map);
    }
    if (material.bumpMap) {
        textures.push(material.bumpMap);
    }
    if (material.displacementMap) {
        textures.push(material.bumpMap);
    }
    if (material.emissiveMap) {
        textures.push(material.emissiveMap);
    }
    if (material.envMap) {
        textures.push(material.envMap);
    }
    if (material.lightMap) {
        textures.push(material.envMap);
    }
    if (material.map) {
        textures.push(material.map);
    }
    if (material.metalnessMap) {
        textures.push(material.map);
    }
    if (material.normalMap) {
        textures.push(material.map);
    }
    if (material.roughnessMap) {
        textures.push(material.map);
    }
    if (material.specularMap) {
        textures.push(material.specularMap);
    }
    return textures;
}

/**
 * Removes a material and its textures, memory will be freed.
 * IMPORTANT NOTE: the material and the texture must not be referenced by other threejs objects, otherwise the memory
 * won't be freed.
 * @param {Material} material the material to remove
 */
export default function disposeThreeMaterial(material) {
    const textures = findTextures(material);
    // Remove material
    if (Array.isArray(material)) {
        for (const m of material) {
            m.dispose();
        }
    } else {
        material.dispose();
    }
    // Remove textures
    for (let i = 0; i < textures.length; i++) {
        textures[i].dispose();
    }
}
