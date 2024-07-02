// eslint-disable-next-line no-unused-vars
import { Object3D, Box3 } from 'three';

/**
 * Finds the batch table of an object in a 3D Tiles layer. This is
 * for instance needed when picking because we pick the geometric
 * object which is not at the same level in the layer structure as
 * the batch table.
 * @param {THREE.Object3D} object - a 3D geometric object
 * @returns {C3DTBatchTable|null} - the batch table of the object
 */
function findBatchTable(object) {
    if (object.batchTable) {
        return object.batchTable;
    }
    if (object.parent) {
        return findBatchTable(object.parent);
    }
    return null;
}

/**
 * C3DTFeature is a feature of a 3DTiles
 *
 * @class      C3DTFeature
 * @param {number} tileId - tileId
 * @param {number} batchId - batch id
 * @param {Array<{start:number,count:number}>} groups - groups in geometry.attributes matching batchId
 * @param {object} [userData] - some userData
 * @param {Object3D} object3d - object3d in which feature is present
 * @property {number} tileId - tile id
 * @property {Object3D} object3d - object3d in which feature is present
 * @property {number} batchId - batch id
 * @property {Array<{start:number,count:number}>} groups - groups in geometry.attributes matching batchId
 * @property {object} [userData] - some userData
 */
class C3DTFeature {
    #info;
    constructor(tileId, batchId, groups, userData, object3d) {
        /** @type {Object3D} */
        this.object3d = object3d;

        /** @type {number} */
        this.batchId = batchId;

        /** @type {Array<{start:number,count:number}>} */
        this.groups = groups;

        /** @type {object} */
        this.userData = userData;

        /** @type {number} */
        this.tileId = tileId;

        // Lazy-loaded batch table information for this.batchId.
        this.#info = null;
    }

    /**
     * Compute world box3 of this
     *
     * @param {Box3} target - target of the result
     * @returns {Box3}
     */
    computeWorldBox3(target = new Box3()) {
        // reset
        target.max.x = -Infinity;
        target.max.y = -Infinity;
        target.max.z = -Infinity;
        target.min.x = Infinity;
        target.min.y = Infinity;
        target.min.z = Infinity;

        this.groups.forEach((group) => {
            const positionIndexStart = group.start * this.object3d.geometry.attributes.position.itemSize;
            const positionIndexCount = (group.start + group.count) * this.object3d.geometry.attributes.position.itemSize;

            for (let index = positionIndexStart; index < positionIndexCount; index++) {
                const x = this.object3d.geometry.attributes.position.getX(index);
                const y = this.object3d.geometry.attributes.position.getY(index);
                const z = this.object3d.geometry.attributes.position.getZ(index);

                target.max.x = Math.max(x, target.max.x);
                target.max.y = Math.max(y, target.max.y);
                target.max.z = Math.max(z, target.max.z);

                target.min.x = Math.min(x, target.min.x);
                target.min.y = Math.min(y, target.min.y);
                target.min.z = Math.min(z, target.min.z);
            }
        });

        target.applyMatrix4(this.object3d.matrixWorld);

        return target;
    }

    /**
     * Gets the information from the tile batch table for this C3DTFeature batch id.
     * @returns {object} - batchTable info
     */
    getInfo() {
        if (this.#info) {
            return this.#info;
        }
        const batchTable = findBatchTable(this.object3d);
        if (!batchTable) {
            console.warn(`[C3DTFeature]: No batch table found for tile ${this.tileId}.`);
            return null; // or return undefined;
        }
        this.#info = batchTable.getInfoById(this.batchId);
        return this.#info;
    }
}

export default C3DTFeature;
