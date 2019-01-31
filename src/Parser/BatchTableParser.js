import utf8Decoder from 'Utils/Utf8Decoder';
/** Class representing a 3D Tiles batch table */
class BatchTable {
    /**
     * Creates a batch table object
     * @param {Object} json - batch table json part
     * @param {ArrayBuffer} binary - buffer representing the batch table
     * binary part (not supported yet)
     */
    constructor(json, binary) {
        if (binary !== undefined) {
            console.warn('Binary batch table content not supported yet.');
        }
        // Store batch table content
        this.content = json;
        // Compute the length of the batch (i.e. the number of features)
        // Note: The batchLength could also be retrieved from the feature table
        // which is currently not supported
        if (Object.keys(this.content).length === 0) {
            console.warn('Batch table is empty.');
            this.batchLength = 0;
        } else {
            this.batchLength =
                this.content[Object.keys(this.content)[0]].length;
        }
    }

    /**
     * Creates and returns a javascript object holding the displayable
     * information from the batch table
     * @param {integer} featureId - id of the feature
     * @returns {Object} - displayable information relative to the batch table
     * for the feature with id=featureId. Object is
     * formatted as follow: {BatchTable: {BatchTableFeatureProperties}
     */
    getPickingInfo(featureId) {
        const featureDisplayableInfo = {};
        if (this.batchLength === 0) { return; }
        if (featureId < 0) {
            throw new Error(`Batch Id (${featureId}) must be positive to access
            feature properties from the batch table.`);
        }
        if (featureId < this.batchLength) {
            // Get properties from batch table content
            Object.keys(this.content).forEach((property) => {
                featureDisplayableInfo[property] = this.content[property][featureId];
            });
        } else {
            throw new Error(
                `Batch Id (${featureId}) must be inferior to batch length 
                (${this.batchLength}) to access feature properties in batch 
                table.`);
        }
        const BTDisplayableInfo = { BatchTable: featureDisplayableInfo };
        return BTDisplayableInfo;
    }
}

export default {
    /** @module BatchTableParser */

    /** Parse batch table buffer and returns a promise that resolves with a
     *  BatchTable object.
     * @function parse
     * @param {ArrayBuffer} buffer - the batch table buffer.
     * @param {integer} BTBinaryLength - length of the binary part of the
     * batch table
     * @return {Promise} - a promise that resolves with a BatchTable object.
     *
     */
    parse(buffer, BTBinaryLength) {
        // Batch table has a json part and can have a binary part (not
        // supported yet)
        let binary;
        let jsonBuffer = buffer;
        if (BTBinaryLength > 0) {
            binary = buffer.slice(buffer.byteLength - BTBinaryLength);
            jsonBuffer =
                buffer.slice(0, buffer.byteLength - BTBinaryLength);
        }
        const content = utf8Decoder.decode(new Uint8Array(jsonBuffer));
        const json = JSON.parse(content);

        return Promise.resolve(new BatchTable(json, binary));
    },
};
