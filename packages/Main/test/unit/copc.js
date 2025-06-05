import assert from 'assert';
import { HttpsProxyAgent } from 'https-proxy-agent';
import CopcSource from 'Source/CopcSource';
import CopcLayer from 'Layer/CopcLayer';

const copcUrl = 'https://s3.amazonaws.com/hobu-lidar/autzen-classified.copc.laz';

describe('COPC', function () {
    let source;

    describe('Copc Source', function () {
        describe('retrieving crs from wkt information', function () {
            it('wkt.srs.type is COMPD_CS', function (done) {
                const networkOptions = process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {};
                source = new CopcSource({
                    url: copcUrl,
                    networkOptions,
                });
                source.whenReady
                    .then((headers) => {
                        assert.ok(headers.header.pointCount);
                        assert.ok(headers.info.spacing);
                        assert.ok(Array.isArray(headers.eb));
                        assert.equal(source.crs, 'EPSG:2992');
                        done();
                    }).catch(done);
            }).timeout(5000);
        });

        describe('Copc Layer', function () {
            it('instanciates a layer', (done) => {
                const layer = new CopcLayer('copc', { source, crs: 'EPSG:4978' });
                layer.whenReady
                    .then(() => {
                        assert.equal(layer.zmin, source.header.min[2]);
                        assert.ok(layer.root.isCopcNode);
                        assert.ok(layer.root._position.isVector3);
                        done();
                    }).catch(done);
            });
        });
    });
});
