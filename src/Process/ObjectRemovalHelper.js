export default {
    /**
     * Cleanup obj to release three.js allocated resources
     * @param {Object3D} obj object to release
     */
    cleanup(obj) {
        obj.layer = null;

        if (typeof obj.dispose === 'function') {
            obj.dispose();
        } else {
            if (obj.geometry) {
                obj.geometry.dispose();
                // the Object Removal Helper causes inconsistencies
                // when it assigns null to a geometry present in the Cache.
                // Actually, the cache can provide a mesh whose geometry is null.
                // see https://github.com/iTowns/itowns/issues/869
                // obj.geometry = null;
            }
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    for (const material of obj.material) {
                        material.dispose();
                    }
                } else {
                    obj.material.dispose();
                }
                // obj.material = null;
            }
        }
    },

    /**
     * Remove obj's children belonging to a layer.
     * Neither obj nor its children will be disposed!
     * @param {Layer} layer The layer that objects must belong to. Other object are ignored
     * @param {Object3D} obj The Object3D we want to clean
     * @return {Array} an array of removed Object3D from obj (not including the recursive removals)
     */
    removeChildren(layer, obj) {
        const toRemove = obj.children.filter(c => (c.layer && c.layer.id) === layer.id);
        obj.remove(...toRemove);
        return toRemove;
    },

    /**
     * Remove obj's children belonging to a layer and cleanup objexts.
     * obj will be disposed but its children **won't**!
     * @param {Layer} layer The layer that objects must belong to. Other object are ignored
     * @param {Object3D} obj The Object3D we want to clean
     * @return {Array} an array of removed Object3D from obj (not including the recursive removals)
     */
    removeChildrenAndCleanup(layer, obj) {
        const toRemove = obj.children.filter(c => (c.layer && c.layer.id) === layer.id);

        obj.remove(...toRemove);
        if (obj.layer === layer) {
            this.cleanup(obj);
        }
        return toRemove;
    },

    /**
     * Recursively remove obj's children belonging to a layer.
     * All removed obj will have their geometry/material disposed.
     * @param {Layer} layer The layer that objects must belong to. Other object are ignored
     * @param {Object3D} obj The Object3D we want to clean
     * @return {Array} an array of removed Object3D from obj (not including the recursive removals)
     */
    removeChildrenAndCleanupRecursively(layer, obj) {
        const toRemove = obj.children.filter(c => (c.layer && c.layer.id) === layer.id);
        for (const c of toRemove) {
            this.removeChildrenAndCleanupRecursively(layer, c);
        }
        obj.remove(...toRemove);
        if (obj.layer && obj.layer.id === layer.id) {
            this.cleanup(obj);
        }
        return toRemove;
    },
};
