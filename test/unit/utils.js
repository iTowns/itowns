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
