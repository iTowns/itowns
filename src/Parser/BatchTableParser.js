import utf8Decoder from 'Utils/Utf8Decoder';
import { $3dTilesExtensions } from 'Layer/C3DTilesLayer';

/** @classdesc
 * Class representing a 3D Tiles batch table
 */
class BatchTable {
    /**
     * @param {Object} json - batch table json part
     * @param {ArrayBuffer} binary - buffer representing the batch table
     * @param {number} batchLength the length of the batch.
     * binary part (not supported yet)
     */
    constructor(json, binary, batchLength) {
        if (binary !== undefined) {
            console.warn('Binary batch table content not supported yet.');
        }
        // Store batch table content
        this.content = json;
        // Compute the length of the batch (i.e. the number of features)
        // Note: The batchLength could also be retrieved from the feature table
        // which is currently not supported
        if (batchLength != undefined) {
            this.batchLength = batchLength;
        } else if (Object.keys(this.content).length === 0) {
            console.warn('Batch table is empty.');
            this.batchLength = 0;
        } else {
            this.batchLength =
                this.content[Object.keys(this.content)[0]].length;
        }
        // Array storing extensions of the batch table. Key is
        // extension name (registered in $3dTilesExtensions global object).
        // Value is the object returned by the parser associated with the
        // extensions (mapping is done in $3dTilesExtensions global object)
        this.extensions = {};
    }

    /**
     * Creates and returns a javascript object holding the displayable
     * information from the batch table and from extensions of the batch table
     * for a given feature
     * @param {integer} featureId - id of the feature
     * @returns {Object} - displayable information relative to the batch table
     * and its extensions for the feature with id=featureId. Object is
     * formatted as follow: {BatchTable: {BatchTableFeatureProperties},
     * ExtensionName: {ExtensionDisplayableInfo}}
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
        // loop through extensions and append their displayable
        // information to featureDisplayableInfo
        if (this.extensions) {
            Object.keys(this.extensions)
                .forEach((extName) => {
                    const extDisplayableInfo = {
                        [extName]: this.extensions[extName].getPickingInfo(
                            featureId),
                    };
                    Object.assign(BTDisplayableInfo, extDisplayableInfo);
                });
        }
        return BTDisplayableInfo;
    }

    /**
     * Remove an extension from this.content. Must be called when an extension
     * has been parsed and added to this.extensions
     * @param {string} extensionName - the name of the extension to remove
     */
    removeExtensionFromContent(extensionName) {
        // Delete extension from content
        if (this.content.extensions[extensionName]) {
            delete this.content.extensions[extensionName];
        }
        // Delete extensions from content if empty
        if (Object.keys(this.content.extensions).length === 0) {
            delete this.content.extensions;
        }
    }
}

/**
 * @module BatchTableParser
 */
export default {
    /** Parse a batch table buffer and returns a promise that resolves with a
     *  BatchTable object.
     * @param {ArrayBuffer} buffer - the batch table buffer.
     * @param {integer} BTBinaryLength - length of the binary part of the
     * batch table
     * @param {number} BATCH_LENGTH the length of the batch.
     * @return {Promise} - a promise that resolves with a BatchTable object.
     *
     */
    parse(buffer, BTBinaryLength, BATCH_LENGTH) {
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

        const batchTable = new BatchTable(json, binary, BATCH_LENGTH);

        const promises = [];
        // When an extension is found, we call its parser and append the
        // returned object to batchTable.extensions
        // Extensions must be registered in $3dTilesExtensions global object
        // where an extension name is mapped to a parser.
        if (json.extensions) {
            Object.keys(json.extensions)
                .forEach((extName) => {
                    if ($3dTilesExtensions.isExtensionRegistered(extName)) {
                        const extensionParser = $3dTilesExtensions.getParser(
                            extName);
                        promises.push(extensionParser(json.extensions[extName])
                            .then((extObject) => {
                                batchTable.extensions[extName] = extObject;
                                batchTable.removeExtensionFromContent(extName);
                            }));
                    }
                });
        }
        // values[0] is the results of the first promise pushed in promises,
        // i.e. batchTable
        return Promise.all(promises).then(() => batchTable);
    },
};
