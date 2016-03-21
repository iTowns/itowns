/**
 * Generated On: 2016-10-5
 * Class: MobileMappingLayer
 * Description: Layer for mobileMappingData
 */

define('MobileMapping/MobileMappingLayer', [
    'Scene/Layer',
    'THREE',
    'Renderer/PanoramicMesh'
    
], function(Layer, THREE, PanoramicMesh) {

    function MobileMappingLayer(panoramicMesh) {
        //Constructor

        Layer.call(this);
        
        this.panoramicMesh = panoramicMesh;
        this.name = "MobileMappingLayer";
        
        var m = new THREE.Mesh();
        m.add(this.panoramicMesh);   // Add as a son to not conflict for depth rendering
        this.add(m);
    
    }

    MobileMappingLayer.prototype = Object.create(Layer.prototype);
    MobileMappingLayer.prototype.constructor = MobileMappingLayer;



    return MobileMappingLayer;

});
