/**
 * Generated On: 2015-10-5
 * Class: Globe
 * Description: Le globe est le noeud du globe (node) principale.
 */

define('Globe/Globe', [
    'Core/defaultValue',
    'Scene/Layer',
    'Scene/Quadtree',
    'Scene/SchemeTile',
    'Core/Math/MathExtented',
    'Core/Math/Ellipsoid',
    'Globe/TileMesh',
    'Globe/Atmosphere',
    'Globe/Clouds',
    'Core/System/Capabilities',
    'Core/Geographic/CoordCarto',
    'Renderer/BasicMaterial',
    'THREE'
], function(defaultValue, Layer, Quadtree, SchemeTile, MathExt,
    Ellipsoid, TileMesh, Atmosphere, Clouds, Capabilities,
    CoordCarto, BasicMaterial, THREE) {

    function Globe(size,gLDebug) {
        //Constructor

        Layer.call(this);

        var caps = new Capabilities();
        this.NOIE = !caps.isInternetExplorer();
        this.gLDebug = gLDebug;
        this.size = size;
        this.ellipsoid = new Ellipsoid(this.size);

        this.batiments = new Layer();
        this.layerWGS84Zup = new Layer();

        var kml = new THREE.Object3D();
        this.batiments.add(kml);

        this.batiments.visible = false;

        kml.visible = false;

        this.tiles = new Quadtree(TileMesh, this.SchemeTileWMTS(2), this.size, kml);

        // PROBLEM is not generic : elevationTerrain ,colorTerrain
        this.elevationTerrain = new Layer();
        this.colorTerrain = new Layer();

        this.elevationTerrain.description = {style:{layerTile:0}};
        this.colorTerrain.description = {style:{layerTile:1}};

        this.tiles.add(this.elevationTerrain);
        this.tiles.add(this.colorTerrain);

        this.atmosphere = this.NOIE ? new Atmosphere(this.size) : undefined;
        this.clouds = new Clouds();

        var material = new BasicMaterial(new THREE.Color(1, 0, 0));

        var geometry = new THREE.SphereGeometry(5);
        var batiment = new THREE.Mesh(geometry, material);

        var position = this.ellipsoid.cartographicToCartesian(new CoordCarto().setFromDegreeGeo(0, 48.87, 200));

        position = new THREE.Vector3(4201215.424138484,171429.945145441,4779294.873914789);

        // http://www.apsalin.com/convert-geodetic-to-cartesian.aspx
        // 48.846931,2.337219,50
        position = new THREE.Vector3(4201801.65418896,171495.727885073,4779411.45896233);

        //position = this.ellipsoid.cartographicToCartesian(new CoordCarto().setFromDegreeGeo(48.87, 0, 200));

        batiment.frustumCulled = false;
        //material.wireframe      = true;
        batiment.position.copy(position);

        var material2 = new BasicMaterial(new THREE.Color(1, 0.5, 1));
        material2.visible = false;
        var batiment2 = new THREE.Mesh(geometry, material2);
        var position2 = this.ellipsoid.cartographicToCartesian(new CoordCarto().setFromDegreeGeo(0.001, 48.87, 100));
        batiment2.frustumCulled = false;
        material2.wireframe = true;
        batiment2.position.copy(position2);

        //kml.add( batiment );
        //kml.add( batiment2 );

        var zUp = new THREE.Object3D();

        zUp.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ));
        zUp.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ),  Math.PI ));

        this.layerWGS84Zup.add(zUp);
        zUp.add(new THREE.AxisHelper( 10000000 ));
        zUp.add(batiment);

        this.add(this.tiles);
        this.add(this.batiments);
      /*  //this.add(this.layerWGS84Zup);

        if (this.atmosphere !== undefined && !this.gLDebug) {
            this.atmosphere.add(this.clouds);
            this.add(this.atmosphere);
        }*/
    }

    Globe.prototype = Object.create(Layer.prototype);

    Globe.prototype.constructor = Globe;

    /**
     * @documentation: Rafrachi les mat�riaux en fonction du quadTree ORTHO
     *
     */
    Globe.prototype.QuadTreeToMaterial = function() {
        //TODO: Implement Me

    };

    Globe.prototype.SchemeTileWMTS = function(type) {
        //TODO: Implement Me
        if (type === 2) {
            var schemeT = new SchemeTile();
            schemeT.add(0, MathExt.PI, -MathExt.PI_OV_TWO, MathExt.PI_OV_TWO);
            schemeT.add(MathExt.PI, MathExt.TWO_PI, -MathExt.PI_OV_TWO, MathExt.PI_OV_TWO);
            return schemeT;
        }

    };

    Globe.prototype.showAtmosphere = function(show) {
        if (this.atmosphere !== undefined)
            this.atmosphere.visible = show;

    };

    Globe.prototype.showClouds = function(show, satelliteAnimation) {

        if (/*this.clouds.live === false && */show) {
            this.clouds.generate(satelliteAnimation);
        }
        this.clouds.visible = show;
    };

    Globe.prototype.showKML = function(show) {

        this.batiments.visible = show;

        this.batiments.children[0].visible = show;
    };

    Globe.prototype.updateLightingPos = function(pos) {

        this.atmosphere.updateLightingPos(pos);
        this.clouds.updateLightingPos(pos);
    };

     Globe.prototype.getLayerColor = function(id){

        for (var i = 0; i < this.colorTerrain.children.length; i++) {
            var layer = this.colorTerrain.children[i];
            if(layer.services[0] === id)
                return layer;
        }

        return null;
     }

    Globe.prototype.setLayerOpacity = function(id,opacity){

        var layer = this.getLayerColor(id);

        if(layer)
        {

            layer.opacity = opacity;
            //var idLtile = layer.description.style.layerTile;
            var cO = function(object){

                if(object.material.setLayerOpacity)
                {
                    object.material.setLayerOpacity(object.getIndexLayerColor(id),opacity);
                }

            };

            this.tiles.children[0].traverse(cO);
        }

    };

    Globe.prototype.addColorLayer = function(layerId){

        this.colorTerrain.services.push(layerId);

        var subLayer = new Layer();

        subLayer.services.push(layerId);

        var idLayerTile = this.colorTerrain.children.length;

        subLayer.description = {style:{layerTile:idLayerTile}};

        this.colorTerrain.add(subLayer);

        return subLayer;
    };

    Globe.prototype.moveLayerUp = function(id){

        var colorLayer = this.getLayerColor(id);
        var index = this.colorTerrain.children.indexOf(colorLayer);

        if(index < this.colorTerrain.children.length-1)
            this.moveLayerToIndex(id,index+1)
    };

    Globe.prototype.moveLayerDown = function(id){

        var colorLayer = this.getLayerColor(id);
        var index = this.colorTerrain.children.indexOf(colorLayer);

        if(index > 0)
            this.moveLayerToIndex(id,index-1)
    };

    Globe.prototype.moveLayerToIndex = function(layer,newId){

        var index =  this.colorTerrain.children.indexOf(this.getLayerColor(layer));

        this.colorTerrain.children.splice(newId,0,this.colorTerrain.children.splice(index,1)[0]);
        this.colorTerrain.services.splice(newId,0,this.colorTerrain.services.splice(index,1)[0]);

        var cO = function(object){
            if(object.changeSequenceLayers)
                object.changeSequenceLayers(this.colorTerrain.services);
        }.bind(this);

        this.tiles.children[0].traverse(cO);
    };

    Globe.prototype.removeColorLayer = function(id){

        var colorLayer = this.getLayerColor(id);

        if(colorLayer)
        {
            var cO = function(object){

                if(object.removeLayerColor)
                    object.removeLayerColor(id);
            };

            this.tiles.children[0].traverse(cO);
            var services = this.colorTerrain.services;
            var idService = services.indexOf(id);

            if(idService>-1)
                services.splice(idService,1);

            return true;
        }

        return false;
    };

    Globe.prototype.setLayerVisibility = function(id,visible){

        var layer = this.getLayerColor(id);

        if(layer)
        {

            layer.visible = visible;
            // TODO remove layerTile
            //var idLtile = layer.description.style.layerTile;
            var cO = function(object){

                if(object.material.setLayerVisibility)
                    object.material.setLayerVisibility(object.getIndexLayerColor(id),visible);

            };

            this.tiles.children[0].traverse(cO);
        }

    };

    Globe.prototype.getZoomLevel = function(id){

        var layer = this.getLayerColor(id);

        if(layer)
        {

//            layer.visible = visible;
            var cO = function(/*object*/){

                var zoom = 0;
                return function (object){
                    if(object){
                        zoom = Math.max(zoom,object.level);
                    }
                        return zoom;
                };

            }();
            this.tiles.children[0].traverseVisible(cO);
            return cO();
        }
    };

    Globe.prototype.setRealisticLightingOn = function(bool) {

        this.atmosphere.setRealisticOn(bool);
        this.clouds.setLightingOn(bool);

    };

    return Globe;

});
