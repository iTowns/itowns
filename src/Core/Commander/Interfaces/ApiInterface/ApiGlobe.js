/**
 * Generated On: 2015-10-5
 * Class: ApiGlobe
 * Description: Classe façade pour attaquer les fonctionnalités du code.
 */


define('Core/Commander/Interfaces/ApiInterface/ApiGlobe', [
       'Core/Commander/Interfaces/EventsManager',
       'Scene/Scene',
       'Globe/Globe',
       'Core/Commander/Providers/WMTS_Provider'], function(
           EventsManager, 
           Scene,
           Globe,
           WMTS_Provider) {

    function ApiGlobe() {
        //Constructor

        this.scene = null;
        this.commandsTree = null;

    };

    ApiGlobe.prototype = new EventsManager();

    /**
     * @param Command
     */
    ApiGlobe.prototype.add = function(Command) {
        //TODO: Implement Me 

    };


    /**
     * @param commandTemplate
     */
    ApiGlobe.prototype.createCommand = function(commandTemplate) {
        //TODO: Implement Me 

    };

    /**
     */
    ApiGlobe.prototype.execute = function() {
        //TODO: Implement Me 

    };

    ApiGlobe.createSceneGlobe = function(pos) {
        //TODO: Normalement la creation de scene ne doit pas etre ici....
        // A� deplacer plus tard

        this.scene = Scene();
        this.scene.init(pos);

        return this.scene;

    };
    
    ApiGlobe.setLayerAtLevel = function(layer,level) {
        
        
   //     this.scene.removeAll();
   //     this.scene.reInit({ lon:2.3465, lat: 48.88, alt: 25000000});
        
    //    var globe = new Globe();
    //    this.scene.add(globe);
     
   //     this.scene.layers[0].updateQuadtree();
         //this.terrain = new Quadtree(EllipsoidTileMesh, this.SchemeTileWMTS(2), this.size, kml);
     //   this.scene.init({ lon:2.3465, lat: 48.88, alt: 2500000});
       // this.browserScene.addNodeProcess(new NodeProcess(this.currentCamera().camera3D, globe.size));
        
    //    this.scene.browserScene.tree = undefined;
     /*   this.scene.managerCommand.providers[0].providerWMTS.cache.cacheObjects = [];
        this.scene.managerCommand.providers[0].providerWMTS.cache = null;
        this.scene.managerCommand.providers[0].cacheGeometry = [];
    */    console.log(this.scene.managerCommand);//.providers[0]
        var wmtsProvider = new WMTS_Provider({url:"http://a.basemaps.cartocdn.com/", layer:"dark_all/"});
        this.scene.managerCommand.providers[0].providerWMTS = wmtsProvider;
        
        this.scene.browserScene.updateNodeMaterial();
        
       // var currentProviderWMTS = this.scene.managerCommand.providers[0].providerWMTS;
    //    currentProviderWMTS = null;//new WMTS_Provider({url:"http://a.basemaps.cartocdn.com/", layer:"dark_all/"});
    //    console.log(this.scene.managerCommand.providers[0].providerWMTS);
    };

    ApiGlobe.showClouds = function(value) {

        this.scene.layers[0].showClouds(value);
    };

    return ApiGlobe;

});
