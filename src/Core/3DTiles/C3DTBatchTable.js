import utf8Decoder from 'Utils/Utf8Decoder';
import C3DTilesTypes from './C3DTilesTypes';

/** @classdesc
 * A 3D Tiles
 * [batch
 * table](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/specification/TileFormats/BatchTable).
 * @property {C3DTilesTypes} type - Used by 3D Tiles extensions
 * (e.g. {@link C3DTBatchTableHierarchyExtension}) to know in which context
 * (i.e. for which 3D Tiles class) the parsing of the extension should be done.
 * @property {number} batchLength - the length of the batch.
 * @property {object} content - the content of the batch table in the form:
 * {property1: values[], property2: values[], ...}.
 * @property {object} extensions - 3D Tiles extensions of the batch table
 * stored in the following format:
 * {extensioName1: extensionObject1, extensioName2: extensionObject2, ...}
 */
class C3DTBatchTable {
    /**
     * @param {ArrayBuffer} buffer - batch table buffer to parse.
     * @param {ArrayBuffer} binaryLength - the length of the binary part of
     * the batch table (not supported yet)
     * @param {number} batchLength - the length of the batch.
     * @param {Object} registeredExtensions - extensions registered to the layer
     */
    constructor(buffer, binaryLength, batchLength, registeredExtensions) {
        this.type = C3DTilesTypes.batchtable;
        this.batchLength = batchLength;

        // Parse Batch table content
        let jsonBuffer = buffer;
        // Batch table has a json part and can have a binary part (not supported yet)
        if (binaryLength > 0) {
            console.warn('Binary batch table content not supported yet.');
            jsonBuffer = buffer.slice(0, buffer.byteLength - binaryLength);
        }

        // Parse JSON content
        const content = utf8Decoder.decode(new Uint8Array(jsonBuffer));
        const json = JSON.parse(content);

        // Separate the content and the possible extensions
        // When an extension is found, we call its parser and append the
        // returned object to batchTable.extensions
        // Extensions must be registered in the layer (see an example of this in
        // 3dtiles_hierarchy.html)
        if (json.extensions) {
            this.extensions =
                registeredExtensions.parseExtensions(json.extensions, this.type);
            delete json.extensions;
        }

        // Store batch table json content
        this.content = json;
    }

    /**
     * Creates and returns a javascript object holding the displayable
     * information from the batch table and from extensions of the batch table,
     * for a given feature (identified with its batchID).
     * @param {integer} batchID - id of the feature
     * @returns {Object} - displayable information relative to the batch
     * table and its extensions. Object is formatted as follow:
     * {batchTable:
     *      {property1: value1
     *       property2: value2
     *       ...}
     *  extensions:
     *      {extension1:
     *          {property1: value1
     *           ...}
     *        extension2: {...}
     *        ...}
     * }
     */
    getInfoById(batchID) {
        // Verify that the batch ID is valid
        if (batchID < 0 && batchID < this.batchLength) {
            throw new Error(`Batch Id (${batchID}) must be between 0 and
            ${this.batchLength} to access feature properties from the batch
            table.`);
        }
        const featureDisplayableInfo = {};
        featureDisplayableInfo.batchTable = {};
        // Get properties from batch table content
        for (const property in this.content) {
            // check that the property is not inherited from prototype chain
            if (Object.prototype.hasOwnProperty.call(this.content, property)) {
                featureDisplayableInfo.batchTable[property] =
                    this.content[property][batchID];
            }
        }

        // Extensions
        if (this.extensions) {
            featureDisplayableInfo.extensions = {};
            for (const extName in this.extensions) {
                if (Object.prototype.hasOwnProperty.call(this.extensions, extName)) {
                    featureDisplayableInfo.extensions[extName] = this.extensions[extName].getInfoById(batchID);
                }
            }
        }
        return featureDisplayableInfo;
    }
}

export default C3DTBatchTable;
