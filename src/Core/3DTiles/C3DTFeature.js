// eslint-disable-next-line no-unused-vars
import { Object3D, Box3 } from 'three';

/**
 * C3DTFeature is a feature of a 3DTiles
 *
 * @class      C3DTFeature
 * @param {number} tileId - tileId
 * @param {number} batchId - batch id
 * @param {Array<{start:number,count:number}>} groups - groups in geometry.attributes matching batchId
 * @param {object} info - info in the batchTable
 * @param {object} [userData] - some userData
 * @param {Object3D} object3d - object3d in which feature is present
 * @property {number} tileId - tile id
 * @property {Object3D} object3d - object3d in which feature is present
 * @property {number} batchId - batch id
 * @property {Array<{start:number,count:number}>} groups - groups in geometry.attributes matching batchId
 * @property {object} info - info in the batchTable
 * @property {object} [userData] - some userData
 */
class C3DTFeature {
    #info;
    constructor(tileId, batchId, groups, info, userData, object3d) {
        if (!object3d) {
            console.error('BREAKING CHANGE: C3DTFeature constructor changed from (tileId, batchId, groups, info, userData) to (tileId, batchId, groups, info, userData, object3d)');
        }

        /** @type {Object3D} */
        this.object3d = object3d;

        /** @type {number} */
        this.batchId = batchId;

        /** @type {Array<{start:number,count:number}>} */
        this.groups = groups;

        /** @type {object} */
        this.userData = userData;

        /** @type {object} */
        this.#info = info;

        /** @type {number} */
        this.tileId = tileId;
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
            const positionIndexStart = group.start * 3;
            const positionIndexCount = (group.start + group.count) * 3;

            for (let index = positionIndexStart; index < positionIndexCount; index += 3) {
                const x = this.object3d.geometry.attributes.position.array[index];
                const y = this.object3d.geometry.attributes.position.array[index + 1];
                const z = this.object3d.geometry.attributes.position.array[index + 2];

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
     *
     * @returns {object} - batchTable info
     */
    getInfo() {
        return this.#info;
    }
}

export default C3DTFeature;
