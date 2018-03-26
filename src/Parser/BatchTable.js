export default {
    parse(buffer, textDecoder) {
        const content = textDecoder.decode(new Uint8Array(buffer));
        const json = JSON.parse(content);
        return json;
    },
};
