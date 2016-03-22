/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


define('Globe/StatisticsLayer', [ 'Scene/Layer', 'THREE', 'Renderer/c3DEngine', 
    'Core/Commander/Providers/StatsCollection_Provider'],
     function(Layer, THREE, gfxEngine, StatsCollection_Provider) {

     function StatisticsLayer() {

        Layer.call(this);
       
        this.statisticsMesh = new THREE.Mesh(); 
        this.name = "StatisticsLayer";
        this.mainMesh = new THREE.Mesh();
        this.add(this.mainMesh);
      //  this.mainMesh.add(this.statisticsMesh);
        
        this.statsCollection_Provider = new StatsCollection_Provider();
        this.dataUrl = [];  
     }
        
    StatisticsLayer.prototype = Object.create(Layer.prototype);
    StatisticsLayer.prototype.constructor = StatisticsLayer;


    StatisticsLayer.prototype.addDataUrl = function(name, properties){
        
        //this.dataUrl.push(url);
        this.dataUrl[name] = properties;
    };
    
    // n is position of data in array (will be associatif soon)
    StatisticsLayer.prototype.showData = function(name){
        
        this.statsCollection_Provider.getData(this.dataUrl[name].url).then(function(mesh){
            
            this.statisticsMesh = mesh;
            this.mainMesh.add(this.statisticsMesh);
            gfxEngine().renderScene(); 
            
        }.bind(this));
    
    };    
    
   
    return StatisticsLayer;

});
