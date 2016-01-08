/**
* Generated On: 2015-10-5
* Class: BrowseTree
* Description: BrowseTree parcourt un arbre de Node. Lors du parcours un ou plusieur NodeProcess peut etre appliqué sur certains Node.
*/

define('Scene/BrowseTree',['THREE','Globe/EllipsoidTileMesh','Scene/NodeProcess','OBBHelper'], function(THREE,EllipsoidTileMesh){

    function BrowseTree(scene)
    {
        //Constructor
  
        this.oneNode    = 0;
        this.scene      = scene;        
        this.nodeProcess= undefined;
        this.tree       = undefined;
        this.date       = new Date(); 
        this.fogDistance = 1000000000.0;        
        this.mfogDistance= 1000000000.0;
        
    }
    
    
    BrowseTree.prototype.addNodeProcess= function(nodeProcess)
    {        
        this.nodeProcess = nodeProcess;
    };
    
    BrowseTree.prototype.NodeProcess= function()
    {        
        return this.nodeProcess;
    };
   
    /**
     * @documentation: Process to apply to each node
     * @param {type} node   : node current to apply process
     * @param {type} camera : current camera needed to process
     * @param {type} optional  : optional process
     * @returns {Boolean}
     */
    BrowseTree.prototype.processNode = function(node,camera,optional)
    {        
        if(node instanceof EllipsoidTileMesh)
        {            
            
            if(node.helper !== undefined && node.helper.parent === null)           
                this.scene.scene3D().add(node.helper);

            node.setVisibility(false);
                 
            if(node.loaded && this.nodeProcess.frustumCullingOBB(node,camera))
            {
                if(this.nodeProcess.horizonCulling(node,camera))
                {
                    if(node.parent.material !== undefined && node.parent.material.visible === true)
                        
                        return node.setVisibility(false);
                    
                    var sse = this.nodeProcess.SSE(node,camera);                                                        

                    if(optional && sse && node.material.visible === true && node.wait === false)
                                                       
                        this.tree.subdivide(node);
                                                
                    else if(!sse && node.level >= 2 && node.material.visible === false && node.wait === false)
                    {

                        node.setMaterialVisibility(true);
                        this.uniformsProcess(node,camera);                      
                        node.setChildrenVisibility(false);

                        return false;                            
                    }                                
                }
            }

            if(node.visible  && node.material.visible)
                this.uniformsProcess(node,camera);  
                                   
            return node.visible;
        }
        
        return true;
    };
    
    BrowseTree.prototype.uniformsProcess = function(node,camera)
    {
        node.setMatrixRTC(this.getRTCMatrix(node.absoluteCenter,camera));
        node.setFog(this.fogDistance);        
    };
        
    BrowseTree.prototype.getRTCMatrix = function(center,camera)    
    {               
        // TODO gerer orientation et echelle de l'objet
        var position    = new THREE.Vector3().subVectors(camera.camera3D.position,center);
        var quaternion  = new THREE.Quaternion().copy(camera.camera3D.quaternion);        
        var matrix      = new THREE.Matrix4().compose(position,quaternion,new THREE.Vector3(1,1,1));
        var matrixInv   = new THREE.Matrix4().getInverse(matrix);       
        var centerEye   = new THREE.Vector4().applyMatrix4(matrixInv) ;                        
        var mvc         = matrixInv.setPosition(centerEye);      
        return            new THREE.Matrix4().multiplyMatrices(camera.camera3D.projectionMatrix,mvc);

    };
        
    /**
     * @documentation: Initiate traverse tree 
     * @param {type} tree       : tree 
     * @param {type} camera     : current camera
     * @param {type} optional   : optional process
     * @returns {undefined}
     */
    BrowseTree.prototype.browse = function(tree, camera,optional)
    {
 
        this.tree = tree;
        camera.camera3D.updateMatrix();
        camera.camera3D.updateMatrixWorld(true);
        camera.camera3D.matrixWorldInverse.getInverse(camera.camera3D.matrixWorld);      
        
        var distance = camera.camera3D.position.length();
                
        this.fogDistance = this.mfogDistance * Math.pow((distance-6300000)/25000000,1.6);                       
        this.nodeProcess.preHorizonCulling(camera);
        
        for(var i = 0;i<tree.children.length;i++)
            this._browse(tree.children[i],camera,optional);
    };
    
    /**
     * @documentation: Recursive traverse tree
     * @param {type} node       : current node     
     * @param {type} camera     : current camera
     * @param {type} optional   : optional process
     * @returns {undefined}
     */
    BrowseTree.prototype._browse = function(node, camera,optional){
             
        //this.bBoxHelper(node);
        if(this.processNode(node,camera,optional))       
            for(var i = 0;i<node.children.length;i++)
                this._browse(node.children[i],camera,optional);
//        else
//            this._clean(node,node.level +2);

    };
    
    BrowseTree.prototype._clean = function(node,level)
    {
        if( node.children.length === 0)
            return true;
        
        var childrenCleaned = 0;
        for(var i = 0;i<node.children.length;i++)
        {
            var child = node.children[i];
            
            //console.log(this.date.getTime() - child.timeInvisible);
            if(this._clean(child,level) && (new Date().getTime() - child.timeInvisible) > 2000 && child.level > 2 && child.level >= level && child.children.length ===0)
                childrenCleaned++;                        
        }
        
        if(childrenCleaned === 4 )
        {            
            
            while(node.children.length>0)
            {
                var child = node.children[0];
                node.remove(child);
                child.dispose();                
                this.tree.nbNodes--;
            }
            node.material.visible = true;
            return true;
        }else         
            return false;
        
    };
    
    /**
     * TODO : to delete
     * @documentation:add oriented bouding box of node in scene
     * @param {type} node
     * @returns {undefined}
     */
    BrowseTree.prototype.bBoxHelper = function(node)
    {          
        if(node instanceof EllipsoidTileMesh && node.level > 2  )
        {                
            var obb     = new THREE.OBBHelper(node.geometry.OBB);
            obb.visible = false;
            
            obb.translateZ(node.absoluteCenter.length());
            this.scene.scene3D().add(obb);           
        }
    };
    
    /**
     * TODO : to delete 
     * @param {type} node
     * @returns {BrowseTree_L7.BrowseTree.prototype.addOBBoxHelper.bboxH}
     */
    BrowseTree.prototype.addOBBoxHelper = function(node){
             
        var bboxH = this.bBoxHelper(node);
            
        for(var i = 0;i<node.children.length;i++)
                this.addOBBoxHelper(node.children[i]);
            
        return bboxH;

    };
    
    return BrowseTree;
});