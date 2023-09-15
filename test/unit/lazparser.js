import assert from 'assert';
import { HttpsProxyAgent } from 'https-proxy-agent';
import LAZParser from 'Parser/LAZParser';
import Fetcher from 'Provider/Fetcher';

describe('LAZParser', function () {
    let lazChunk;

    before(async function () {
        const networkOptions = process.env.HTTPS_PROXY ? {
            agent: new HttpsProxyAgent(process.env.HTTPS_PROXY),
            headers: { range: 'bytes=79462688-80225945' },
        } : {
            headers: { range: 'bytes=79462688-80225945' },
        };
        const url = 'https://s3.amazonaws.com/hobu-lidar/autzen-classified.copc.laz';
        lazChunk = await Fetcher.arrayBuffer(url, networkOptions);
        LAZParser.setLazPerf('./node_modules/laz-perf/lib');
    });

    it('parses a laz file to a THREE.BufferGeometry', async function () {
        const min = [635577.79, 848882.15, 406.14];
        const max = [639003.73, 853537.66, 615.26];

        const header = {
            pointDataRecordFormat: 7,
            pointDataRecordLength: 36,
            scale: [0.01, 0.01, 0.01],
            offset: [637290.75, 851209.9, 510.7],
        };
        const bufferGeometry = await LAZParser.parseChunk(lazChunk, {
            in: {
                pointCount: 61201,
                header,
                eb: [],
            },
            out: {},
        });

        const epsilon = 0.1;

        assert.ok(bufferGeometry.boundingBox.min.x + epsilon >= min[0]);
        assert.ok(bufferGeometry.boundingBox.min.y + epsilon >= min[1]);
        assert.ok(bufferGeometry.boundingBox.min.z + epsilon >= min[2]);
        assert.ok(bufferGeometry.boundingBox.max.x - epsilon <= max[0]);
        assert.ok(bufferGeometry.boundingBox.max.y - epsilon <= max[1]);
        assert.ok(bufferGeometry.boundingBox.max.z - epsilon <= max[2]);
    });
});
