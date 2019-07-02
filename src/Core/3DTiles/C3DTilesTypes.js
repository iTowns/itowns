/**
 * Enumeration of implemented 3D Tiles classes. Used in C3DTExtensions to
 * now which classes ask for extension parsing.
 *
 * @enum {Object} C3DTilesTypes
 *
 * @property {String} tileset - value: 'tileset'
 * @property {String} batchtable - value: 'batchtable'
 * @property {String} boundingVolume - value: 'bounding volume'
 */
const C3DTilesTypes = {
    tileset: 'tileset',
    batchtable: 'batchtable',
    boundingVolume: 'boundingVolume',
};

export default C3DTilesTypes;
