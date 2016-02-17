/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/*
 * A Faire
 * Les tuiles de longitude identique ont le maillage et ne demande pas 1 seule calcul pour la génération du maillage
 * 
 * 
 * 
 * 
 */



import when from 'when';
import Projection from 'Core/Geographic/Projection';
import WMTS_Provider from 'Core/Commander/Providers/WMTS_Provider';
import KML_Provider from 'Core/Commander/Providers/KML_Provider';
import EllipsoidTileGeometry from 'Globe/EllipsoidTileGeometry';
import CoordWMTS from 'Core/Geographic/CoordWMTS';
import Ellipsoid from 'Core/Math/Ellipsoid';
import defaultValue from 'Core/defaultValue';
import BoundingBox from 'Scene/BoundingBox';
import THREE from 'three';

function tileGlobeProvider(size) {
    //Constructor

    this.projection = new Projection();
    this.providerWMTS = new WMTS_Provider();
    //this.providerWMS     = new WMS_Provider();
    this.ellipsoid = new Ellipsoid(size);
    this.providerKML = new KML_Provider(this.ellipsoid);
    this.cacheGeometry = [];
    this.tree = null;
    this.nNode = 0;

}

tileGlobeProvider.prototype.constructor = tileGlobeProvider;

tileGlobeProvider.prototype.getGeometry = function(bbox, cooWMTS) {
    var geometry = undefined;
    var n = Math.pow(2, cooWMTS.zoom + 1);
    var part = Math.PI * 2.0 / n;

    if (this.cacheGeometry[cooWMTS.zoom] !== undefined && this.cacheGeometry[cooWMTS.zoom][cooWMTS.row] !== undefined) {
        geometry = this.cacheGeometry[cooWMTS.zoom][cooWMTS.row];
    } else {
        if (this.cacheGeometry[cooWMTS.zoom] === undefined)
            this.cacheGeometry[cooWMTS.zoom] = new Array();

        var precision = 16;
        var rootBBox = new BoundingBox(0, part + part * 0.01, bbox.minCarto.latitude, bbox.maxCarto.latitude);

        geometry = new EllipsoidTileGeometry(rootBBox, precision, this.ellipsoid, cooWMTS.zoom);
        this.cacheGeometry[cooWMTS.zoom][cooWMTS.row] = geometry;

    }

    return geometry;
};

tileGlobeProvider.prototype.get = function(command) {

    if (command === undefined)
        return when();

    var bbox = command.paramsFunction[0];
    var cooWMTS = this.projection.WGS84toWMTS(bbox);
    var parent = command.requester;
    var geometry = undefined; //getGeometry(bbox,cooWMTS);       
    var tile = new command.type(bbox, cooWMTS, this.ellipsoid, this.nNode++, geometry);

    if (geometry) {
        tile.rotation.set(0, (cooWMTS.col % 2) * (Math.PI * 2.0 / Math.pow(2, cooWMTS.zoom + 1)), 0);
        tile.updateMatrixWorld();
    }

    var translate = new THREE.Vector3();

    if (parent.worldToLocal)
        translate = parent.worldToLocal(tile.absoluteCenter.clone());

    tile.position.copy(translate);
    tile.updateMatrixWorld();

    tile.setVisibility(false);

    tile.link = parent.link;

    parent.add(tile);

    return this.providerWMTS.getTextureBil(tile.useParent() ? undefined : cooWMTS).then(function(terrain) {
        this.setTerrain(terrain);

        return this;

    }.bind(tile)).then(function(tile) {
        if (cooWMTS.zoom >= 2)
            this.getOrthoImages(tile);
        else
            tile.checkOrtho();

        return tile;

    }.bind(this)).then(function(tile) {

        //            if(tile.level  === 16  )
        //            {
        //                var longitude   = tile.bbox.center.x / Math.PI * 180 - 180;
        //                var latitude    = tile.bbox.center.y / Math.PI * 180;
        //
        //                this.providerKML.loadKMZ(longitude, latitude).then(function (collada){
        //                    
        //                    
        //                    if(collada && tile.link.children.indexOf(collada) === -1)
        //                    {         
        //                        tile.link.add(collada);
        //                        tile.content = collada;
        //                    }
        //                }.bind(this));
        //                
        //            }

    }.bind(this));
};

tileGlobeProvider.prototype.getOrthoImages = function(tile) {
    var box = this.projection.WMTS_WGS84ToWMTS_PM(tile.cooWMTS, tile.bbox); // 
    var id = 0;
    var col = box[0].col;
    tile.orthoNeed = box[1].row + 1 - box[0].row;

    for (var row = box[0].row; row < box[1].row + 1; row++) {
        this.providerWMTS.getTextureOrtho(new CoordWMTS(box[0].zoom, row, col), id).then(
            function(result) {
                this.setTextureOrtho(result.texture, result.id);

            }.bind(tile)
        );

        id++;
    }

};

export default tileGlobeProvider;
