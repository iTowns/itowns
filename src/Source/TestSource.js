import Source from 'Source/Source';
import Fetcher from 'Provider/Fetcher';
import AlegoriaUtils from 'Utils/AlegoriaUtils';
import * as PhotogrammetricCamera from 'photogrammetric-camera';


/**
 * @classdesc OrientedImageSource is a specific source used to load oriented images.
 * @extends Source
 */
class TestSource extends Source {
    /**
     * @constructor
     * @param { Object } source - Configuration object
     * @param { string } source.url - Url for all the textures.
     * @param { string } source.orientationsUrl - Json Url, using GeoJSon format to represent points,
     * it's a set of panoramic position and orientation.
     * @param { string } source.calibrationUrl - Json url, representing a set of camera. see [CameraCalibrationParser]{@link module:CameraCalibrationParser}
     * This Url must contains {sensorId} and {cameraId}, and these pattern will be replaced to build the Url,
     * to find the good texture for each camera for each panoramic.
     */
    constructor(source) {
        super({ url: source.path + source.file });
        this.isTestSource = true;

        AlegoriaUtils.loadJSON('data/alegoria/', 'chalon.json').then(data => console.log('result:\n', data));

        this.whenReady = AlegoriaUtils.loadJSON(source.path, source.file).then(data => ({
            textures: data[0],
            cameras: data[1],
        }));
    }
}

export default TestSource;
