import assert from 'assert';
import { HttpsProxyAgent } from 'https-proxy-agent';
import LASParser from 'Parser/LASParser';
import Fetcher from 'Provider/Fetcher';
import { compareWithEpsilon } from './utils';

describe('LASParser', function () {
    let lasData;
    let lazData;
    let lazDataV1_4;

    before(async () => {
        const networkOptions = process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {};
        const baseurl = 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds/';
        lazData = await Fetcher.arrayBuffer(`${baseurl}data_test.laz`, networkOptions);
        lasData = await Fetcher.arrayBuffer(`${baseurl}data_test.las`, networkOptions);
        lazDataV1_4 = await Fetcher.arrayBuffer(`${baseurl}ellipsoid-1.4.laz`, networkOptions);
        LASParser.enableLazPerf('./examples/libs/laz-perf');
    });

    it('parses a las file to a THREE.BufferGeometry', async () => {
        const bufferGeometry = await LASParser.parse(lasData);
        assert.strictEqual(bufferGeometry.userData.pointCount, 106);
        assert.strictEqual(bufferGeometry.attributes.position.count, bufferGeometry.userData.pointCount);
        assert.strictEqual(bufferGeometry.attributes.intensity.count, bufferGeometry.userData.pointCount);
        assert.strictEqual(bufferGeometry.attributes.classification.count, bufferGeometry.userData.pointCount);
        assert.strictEqual(bufferGeometry.attributes.color, undefined);

        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.x + bufferGeometry.userData.origin.x, bufferGeometry.userData.min[0], 0.1));
        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.y + bufferGeometry.userData.origin.y, bufferGeometry.userData.min[1], 0.1));
        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.z + bufferGeometry.userData.origin.z, bufferGeometry.userData.min[2], 0.1));
        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.x + bufferGeometry.userData.origin.x, bufferGeometry.userData.max[0], 0.1));
        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.y + bufferGeometry.userData.origin.y, bufferGeometry.userData.max[1], 0.1));
        assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.z + bufferGeometry.userData.origin.z, bufferGeometry.userData.max[2], 0.1));
    });

    describe('parses a laz file to a THREE.BufferGeometry', function () {
        it('laz v1.2', async () => {
            const bufferGeometry = await LASParser.parse(lazData);
            assert.strictEqual(bufferGeometry.userData.pointCount, 57084);
            assert.strictEqual(bufferGeometry.attributes.position.count, bufferGeometry.userData.pointCount);
            assert.strictEqual(bufferGeometry.attributes.intensity.count, bufferGeometry.userData.pointCount);
            assert.strictEqual(bufferGeometry.attributes.classification.count, bufferGeometry.userData.pointCount);
            assert.strictEqual(bufferGeometry.attributes.color, undefined);

            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.x + bufferGeometry.userData.origin.x, bufferGeometry.userData.min[0], 0.1));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.y + bufferGeometry.userData.origin.y, bufferGeometry.userData.min[1], 0.1));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.z + bufferGeometry.userData.origin.z, bufferGeometry.userData.min[2], 0.1));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.x + bufferGeometry.userData.origin.x, bufferGeometry.userData.max[0], 0.1));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.y + bufferGeometry.userData.origin.y, bufferGeometry.userData.max[1], 0.1));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.z + bufferGeometry.userData.origin.z, bufferGeometry.userData.max[2], 0.1));
        });

        it('laz v1.4', async () => {
            const bufferGeometry = await LASParser.parse(lazDataV1_4);
            assert.strictEqual(bufferGeometry.userData.pointCount, 100000);
            assert.strictEqual(bufferGeometry.attributes.position.count, bufferGeometry.userData.pointCount);
            assert.strictEqual(bufferGeometry.attributes.intensity.count, bufferGeometry.userData.pointCount);
            assert.strictEqual(bufferGeometry.attributes.classification.count, bufferGeometry.userData.pointCount);
            assert.strictEqual(bufferGeometry.attributes.color.count, bufferGeometry.userData.pointCount);

            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.x + bufferGeometry.userData.origin.x, bufferGeometry.userData.min[0], 0.1));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.y + bufferGeometry.userData.origin.y, bufferGeometry.userData.min[1], 0.1));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.z + bufferGeometry.userData.origin.z, bufferGeometry.userData.min[2], 0.1));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.x + bufferGeometry.userData.origin.x, bufferGeometry.userData.max[0], 0.1));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.y + bufferGeometry.userData.origin.y, bufferGeometry.userData.max[1], 0.1));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.z + bufferGeometry.userData.origin.z, bufferGeometry.userData.max[2], 0.1));
        });
    });
});
