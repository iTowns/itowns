let data = {};
let entry;

/**
 * This is a copy of the Map object, except that it also store a value for last
 * time used. This value is used for cache expiration mechanism.
 * <br><br>
 * This module can be imported anywhere, its data will be shared, as it is a
 * single instance.
 *
 * @module Cache
 *
 * @example
 * import Cache from './Cache';
 *
 * Cache.set({ bar: 1 }, Cache.POLICIES.TEXTURE, 'foo');
 * Cache.set({ bar: 32 }, Cache.POLICIES.INFINITE, 'foo', 'toto');
 *
 * Cache.get('foo');
 *
 * Cache.delete('foo');
 *
 * Cache.clear();
 *
 * Cache.flush();
 */
const Cache = {
    /**
     * Cache policies for flushing. Those policies can be used when something is
     * [set]{@link Cache.set} into the Cache, as the lifetime property.
     *
     * @typedef {Object} POLICIES
     *
     * @property {number} INFINITE - The entry is never flushed, except when the
     * `all` flag is set to `true` when calling {@link Cache.flush}.
     * @property {number} TEXTURE - Shortcut for texture resources. Time is 15 minutes.
     * @property {number} ELEVATION - Shortcut for elevation resources. Time is 15
     * minutes.
     */
    POLICIES: {
        INFINITE: Infinity,
        TEXTURE: 900000,
        ELEVATION: 900000,
    },

    /**
     * Returns the entry related to the specified key from the cache. The last
     * time used property of the entry is updated to extend the longevity of the
     * entry.
     *
     * @name module:Cache.get
     * @function
     *
     * @param {string} key1
     * @param {string} [key2]
     * @param {string} [key3]
     *
     * @return {Object}
     */
    get: (key1, key2, key3) => {
        if (data[key1] == undefined) {
            // eslint-disable-next-line
            return;
        } else if (data[key1][key2] == undefined) {
            entry = data[key1];
        } else if (data[key1][key2][key3] == undefined) {
            entry = data[key1][key2];
        } else {
            entry = data[key1][key2][key3];
        }

        if (entry.value) {
            entry.lastTimeUsed = Date.now();
            return entry.value;
        }
    },

    /**
     * Adds or updates an entry with specified keys (up to 3). A lifetime can be
     * added, by specifying a numerical value or using the {@link
     * Cache.POLICIES} values. By default an entry has an infinite lifetime.
     * Caution: it overrides any existing entry already set at this/those key/s.
     *
     * @name module:Cache.set
     * @function
     *
     * @param {Object} value
     * @param {number} lifetime
     * @param {string} key1
     * @param {string} [key2]
     * @param {string} [key3]
     *
     * @return {Object} the added value
     */
    set: (value, lifetime, key1, key2, key3) => {
        entry = {
            value,
            lastTimeUsed: Date.now(),
            lifetime,
        };

        if (key2 == undefined) {
            data[key1] = entry;
            return value;
        }

        if (!data[key1]) {
            data[key1] = {};
        }

        if (key3 == undefined) {
            data[key1][key2] = entry;
            return value;
        }

        if (!data[key1][key2]) {
            data[key1][key2] = {};
        }

        data[key1][key2][key3] = entry;

        return value;
    },

    /**
     * Deletes the specified entry from the cache.
     *
     * @name module:Cache.delete
     * @function
     *
     * @param {string} key1
     * @param {string} [key2]
     * @param {string} [key3]
     */
    delete: (key1, key2, key3) => {
        if (data[key1] == undefined) {
            throw Error('Please specify at least a key of something to delete');
        } else if (data[key1][key2] == undefined) {
            delete data[key1];
        } else if (data[key1][key2][key3] == undefined) {
            delete data[key1][key2];
        } else {
            delete data[key1][key2][key3];
        }
    },

    /**
     * Removes all entries of the cache.
     *
     * @name module:Cache.clear
     * @function
     */
    clear: () => {
        data = {};
    },

    /**
     * Flush the cache: entries that have been present for too long since the
     * last time they were used, are removed from the cache. By default, the
     * time is the current time, but the interval can be reduced by doing
     * something like `Cache.flush(Date.now() - reductionTime)`. If you want to
     * clear the whole cache, use {@link Cache.clear} instead.
     *
     * @name module:Cache.flush
     * @function
     *
     * @param {number} [time=Date.now()]
     */
    flush: (time = Date.now()) => {
        for (const i in data) {
            if (data[i].lifetime < time - data[i].lastTimeUsed) {
                delete data[i];
            } else {
                for (const j in data[i]) {
                    if (data[i][j].lifetime < time - data[i][j].lastTimeUsed) {
                        delete data[i][j];
                    } else {
                        for (const k in data[i][j]) {
                            if (data[i][j][k].lifetime < time - data[i][j][k].lastTimeUsed) {
                                delete data[i][j][k];
                            }
                        }
                    }
                }
            }
        }
    },
};

Object.freeze(Cache);
export default Cache;
