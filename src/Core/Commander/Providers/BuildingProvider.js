/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

import Provider from 'Core/Commander/Providers/Provider';
import IoDriver_JSON from 'Core/Commander/Providers/IoDriver_JSON';
import when from 'when';
import GeoJSONToThree from 'Renderer/ThreeExtented/GeoJSONToThree';
import defaultValue from 'Core/defaultValue';
import CacheRessource from 'Core/Commander/Providers/CacheRessource';

function BuildingProvider(options) {
    //Constructor
    Provider.call(this, new IoDriver_JSON());
    this.cache = CacheRessource();
    this.srs = options.srs;
    this.baseUrl = "http://localhost/server"; // TODO: remove hard-coded values
    this.layer = "lyon_lod2";
    this.format = defaultValue(options.format, "GeoJSON");
    //this.cacheGeometry = [];
}

BuildingProvider.prototype.constructor = BuildingProvider;

BuildingProvider.prototype.url = function(tileId) {
    var url = this.baseUrl + "?query=getGeometry&city=" + this.layer + "&format=" + this.format +
        "&tile=" + tileId /*+ "&ATTRIBUTES="*/ ;
    return url;
};

BuildingProvider.prototype.executeCommand = function(command) {

    var bboxId = command.paramsFunction.bboxId;
    var bbox = command.paramsFunction.bbox;
    var parent = command.requester;


    if (bboxId === undefined) {
        return when(-2);
    }

    var url = this.url(bboxId);
    var cachedTile = this.cache.getRessource(url);
    if (cachedTile !== undefined) {
        return when(cachedTile);
    }

    return this._IoDriver.read(url).then(function(geoJSON) {
        var result = {};
        result.bboxes = geoJSON.tiles;

        result.geometries = [];
        var geoms = GeoJSONToThree.convert(geoJSON.geometries);
        result.geometries = geoms.geometries;

        var params = {
            id: bboxId,
            bbox: bbox,
            level: parent.level + 1,
            childrenBboxes: geoJSON.tiles,
            geometry: geoms.geometries
        };

        var tile = new command.type(params);
        parent.add(tile);

        this.cache.addRessource(url, result);

        return command.resolve(tile);
    }.bind(this));
};

export default BuildingProvider;
