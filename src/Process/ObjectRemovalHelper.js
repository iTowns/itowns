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
                obj.geometry = null;
            }
            if (obj.material) {
                obj.material.dispose();
                obj.material = null;
            }
        }
    },

    /**
     * Remove obj's children belonging to layerId layer.
     * Neither obj nor its children will be disposed!
     * @param {String} layerId The id of the layer that objects must belong to. Other object are ignored
     * @param {Object3D} obj The Object3D we want to clean
     * @return {Array} an array of removed Object3D from obj (not including the recursive removals)
     */
    removeChildren(layerId, obj) {
        const toRemove = obj.children.filter(c => c.layer === layerId);
        obj.remove(...toRemove);
        return toRemove;
    },

    /**
     * Remove obj's children belonging to layerId layer and cleanup objexts.
     * obj will be disposed but its children **won't**!
     * @param {String} layerId The id of the layer that objects must belong to. Other object are ignored
     * @param {Object3D} obj The Object3D we want to clean
     * @return {Array} an array of removed Object3D from obj (not including the recursive removals)
     */
    removeChildrenAndCleanup(layerId, obj) {
        const toRemove = obj.children.filter(c => c.layer === layerId);

        if (obj.layer === layerId) {
            this.cleanup(obj);
        }

        obj.remove(...toRemove);
        return toRemove;
    },

    /**
     * Recursively remove obj's children belonging to layerId layer.
     * All removed obj will have their geometry/material disposed.
     * @param {String} layerId The id of the layer that objects must belong to. Other object are ignored
     * @param {Object3D} obj The Object3D we want to clean
     * @return {Array} an array of removed Object3D from obj (not including the recursive removals)
     */
    removeChildrenAndCleanupRecursively(layerId, obj) {
        const toRemove = obj.children.filter(c => c.layer === layerId);
        for (const c of toRemove) {
            this.removeChildrenAndCleanupRecursively(layerId, c);
        }
        if (obj.layer === layerId) {
            this.cleanup(obj);
        }
        obj.remove(...toRemove);
        return toRemove;
    },
};
