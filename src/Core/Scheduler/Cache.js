import { LRUCache } from 'lru-cache';

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

/**
 * This is a copy of the Map object, except that it also store a value for last
 * time used. This value is used for cache expiration mechanism.
 *
 * @example
 * import Cache, { CACHE_POLICIES } from 'Core/Scheduler/Cache';
 *
 * const cache = new Cache(CACHE_POLICIES.TEXTURE)
 * cache.set({ bar: 1 }, 'foo');
 * cache.set({ bar: 32 }, 'foo', 'toto');
 *
 * cache.get('foo');
 *
 * cache.delete('foo');
 *
 * cache.clear();
 *
 */
class Cache extends LRUCache {
    /**
     * @param      {number}  [lifetime=CACHE_POLICIES.INFINITE]  The cache expiration time for all values.
     */
    constructor(lifetime = CACHE_POLICIES.INFINITE) {
        const options = {
            max: 500,
            ...(lifetime !== Infinity && { ttl: lifetime }),
        };
        super(options);
    }

    /**
     * Returns the entry related to the specified key from the cache. The last
     * time used property of the entry is updated to extend the longevity of the
     * entry.
     *
     * @param {string|number} key1
     * @param {string|number} [key2]
     * @param {string|number} [key3]
     *
     * @return {Object}
     */
    get(key1, ...keys) {
        let key = key1;
        keys.forEach((ele) => {
            key += `_${ele}`;
        });
        return super.get(key);
    }

    /**
     * Adds or updates an entry with specified keys (up to 3).
     * Caution: it overrides any existing entry already set at this/those key/s.
     *
     *
     * @param {Object} value to add in cache
     * @param {string|number} key1
     * @param {string|number} [key2]
     * @param {string|number} [key3]
     *
     * @return {Object} the added value
     */
    set(value, key1, ...keys) {
        let key = key1;
        keys.forEach((ele) => {
            key += `_${ele}`;
        });
        super.set(key, value);
        return value;
    }

    /**
     * Deletes the specified entry from the cache.
     *
     * @param {string|number} key1
     * @param {string|number} [key2]
     * @param {string|number} [key3]
     */
    delete(key1, ...keys) {
        let key = key1;
        keys.forEach((ele) => {
            key += `_${ele}`;
        });
        super.delete(key);
    }

    /**
     * Removes all entries of the cache.
     *
     */
    clear() {
        super.clear();
    }
}

export default Cache;
