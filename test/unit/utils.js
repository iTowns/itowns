export function compareWithEpsilon(a, b, epsilon) {
    return a - epsilon < b && a + epsilon > b;
}

export function compareArrayWithEpsilon(arr1, arr2, epsilon) {
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < arr1.length; i++) {
        if (!compareWithEpsilon(arr1[i], arr2[i], epsilon)) {
            return false;
        }
    }
    return true;
}

// encode a javascript object into an arraybuffer (based on the 3D Tiles batch table encoding)
export function obj2ArrayBuff(obj) {
    const objJSON = JSON.stringify(obj);
    const encoder = new TextEncoder();
    const objUtf8 = encoder.encode(objJSON);
    const objUint8 = new Uint8Array(objUtf8);
    return objUint8.buffer;
}
