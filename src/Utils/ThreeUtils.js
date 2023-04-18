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

/**
 * Merge groups of an object3D when it can to reduce number of them + remove unused materials
 * Reduce draw call https://threejs.org/docs/index.html?q=geometry#api/en/core/BufferGeometry.groups
 *
 * @param {THREE.Object3D} object3D - object to get optimize
 */
export function optimizeGeometryGroups(object3D) {
    if (!object3D.geometry) {
        return;
    }

    object3D.geometry.groups.sort((a, b) => (a.start - b.start) * -1); // [5,10,7] => [10,7,5]
    const lastIndex = object3D.geometry.groups.length - 1;
    let currentMaterialIndex = object3D.geometry.groups[lastIndex].materialIndex; // initialized with the lastest group
    const usedIndexMaterials = [currentMaterialIndex]; // compute materials actually used by group
    // for loop descendant to be able to splice in loop without modifying group index
    for (let index = lastIndex - 1; index >= 0; index--) { // begin at lastIndex - 1 because intialized with lastIndex
        const group = object3D.geometry.groups[index];
        if (group.materialIndex !== currentMaterialIndex) {
            // this is another group (!= materialIndex) take its material as ref to continue
            currentMaterialIndex = group.materialIndex;
            usedIndexMaterials.push(currentMaterialIndex);
            continue;
        } else {
            // indeed same group merge with previous group
            const previousGroup = object3D.geometry.groups[index + 1];
            previousGroup.count += group.count; // previous group wrap the current one
            object3D.geometry.groups.splice(index, 1); // remove group
        }
    }

    // clean unused material
    for (let index = object3D.material.length - 1; index >= 0; index--) {
        if (!usedIndexMaterials.includes(index)) {
            // update all materialIndex in groups
            object3D.geometry.groups.forEach((group) => {
                if (group.materialIndex > index) {
                    // only materialIndex > at index are modified
                    group.materialIndex -= 1;
                }
            });

            // remove
            object3D.material.splice(index, 1);
        }
    }
}

