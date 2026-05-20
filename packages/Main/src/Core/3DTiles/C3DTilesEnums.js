/**
 * Enumeration of implemented 3D Tiles classes. Used in C3DTExtensions to
 * now which classes ask for extension parsing.
 *
 * @enum {object} C3DTilesTypes
 *
 * @property {string} tileset - value: 'tileset'
 * @property {string} batchtable - value: 'batchtable'
 * @property {string} boundingVolume - value: 'bounding volume'
 */
export const C3DTilesTypes = {
    tileset: 'tileset',
    batchtable: 'batchtable',
    boundingVolume: 'boundingVolume',
};

export const C3DTilesBoundingVolumeTypes = {
    region: 'region',
    box: 'box',
    sphere: 'sphere',
};
