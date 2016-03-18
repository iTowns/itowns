/**
 * Generated On: 2016-10-5
 * Class: MobileMappingLayer
 * Description: Layer for mobileMappingData
 */

define('MobileMapping/MobileMappingLayer', [
    'Scene/Layer',
    'THREE',
    'Renderer/PanoramicMesh',
    'Renderer/c3DEngine',
    'Core/Geographic/Projection',
    'Core/Commander/Providers/PanoramicProvider'
    
    
], function(Layer, THREE, PanoramicMesh, gfxEngine, Projection, PanoramicProvider) {

    function MobileMappingLayer() {
        //Constructor

        Layer.call(this);
        
        this.panoramicMesh = null; 
        this.name = "MobileMappingLayer";
        this.mainMesh = new THREE.Mesh();
        this.add(this.mainMesh);
        
        this.panoramicProvider = null;
        
        window.addEventListener('mousedown', onMouseDown, false);
    
        
    }

    MobileMappingLayer.prototype = Object.create(Layer.prototype);
    MobileMappingLayer.prototype.constructor = MobileMappingLayer;

    
    function onMouseDown(){
        
        var pos = gfxEngine().controls.getPointGlobe();
        var posWGS84 = new Projection().cartesianToGeo(pos);
        console.log("position clicked: ",pos, "wgs, longitude:", posWGS84.longitude/ Math.PI * 180, "   '",posWGS84.latitude/ Math.PI * 180, "  alti:", posWGS84.altitude);
       
        /* 
        // Check closest pano and go
        var projectiveMesh = panoramicProvider.getTextureProjectiveMesh(2.3348138,48.8506030,1000).then(function(projMesh){
                    mobileMappingLayer = new MobileMappingLayer(projMesh);               
                    this.add(mobileMappingLayer);
                    this.updateScene3D();
                    }.bind(this));
        
        gfxEngine().camera.camera3D.position.set( pos.x, pos.y, pos.z);
        */
    }
    
    
    MobileMappingLayer.prototype.initiatePanoramic = function(imageOpt){
        
        var imagesOptions =  imageOpt || this.getDefaultOptions();
        console.log(this.defaultOptions);
        // Create and add the MobileMappingLayer with Panoramic imagery
        this.panoramicProvider = new PanoramicProvider(imagesOptions);
        
        this.panoramicProvider.getTextureProjectiveMesh(2.3348138,48.8506030,1000).then(function(projMesh){
            
            this.panoramicMesh   = projMesh;
            this.mainMesh.add(this.panoramicMesh);
            //  this.updateScene3D();
        }.bind(this));
    };
    
    
    MobileMappingLayer.prototype.getDefaultOptions = function(){
              
        return {
         // HTTP access to itowns sample datasets
          //url : "../{lod}/images/{YYMMDD}/Paris-{YYMMDD}_0740-{cam.cam}-00001_{pano.pano:07}.jpg",
          url : "../{lod}/images/{YYMMDD2}/Paris-{YYMMDD2}_0740-{cam.cam}-00001_{splitIt}.jpg",
          lods : ['itowns-sample-data'],//['itowns-sample-data-small', 'itowns-sample-data'],
            /*
            // IIP server access    
                website   : "your.website.com",
                path    : "your/path",
                url : "http://{website}/cgi-bin/iipsrv.fcgi?FIF=/{path}/{YYMMDD}/Paris-{YYMMDD}_0740-{cam.id}-00001_{pano.id:07}.jp2&WID={lod.w}&QLT={lod.q}&CVT=JPEG",
                lods : [{w:32,q:50},{w:256,q:80},{w:2048,q:80}],
            */    
          cam       : "../dist/itowns-sample-data/cameraCalibration.json",
          pano      : "../dist/itowns-sample-data/panoramicsMetaData.json",
          buildings : "../dist/itowns-sample-data/buildingFootprint.json",
          DTM       : "../dist/itowns-sample-data/dtm.json",
          YYMMDD2 : function() {  //"filename":"Paris-140616_0740-00-00001_0000500"
            return this.pano.filename.match("-(.*?)_")[1];
          },
          splitIt : function(){
              return this.pano.filename.split("_")[2];
          },
          YYMMDD : function() {
            var d = new Date(this.pano.date);
            return (""+d.getUTCFullYear()).slice(-2) + ("0"+(d.getUTCMonth()+1)).slice(-2) + ("0" + d.getUTCDate()).slice(-2);
          },
          UTCOffset : 15,
          seconds : function() {
            var d = new Date(this.pano.date);
            return (d.getUTCHours()*60 + d.getUTCMinutes())*60+d.getUTCSeconds()-this.UTCOffset;
          },
          visible: true
        };     
     };
    



                
                
    return MobileMappingLayer;

});
