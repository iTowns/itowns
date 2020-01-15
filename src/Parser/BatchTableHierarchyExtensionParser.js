import { $3dTilesAbstractExtension } from 'Layer/C3DTilesLayer';

/** @classdesc
 * Class for storing and accessing information relative to the
 *  [3DTILES_batch_table_hierarchy extension]{@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/extensions/3DTILES_batch_table_hierarchy}
 *  of 3D Tiles */
class BatchTableHierarchyExtension extends $3dTilesAbstractExtension {
    /**
     * @param {Object} json - json holding the extension
     */
    constructor(json) {
        super($3dTilesAbstractExtension);
        this.classes = json.classes;
        // inverseHierarchy contains for each instance (i.e. georgraphic
        // feature e.g. building, roof, etc.) an array of the indexes of its
        // parents. For example, the parents of the instance 0 can be found
        // using inverseHierarchy[0].
        this.inverseHierarchy = {};
        // instancesIdxs contains for each instance of the extension, a
        // javascript object with classId and instanceIdx. classId is the id of
        // the class (from this.classes) of the instance. instanceIdx is the
        // index of the instance in this class. Goal: Ease the retrieval
        // of the properties of an instance
        this.instancesIdxs = [];

        // Counts the number of instances of a class
        const classCounter = {};
        let parentIdsCounter = 0;

        // if omitted, parentCounts is an array of length instancesLength,
        // where all values are 1 (cf. spec)
        let parentCounts = json.parentCounts;
        if (parentCounts === undefined) {
            parentCounts = new Array(json.instancesLength);
            parentCounts.fill(1);
        }

        // for each instance
        for (let i = 0; i < json.instancesLength; i++) {
            // for each parent of the current instance
            for (let j = 0; j < parentCounts[i]; j++) {
                // When an instance's parentId points to itself, then it has no
                // parent" (cf. spec)
                if (i !== json.parentIds[parentIdsCounter]) {
                    if (this.inverseHierarchy[i] === undefined) {
                        this.inverseHierarchy[i] = [];
                    }
                    this.inverseHierarchy[i].push(json.parentIds[parentIdsCounter]);
                    parentIdsCounter++;
                }
            }
            const classId = json.classIds[i];
            if (classCounter[classId] === undefined) {
                classCounter[classId] = 0;
            }
            this.instancesIdxs[i] = {
                classId,
                instanceIdx: classCounter[classId],
            };
            classCounter[classId]++;
        }
    }

    /**
     * Creates and returns a javascript object holding the displayable
     * information relative to this extension and for a given feature and
     * its parents
     * @param {integer} featureId - id of the feature
     * @returns {Object} - displayable information relative to this extension
     * and for the feature with id=featureId and for its parents
     */
    getPickingInfo(featureId) {
        const instanceProperties = {};
        // get feature class name
        const instanceClassId = this.instancesIdxs[featureId].classId;
        const featureClass = this.classes[instanceClassId].name;
        // get feature properties and values
        const instanceIdx = this.instancesIdxs[featureId].instanceIdx;
        Object.keys(this.classes[instanceClassId].instances)
            .forEach((property) => {
                instanceProperties[property] =
                    this.classes[instanceClassId].instances[property][instanceIdx];
            });
        // create return object: className: {featureProperties and values}
        const pickingInfo = {};
        pickingInfo[featureClass] = instanceProperties;
        // If this feature has parent(s), recurse on them
        if (this.inverseHierarchy && this.inverseHierarchy[featureId]) {
            this.inverseHierarchy[featureId].forEach(
                parentId => Object.assign(pickingInfo,
                    this.getPickingInfo(parentId)));
        }
        return pickingInfo;
    }
}

/**
 * @module BatchTableHierarchyExtensionParser
 */
export default {
    /**
     * Parses a
     * [3DTILES_batch_table_hierarchy extension]{@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/extensions/3DTILES_batch_table_hierarchy}
     * and returns a Promise that resolves with a BatchTableHierarchyExtension
     * object.
     * @param {Object} json - json holding the extension
     * @return {Promise} - a promise that resolves with a
     *     BatchTableHierarchyExtension object.
     */
    parse(json) {
        return Promise.resolve(new BatchTableHierarchyExtension(json));
    },
};

