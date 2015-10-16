/**
* Generated On: 2015-10-5
* Class: BrowseTree
* Description: BrowseTree parcourt un arbre de Node. Lors du parcours un ou plusieur NodeProcess peut etre appliqué sur certains Node.
*/

define('Scene/BrowseTree',['Globe/EllipsoidTileMesh'], function(EllipsoidTileMesh){

    function BrowseTree(){
        //Constructor

        this.process = null;

    }

    BrowseTree.prototype.processNode = function(node)
    {
        if(node instanceof EllipsoidTileMesh && node.childrenCount() === 0)
            console.log(node);
    };

    /**
    * @param tree {[object Object]} 
    * @param camCur {[object Object]} 
    */
    BrowseTree.prototype.browse = function(tree, camCur){
             
        this.processNode(tree);
       
        for(var i = 0;i<tree.children.length;i++)
            this.browse(tree.children[i]);

    };

    return BrowseTree;
});