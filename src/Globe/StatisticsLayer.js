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
       
        this.statisticsMesh = null; 
        this.name = "StatisticsLayer";
        this.mainMesh = new THREE.Mesh();
        this.add(this.mainMesh);
        
        this.statsCollection_Provider = new StatsCollection_Provider();
        this.dataUrl = [];  
     }
        
    StatisticsLayer.prototype = Object.create(Layer.prototype);
    StatisticsLayer.prototype.constructor = StatisticsLayer;


    StatisticsLayer.prototype.addDataUrl = function(url){
        
        this.dataUrl.push(url);
    };
    
    // n is position of data in array (will be associatif soon)
    StatisticsLayer.prototype.showData = function(n){
        
        this.statsCollection_Provider.getData(this.dataUrl[n]).then(function(mesh){
            
            this.statisticsMesh = mesh;
            this.mainMesh.add(this.statisticsMesh);
            gfxEngine().renderScene(); 
            
        }.bind(this));
    
    };    
    
   
    return StatisticsLayer;

});
