import assert from 'assert';
import HttpsProxyAgent from 'https-proxy-agent';
import LASParser from 'Parser/LASParser';
import Fetcher from 'Provider/Fetcher';

describe('LASParser', function () {
    let lasData;
    let lazData;

    function compareWithEpsilon(a, b, epsilon) {
        return a - epsilon < b && a + epsilon > b;
    }

    before(async () => {
        const networkOptions = process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {};
        const baseurl = 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds/';
        lazData = await Fetcher.arrayBuffer(`${baseurl}data_test.laz`, networkOptions);
        lasData = await Fetcher.arrayBuffer(`${baseurl}data_test.las`, networkOptions);
    });

    it('parses a las file to a THREE.BufferGeometry', async () => {
        const bufferGeometry = await LASParser.parse(lasData);
        assert.strictEqual(bufferGeometry.userData.pointsCount, 106);
        assert.strictEqual(bufferGeometry.attributes.position.count, bufferGeometry.userData.pointsCount);
        assert.strictEqual(bufferGeometry.attributes.intensity.count, bufferGeometry.userData.pointsCount);
        assert.strictEqual(bufferGeometry.attributes.classification.count, bufferGeometry.userData.pointsCount);
        assert.strictEqual(bufferGeometry.attributes.color, undefined);

        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.x, bufferGeometry.userData.mins[0], 0.1));
        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.y, bufferGeometry.userData.mins[1], 0.1));
        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.z, bufferGeometry.userData.mins[2], 0.1));
        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.x, bufferGeometry.userData.maxs[0], 0.1));
        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.y, bufferGeometry.userData.maxs[1], 0.1));
        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.z, bufferGeometry.userData.maxs[2], 0.1));
    });

    it('parses a laz file to a THREE.BufferGeometry', async () => {
        const bufferGeometry = await LASParser.parse(lazData);
        assert.strictEqual(bufferGeometry.userData.pointsCount, 57084);
        assert.strictEqual(bufferGeometry.attributes.position.count, bufferGeometry.userData.pointsCount);
        assert.strictEqual(bufferGeometry.attributes.intensity.count, bufferGeometry.userData.pointsCount);
        assert.strictEqual(bufferGeometry.attributes.classification.count, bufferGeometry.userData.pointsCount);
        assert.strictEqual(bufferGeometry.attributes.color, undefined);

        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.x, bufferGeometry.userData.mins[0], 0.1));
        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.y, bufferGeometry.userData.mins[1], 0.1));
        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.z, bufferGeometry.userData.mins[2], 0.1));
        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.x, bufferGeometry.userData.maxs[0], 0.1));
        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.y, bufferGeometry.userData.maxs[1], 0.1));
        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.z, bufferGeometry.userData.maxs[2], 0.1));
    });
});
