

/**
 * @classdesc
 * Batch Table part of the 3D Tiles
 * [Batch Table Hierarchy Extension](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/extensions/3DTILES_batch_table_hierarchy)
 * @property {object} classes - The classes as defined in the specification.
 * @property {object} inverseHierarchy - InverseHierarchy contains for each
 * instance (i.e. georgraphic feature e.g. building, roof, etc.) an array of the
 * indexes of its parents. For example, the parents of the instance 0 can be
 * found using inverseHierarchy[0].
 * @property {number[]} instancesIdxs - For each instance of the extension,
 * contains a javascript object with classId and instanceIdx. classId is the id
 * of the class (from this.classes) of the instance. instanceIdx is the index of
 * the instance in this class. Goal: Ease the retrieval of the properties of an
 * instance.
 */
class C3DTBatchTableHierarchyExtension {
    /**
     * Constructor of the C3DTBatchTableHierarchyExtension class.
     * @param {Object} json - The parsed json of the batch table part of the 3D
     * Tiles [Batch Table Hierarchy Extension](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/extensions/3DTILES_batch_table_hierarchy)
     */
    constructor(json) {
        this.classes = json.classes;
        this.inverseHierarchy = {};
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
     * information relative to this extension for a given feature.
     * @param {integer} featureId - id of the feature
     * @returns {Object} - displayable information relative to this
     * extension, for the feature with id=featureId and for its parents
     */
    getInfoById(featureId) {
        const instanceProperties = {};
        // get feature class name
        const instanceClassId = this.instancesIdxs[featureId].classId;
        const featureClass = this.classes[instanceClassId].name;
        // get feature properties and values
        const instanceIdx = this.instancesIdxs[featureId].instanceIdx;

        const instances = this.classes[instanceClassId].instances;
        for (const key in instances) {
            if (Object.prototype.hasOwnProperty.call(instances, key)) {
                instanceProperties[key] = instances[key][instanceIdx];
            }
        }
        // create return object: className: {featureProperties and values}
        const pickingInfo = {};
        pickingInfo[featureClass] = instanceProperties;
        // If this feature has parent(s), recurse on them
        if (this.inverseHierarchy && this.inverseHierarchy[featureId]) {
            for (const parentID of this.inverseHierarchy[featureId]) {
                Object.assign(pickingInfo, this.getInfoById(parentID));
            }
        }
        return pickingInfo;
    }
}
export default C3DTBatchTableHierarchyExtension;
