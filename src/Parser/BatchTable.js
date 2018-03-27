import utf8Decoder from '../utils/Utf8Decoder';

export default {
    parse(buffer) {
        const content = utf8Decoder.decode(new Uint8Array(buffer));
        const json = JSON.parse(content);
        return json;
    },
};
