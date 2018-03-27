import utf8Decoder from '../utils/Utf8Decoder';

export default {
    /** @module BatchTableParser */
    /** Parse batch table buffer and convert to JSON
     * @function parse
     * @param {ArrayBuffer} buffer - the batch table buffer.
     * @return {Promise} - a promise that resolves with a JSON object.
     *
     */
    parse(buffer) {
        const content = utf8Decoder.decode(new Uint8Array(buffer));
        const json = JSON.parse(content);
        return Promise.resolve(json);
    },
};
