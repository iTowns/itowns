import assert from 'assert';
import { HttpsProxyAgent } from 'https-proxy-agent';
import LASParser from 'Parser/LASParser';
import Fetcher from 'Provider/Fetcher';
import { compareWithEpsilon } from './utils';

const baseurl = 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/pointclouds';
const lasUrl = `${baseurl}/data_test.las`;

const url = 'https://github.com/connormanning/copc.js/raw/master/src/test/data';
const lazV14Url = `${url}/ellipsoid-1.4.laz`;

describe('LASParser', function () {
    let lasData;
    let lazV14Data;
    it('fetch binaries', async function () {
        const networkOptions = process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {};
        lasData = await Fetcher.arrayBuffer(lasUrl, networkOptions);
        lazV14Data = await Fetcher.arrayBuffer(lazV14Url, networkOptions);
    }).timeout(4000);

    describe('unit tests', function () {
        const epsilon = 0.1;
        LASParser.enableLazPerf('./examples/libs/laz-perf');

        it('parses a las file to a THREE.BufferGeometry', async function () {
            if (!lasData) { this.skip(); }
            const bufferGeometry = await LASParser.parse(lasData);
            assert.strictEqual(bufferGeometry.userData.pointCount, 106);
            assert.strictEqual(bufferGeometry.attributes.position.count, bufferGeometry.userData.pointCount);
            assert.strictEqual(bufferGeometry.attributes.intensity.count, bufferGeometry.userData.pointCount);
            assert.strictEqual(bufferGeometry.attributes.classification.count, bufferGeometry.userData.pointCount);
            assert.strictEqual(bufferGeometry.attributes.color, undefined);

            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.x + bufferGeometry.userData.origin.x, bufferGeometry.userData.min[0], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.y + bufferGeometry.userData.origin.y, bufferGeometry.userData.min[1], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.z + bufferGeometry.userData.origin.z, bufferGeometry.userData.min[2], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.x + bufferGeometry.userData.origin.x, bufferGeometry.userData.max[0], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.y + bufferGeometry.userData.origin.y, bufferGeometry.userData.max[1], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.z + bufferGeometry.userData.origin.z, bufferGeometry.userData.max[2], epsilon));
        });

        it('parses a laz file to a THREE.BufferGeometry', async function () {
            if (!lazV14Data) { this.skip(); }
            const bufferGeometry = await LASParser.parse(lazV14Data);
            assert.strictEqual(bufferGeometry.userData.pointCount, 100000);
            assert.strictEqual(bufferGeometry.attributes.position.count, bufferGeometry.userData.pointCount);
            assert.strictEqual(bufferGeometry.attributes.intensity.count, bufferGeometry.userData.pointCount);
            assert.strictEqual(bufferGeometry.attributes.classification.count, bufferGeometry.userData.pointCount);
            assert.strictEqual(bufferGeometry.attributes.color.count, bufferGeometry.userData.pointCount);

            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.x + bufferGeometry.userData.origin.x, bufferGeometry.userData.min[0], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.y + bufferGeometry.userData.origin.y, bufferGeometry.userData.min[1], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.min.z + bufferGeometry.userData.origin.z, bufferGeometry.userData.min[2], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.x + bufferGeometry.userData.origin.x, bufferGeometry.userData.max[0], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.y + bufferGeometry.userData.origin.y, bufferGeometry.userData.max[1], epsilon));
            assert.ok(compareWithEpsilon(bufferGeometry.boundingBox.max.z + bufferGeometry.userData.origin.z, bufferGeometry.userData.max[2], epsilon));
        });
    });
});
