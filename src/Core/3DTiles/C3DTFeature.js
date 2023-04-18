/**
 * C3DTFeature is a feature of a 3DTiles
 *
 * @class      C3DTFeature
 * @param {number} tileId - tile id
 * @param {number} batchId - batch id
 * @param {Array<{start:number,count:number}>} groups - groups in geometry.attributes matching batchId
 * @param {object} info - info in the batchTable
 * @param {object} [userData={}] - some userData
 * @property {number} tileId - tile id
 * @property {number} batchId - batch id
 * @property {Array<{start:number,count:number}>} groups - groups in geometry.attributes matching batchId
 * @property {object} info - info in the batchTable
 * @property {object} [userData={}] - some userData
 */
class C3DTFeature {
    #info;
    constructor(tileId, batchId, groups, info, userData = {}) {
        /** @type {number} */
        this.tileId = tileId;

        /** @type {number} */
        this.batchId = batchId;

        /** @type {Array<{start:number,count:number}>} */
        this.groups = groups;

        /** @type {object} */
        this.userData = userData;

        /** @type {object} */
        this.#info = info;
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
