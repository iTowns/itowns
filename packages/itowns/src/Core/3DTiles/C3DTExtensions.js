/** @classdesc
 * Class for managing
 * [3D Tiles extensions](https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/extensions).
 * Extensions used in a 3D Tiles tileset must be registered in the iTowns' layer
 * holding the tileset by the user with the {@link registerExtension}
 * method. The extension must be registered together with a class holding the
 * code to interpret the extension.
 * An example of extension class is {@link $3DTBatchTableHierarchyExtension}.
 * This extension has only one part situated in the batch table (but other
 * extensions can have multiple parts, stored in different 3D Tiles classes
 * such as tileset or bounding volume).
 * @example
 * // Create a C3DTExtensions object
 * const extensions = new itowns.C3DTExtensions();
 * // Register an extension to it named "3DTILES_batch_table_hierarchy" and
 * // a class itowns.C3DTBatchTableHierarchyExtension to the batch table part
 * // (with [itowns.C3DTilesTypes.batchtable]). see {@link C3DTilesTypes}
 * extensions.registerExtension("3DTILES_batch_table_hierarchy",
 * { [itowns.C3DTilesTypes.batchtable]: itowns.C3DTBatchTableHierarchyExtension });
 *
 * // Create a 3D Tiles layer with registered extensions
 * var $3dTilesLayerBTHierarchy = new itowns.C3DTilesLayer('3d-tiles-bt-hierarchy', {
 *      name: 'BTHierarchy',
 *      source: new itowns.C3DTilesSource({
 *          url: 'https://raw.githubusercontent.com/AnalyticalGraphicsInc/cesium/master/Apps/SampleData/Cesium3DTiles/Hierarchy/BatchTableHierarchy/tileset.json',
 *          }),
 *          registeredExtensions: extensions,
 *      },
 * view);
 */

class C3DTExtensions {
    /**
     * Register a 3D Tiles extension: Maps an extension name to the
     * extensionsManagers (i.e. one class per 3D Tiles class (e.g.
     * batch table or bounding volume).
     * @param {string} extensionName - Name of the extension
     * @param {object} extensionManagers - An object mapping 3D Tiles
     * classes names (see @link{C3DTilesTypes} to the extension managers
     * corresponding to this class. These extension managers should be able
     * to parse the extension fragment (done in the constructor) and should
     * have a getInfoById method if they are related to the batch table class.
     * See {@link $3DTBatchTableHierarchyExtension} for an example of
     * extension class.
     */
    registerExtension(extensionName, extensionManagers) {
        this[extensionName] = extensionManagers;
    }

    /**
     * Get an extension manager from its name and C3DTilesType
     * @param {string} extensionName - name of the extension.
     * @param {C3DTilesTypes} type - type of 3DTiles class (e.g. batch
     * table, bounding volume, tileset, etc.)
     * @returns {object} - the extension manager corresponding to the
     * extensioNname and type.
     */
    getExtension(extensionName, type) {
        if (this[extensionName] && this[extensionName][type]) {
            return this[extensionName][type];
        } else {
            console.error(`${'No extension manager registered for' +
            ' extension '} ${extensionName} and for class ${type}`);
        }
    }

    /**
     * Test if an extension is registered
     * @param {string} extensionName - Name of the extension
     * @returns {boolean} - true if the extension is registered and false
     * otherwise.
     */
    isExtensionRegistered(extensionName) {
        return this[extensionName];
    }

    /**
     * Parses the extensions from a given JSON (extensionsJSON) by
     * instanciating the right class from the registered extensions.
     * @param {object} extensionsJSON - the JSON to parse extensions from.
     * @param {C3DTilesTypes} type - type of class asking for extensions parsing
     * has been called. For instance, if {@link C3DTBatchTable} needs to
     * parse its extensions, it will call parseExtension with the JSON to
     * parse and C3DTilesTypes.batchtable as type.
     * @returns {object} - An object with keys being the names of the
     * extensions and values the instances of the extensions managers.
     */
    parseExtensions(extensionsJSON, type) {
        const parsedExtensions = {};
        for (const extName in extensionsJSON) {
            if (Object.prototype.hasOwnProperty.call(extensionsJSON, extName)) {
                parsedExtensions[extName] = new (this.getExtension(extName, type))(extensionsJSON[extName]);
            }
        }
        return parsedExtensions;
    }
}

export default C3DTExtensions;
