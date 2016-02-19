define('Core/Commander/Providers/PotreeProvider',[
        'THREE',
        './Potree/POCLoader',
        './Potree/PointCloudOctree',
        './Potree/PointSizeType'
        ], 
        function(
        THREE,        
        POCLoader,
        PointCloudOctree,
        PointSizeType
){

    var sceneInstance  = null;
    var potreeInstance = null;
	var sphere		= null;
    var PotreeProvider = function (scene)
    {
        this.POCLoader = new POCLoader();
        sceneInstance = scene;
        
        this.POCLoader.load("resources/stereotest/cloud.js", function(geometry){
	
		var pointcloud = new PointCloudOctree(geometry);
			pointcloud.material.pointSizeType = PointSizeType.ADAPTIVE;
			pointcloud.material.size = 100;
		
        var bottomLeft 		= new THREE.Vector3 (4201215.424138484, 171429.945145441, 4779294.873914789);
		//var topLeft 		= new THREE.Vector3(4201220, 172052, 4779290);
		//var bottomLeftHigh	= new THREE.Vector3(4201220,171430, 4779290);
        pointcloud.position.copy(bottomLeft);
        //potreeInstance =  pointcloud;
        
        //change axis
        
        potreeInstance = new THREE.Object3D();
        
        potreeInstance.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ));
        potreeInstance.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ),  Math.PI ));  
        
        potreeInstance.add(pointcloud);
        
        console.log(potreeInstance)
        
        sceneInstance.add(potreeInstance);       
        
	});
        
    };

    
    PotreeProvider.prototype.getPotree = function() {
		if(potreeInstance)
			return potreeInstance.children[0];
		else return undefined;	
    };
    
    return PotreeProvider;
    
});



