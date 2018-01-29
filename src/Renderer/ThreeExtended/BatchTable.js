import { LoaderUtils } from 'three';

export default {
    parse(buffer) {
        const content = LoaderUtils.decodeText(new Uint8Array(buffer));
        const json = JSON.parse(content);
        return json;
    },
};
