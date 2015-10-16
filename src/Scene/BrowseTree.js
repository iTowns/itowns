/**
* Generated On: 2015-10-5
* Class: BrowseTree
* Description: BrowseTree parcourt un arbre de Node. Lors du parcours un ou plusieur NodeProcess peut etre appliqué sur certains Node.
*/

define('Scene/BrowseTree',['Globe/EllipsoidTileMesh','THREE'], function(EllipsoidTileMesh,THREE){

    function BrowseTree(){
        //Constructor

        this.process = null;
    }
    
    
    BrowseTree.prototype.backFaceCulling = function(node,camera)
    {
        
        var normal = camera.direction;
        
        if(node instanceof EllipsoidTileMesh)
        {
                        
            node.visible = false;
            
            for(var n = 0; n < node.normals().length; n ++ ) 
            {
               
                if( normal.dot(node.normals()[n]) > 0 )
                {
                    node.visible = true;
                    break;
                }
            }
            
            return node.visible;
        }        
        
        return true;
        
    };
    
    BrowseTree.prototype.processNode = function(node,camera)
    {
        return this.backFaceCulling(node,camera);
    };

    /**
     * 
     * @param {type} tree
     * @param {type} camera
     * @returns {undefined}
     */
    BrowseTree.prototype.browse = function(tree, camera){
             
        if(this.processNode(tree,camera))       
            for(var i = 0;i<tree.children.length;i++)
                this.browse(tree.children[i],camera);

    };

    return BrowseTree;
});