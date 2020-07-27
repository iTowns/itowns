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

    before((done) => {
        Promise.all([Fetcher.arrayBuffer(
            'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds/data_test.las',
            { networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {} },
        ), Fetcher.arrayBuffer(
            'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds/data_test.laz',
            { networkOptions: process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {} },
        )]).then((res) => {
            lasData = res[0];
            lazData = res[1];
            done();
        });
    });

    it('parses a las file to a THREE.BufferGeometry', (done) => {
        LASParser.parse(lasData).then((bufferGeometry) => {
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

            done();
        });
    });

    it('parses a laz file to a THREE.BufferGeometry', (done) => {
        LASParser.parse(lazData).then((bufferGeometry) => {
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

            done();
        });
    });
});
