/**
 * Cache policies for flushing. Those policies can be used as the
 * `cacheLifeTime` property of a layer.
 *
 * @typedef {object} CACHE_POLICIES
 *
 * @property {number} INFINITE - The entry is never flushed.
 * @property {number} TEXTURE - Shortcut for texture resources. Time is 15 minutes.
 * @property {number} GEOMETRY - Shortcut for geometry resources. Time is 15 minutes.
 */
export const CACHE_POLICIES = {
    INFINITE: Infinity,
    TEXTURE: 900000,
    GEOMETRY: 900000,
};
