import Source from 'Source/Source';

/**
 * @classdesc OrientedImageSource is a specific source used to load oriented images.
 * @extends Source
 */
class OrientedImageSource extends Source {
    /**
     * @constructor
     * @param { Object } source - Configuration object
     * @param { string } source.url - Url for all the textures.
     * This Url must contains {sensorId} and {cameraId}, and these pattern will be replaced to build the Url,
     * to find the good texture for each camera for each panoramic.
     */
    constructor(source) {
        source.format = source.format || 'json';
        super(source);
        this.isOrientedImageSource = true;
    }

    /**
     * Build the url of the texture, but not from extent.
     *
     * @param      {Object}  imageInfo - Information about the texture
     * @param      {string}  imageInfo.camera - Id of the camera
     * @param      {string}  imageInfo.pano - Id of the panoramic
     * @return     {string}  Url of the image
     */
    urlFromExtent(imageInfo) {
        return this.imageUrl(imageInfo.cameraId, imageInfo.panoId);
    }

    /**
     * Build the url of the image, for a given panoramic id, and a given camera id.
     *
     * @param      {string}  cameraId  Id of the camera
     * @param      {string}  panoId   Id of the panoramic
     * @return     {string}  Url of the image
     */
    imageUrl(cameraId, panoId) {
        return this.url.replace('{cameraId}', cameraId).replace('{panoId}', panoId);
    }
}

export default OrientedImageSource;
