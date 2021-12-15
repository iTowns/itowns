import assert from 'assert';
import HttpsProxyAgent from 'https-proxy-agent';
import Fetcher from 'Provider/Fetcher';
import ISGParser from 'Parser/ISGParser';


describe('ISGParser', function () {
    let text;

    before(async () => {
        const networkOptions = process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {};
        text = await Fetcher.text(
            'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/altitude-conversion-grids/' +
                'raf09.isg',
            networkOptions,
        );
    });

    it('should default `options.in.crs` parameter to `EPSG:4326`', async function () {
        const geoidGrid = await ISGParser.parse(text);
        assert.strictEqual(geoidGrid.extent.crs, 'EPSG:4326');
    });

    it('should parse text data into a GeoidGrid', async function () {
        const geoidGrid = await ISGParser.parse(text, { in: { crs: 'EPSG:4326' } });
        assert.strictEqual(geoidGrid.extent.west, -5.50005);
        assert.strictEqual(geoidGrid.extent.east, 8.50005);
        assert.strictEqual(geoidGrid.extent.south, 42.0);
        assert.strictEqual(geoidGrid.extent.north, 51.5);
        assert.strictEqual(geoidGrid.step.x, 0.0333);
        assert.strictEqual(geoidGrid.step.y, 0.025);
    });

    it('should set a correct data reading method for `GeoidGrid`', async function () {
        const geoidGrid = await ISGParser.parse(text, { in: { crs: 'EPSG:4326' } });
        assert.strictEqual(geoidGrid.getData(1, 1), 53.47);
    });
});
