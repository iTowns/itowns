import togeojson from '@mapbox/togeojson';
import Source from './Source';
import Fetcher from '../Provider/Fetcher';
import Extent from '../Core/Geographic/Extent';
import GeoJsonParser from '../Parser/GeoJsonParser';

function getExtentFromGpxFile(file) {
    const bound = file.getElementsByTagName('bounds')[0];
    if (bound) {
        const west = bound.getAttribute('minlon');
        const east = bound.getAttribute('maxlon');
        const south = bound.getAttribute('minlat');
        const north = bound.getAttribute('maxlat');
        return new Extent('EPSG:4326', west, east, south, north);
    }
    return new Extent('EPSG:4326', -180, 180, -90, 90);
}

// TODO move and refacto
function fileParser(text) {
    let parsedFile;
    const trimmedText = text.trim();
    // We test the start of the string to choose a parser
    if (trimmedText.startsWith('<')) {
        // if it's an xml file, then it can be kml or gpx
        const parser = new DOMParser();
        const file = parser.parseFromString(text, 'application/xml');
        if (file.documentElement.tagName.toLowerCase() === 'kml') {
            parsedFile = togeojson.kml(file);
        } else if (file.documentElement.tagName.toLowerCase() === 'gpx') {
            parsedFile = togeojson.gpx(file);
            const line = parsedFile.features.find(e => e.geometry.type == 'LineString');
            line.properties.stroke = 'red';
            parsedFile.extent = getExtentFromGpxFile(file);
        } else if (file.documentElement.tagName.toLowerCase() === 'parsererror') {
            throw new Error('Error parsing XML document');
        } else {
            throw new Error('Unsupported xml file, only valid KML and GPX are supported, but no <gpx> or <kml> tag found.',
                file);
        }
    } else if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
        parsedFile = JSON.parse(text);
        if (parsedFile.type !== 'Feature' && parsedFile.type !== 'FeatureCollection') {
            throw new Error('This json is not a GeoJSON');
        }
    } else {
        throw new Error('Unsupported file: only well-formed KML, GPX or GeoJSON are supported');
    }

    return parsedFile;
}

class FileSource extends Source {
    /**
     * File source to use file in {@link GeometryLayer}, {@link ColorLayer} or {@link ElevationLayer}.
     * @constructor
     * @extends Source
     *
     * @param      {sourceParams}  source  The source
     * @param      {string}  source.projection  Data system projection, it needed to parse data
     * @param      {string}  crsOut  crd output data
     *
     * @example <caption>add geometry layer with geojson file </caption>
     * const ariege = new itowns.GeometryLayer('ariege', new itowns.THREE.Group());
     * ariege.update = itowns.FeatureProcessing.update;
     * ariege.convert = itowns.Feature2Mesh.convert({
     *      color: () => new itowns.THREE.Color(0xffcc00),
     *      extrude: () => 5000,
     * });
     * ariege.source = {
     *      protocol: 'file',
     *      url: 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements/09-ariege/departement-09-ariege.geojson',
     *      projection: 'EPSG:4326',
     *      format: 'application/json',
     *      zoom: { min: 7, max: 7 },
     * };
     * view.addLayer(ariege);
     *
     * @example <caption>add color layer with geojson file </caption>
     * globeView.addLayer({
     *     type: 'color',
     *     id: 'Gpx',
     *     name: 'Ultra 2009',
     *     transparent: true,
     *     source: {
     *         url: 'https://raw.githubusercontent.com/iTowns/iTowns2-sample-data/master/ULTRA2009.gpx',
     *         protocol: 'file',
     *         projection: 'EPSG:4326',
     *     },
     * });
     *
     */
    constructor(source, crsOut) {
        if (!source.projection) {
            throw new Error('source.projection is required in FileSource');
        }
        super(source);

        this.url = source.url;
        this.parsedData = [];
        this.zoom = source.zoom || { min: 5, max: 21 };
        const options = {
            buildExtent: true,
            crsIn: this.projection,
            crsOut,
            withNormal: !source.toTexture,
            withAltitude: !source.toTexture,
            mergeFeatures: true,
        };

        this.whenReady = Fetcher.text(this.url, source.networkOptions).then(fileParser).then(parsedFile =>
            GeoJsonParser.parse(parsedFile, options).then((feature) => {
                feature.style = parsedFile.style;
                this.parsedData = feature;
            }));
    }

    urlFromExtent(extent) {
        return `${this.url},${extent.crs()}`;
    }

    extentInsideLimit(extent) {
        const dataExtent = this.parsedData.extent;
        const localExtent = this.projection == extent.crs() ? extent : extent.as(this.projection);
        return (extent.zoom == undefined || !(extent.zoom < this.zoom.min || extent.zoom > this.zoom.max)) &&
            dataExtent.intersectsExtent(localExtent);
    }
}

export default FileSource;
