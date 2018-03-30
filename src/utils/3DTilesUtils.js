function findBatchTableParent(object) {
    if (object.batchTable) {
        return object.batchTable;
    }
    else if (object.parent) {
        return findBatchTableParent(object.parent);
    } else {
        return undefined;
    }
}

function get3DtilePropertiesFromBatchId(batchTable, batchId) {
    const properties = {};
    Object.keys(batchTable).map((objectKey) => {
        properties[objectKey] = batchTable[objectKey][batchId];
        return true;
    });
    return properties;
}

function get3DtilePropertiesFromPtId(tile, pointIndex) {
    const interAttributes = tile.geometry.attributes;
    if (interAttributes && interAttributes._BATCHID) {
        const batchId = interAttributes._BATCHID.array[pointIndex];
        const batchTable = findBatchTableParent(tile);
        const properties = get3DtilePropertiesFromBatchId(batchTable, batchId);
        properties.batchId = batchId;
        return properties;
    }
    return {};
}

export default {
    get3DtilePropertiesFromPtId,
};
