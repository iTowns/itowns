import { Matrix4 } from 'three';
import assert from 'assert';
import Layer from 'Layer/Layer';
import FileSource from 'Source/FileSource';
import { Extent } from '@itowns/geographic';
import sinon from 'sinon';
import Fetcher from 'Provider/Fetcher';

import fileSource from '../../data/filesource/featCollec_Polygone.geojson';

let fetchedData;

describe('FileSource', function () {
    let stubFetcherJson;
    before(function () {
        stubFetcherJson = sinon.stub(Fetcher, 'json')
            .callsFake(() => Promise.resolve(JSON.parse(fileSource)));
    });

    after(function () {
        stubFetcherJson.restore();
    });

    it('should instance FileSource with no source.fetchedData', function _it(done) {
        const urlFilesource = 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/09-ariege/departement-09-ariege.geojson';
        const source = new FileSource({
            url: urlFilesource,
            crs: 'EPSG:4326',
            format: 'application/json',
            extent: new Extent('EPSG:4326', 0, 20, 0, 20),
            zoom: { min: 0, max: 21 },
        });

        source.whenReady
            .then(() => {
                const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
                assert.ok(source.urlFromExtent());
                assert.ok(source.anyVisibleData(extent));
                assert.ok(source.fetchedData);
                assert.ok(!source.features);
                assert.ok(source.isFileSource);
                fetchedData = source.fetchedData;
                assert.equal(fetchedData.features[0].properties.nom, 'Ariège_simplified');
                done();
            }).catch(done);
    });

    it('should instance FileSource with source.fetchedData and parse data with a layer', function (done) {
        // TO DO need cleareance: what is this test for ?
        //  - testing instanceation Filesource when fetchedData and source.feature is already available ?
        //  - testing instantiate Layer ?
        //  - testing source.onLayerAdded ?
        //  - testing souce.loadData ?
        const source = new FileSource({
            fetchedData,
            format: 'application/json',
            crs: 'EPSG:4326',
        });

        assert.ok(!source.features);
        assert.equal(source.urlFromExtent(), 'none');
        assert.ok(source.fetchedData);
        assert.ok(source.isFileSource);

        const layer = new Layer('09-ariege', { crs: 'EPSG:4326', source, structure: '2d' });
        layer.source.onLayerAdded({ out: layer });

        layer.whenReady
            .then(() => {
                source.loadData([], layer)
                    .then((featureCollection) => {
                        assert.equal(featureCollection.features[0].vertices.length, 16);
                        done();
                    })
                    .catch((err) => {
                        done(err);
                    });
            });
        layer._resolve();
    });

    it('should instance and use FileSource with features', function () {
        const extent = new Extent('EPSG:4326', 0, 10, 0, 10);
        const source = new FileSource({
            features: { foo: 'bar', crs: 'EPSG:4326', extent, matrixWorld: new Matrix4() },
            crs: 'EPSG:4326',
            format: 'application/json',
        });
        source.onLayerAdded({ out: { crs: source.crs } });
        assert.ok(source.urlFromExtent(extent).startsWith('none'));
        assert.ok(!source.fetchedData);

        assert.ok(source.isFileSource);
    });

    it('should throw an error for having no required parameters', function () {
        assert.throws(() => new FileSource({}), Error);
        assert.throws(() => new FileSource({ crs: 'EPSG:4326' }), Error);
    });

    it('should set the crs projection from features', function () {
        const source = new FileSource({
            features: { crs: 'EPSG:4326' },
            format: 'application/json',
        });
        assert.strictEqual(source.crs, 'EPSG:4326');
    });
});
