import Source from 'Source/Source';
import AlegoriaUtils from 'Utils/AlegoriaUtils';

/**
 * @classdesc AlegoriaSource is a specific source used to load oriented cameras and textures.
 * @extends Source
 */
class AlegoriaSource extends Source {
    /**
     * @constructor
     * @param { Object } source - Configuration object
     * @param { string } source.path - Url (path) to the json file.
     * @param { string } source.file - Json file containing related calibrations, orientations, textures and dates.
     */
    constructor(source) {
        super({ url: source.path + source.file });
        this.isAlegoriaSource = true;

        this.whenReady = AlegoriaUtils.loadJSON(source.path, source.file).then(data => ({
            textures: data[0],
            cameras: data[1],
        }));
    }
}

export default AlegoriaSource;
