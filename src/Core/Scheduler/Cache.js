/**
 * Cache policies for flushing. Those policies can be used when something is
 * [set]{@link Cache.set} into the Cache, as the lifetime property.
 *
 * @typedef {Object} CACHE_POLICIES
 *
 * @property {number} INFINITE - The entry is never flushed, except when the
 * `all` flag is set to `true` when calling {@link Cache.flush}.
 * @property {number} TEXTURE - Shortcut for texture resources. Time is 15 minutes.
 * @property {number} GEOMETRY - Shortcut for geometry resources. Time is 15 minutes.
 * minutes.
 */
export const CACHE_POLICIES = {
    INFINITE: Infinity,
    TEXTURE: 900000,
    GEOMETRY: 900000,
};
