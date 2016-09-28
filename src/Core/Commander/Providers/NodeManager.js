/**
 * Generated On: 2016-09-09
 * Class: NodeManager
 * Description: Transition step between the
 */

 //https://github.com/Oslandia/workshop-3d-itowns/blob/master/2_analysis/5_3d_intersection.md

function NodeManager() {
	//Tab containing the different reprepresentation depending on the sse level for the features
	// {levelMin, levelMax,representation}
	this.levelSwitchTab = [ {min:  0, max:    4, type: 'point'},
							{min:  4, max:   10, type: 'box'  },
							{min: 10, max:   30, type: 'point'},
							{min: 30, max: 1000, type: 'box'  }];
}

/**
 * Check the feature type of the layer. It depends of the SSE, the type is kept inside the level switch tab.
 * @param level: the layer current level
 * @return type: if the type must be change return a string containing the new type, else return undefined
 */
NodeManager.prototype.checkType = function(node, quadtree, refinementCommandCancellationFn) {
	var level = node.sse;
	var layer = node.content.layer;
	if(layer.id == 'testWfsPoint') {
		var type = layer.params.getRetailType();
		if(type != 'auto') {
			if(node.retailType == 'auto' || type != node.retailType || layer.params.getForceUpdate())
				this.nodeRequest(node, quadtree, refinementCommandCancellationFn);
			return;
		} else {
			for (var i = 0; i < this.levelSwitchTab.length; i++) {
				var lvl = this.levelSwitchTab[i];
				if (node.retailType != 'auto' ||
					level > lvl.min && level < lvl.max && node.content.currentType != lvl.type){
					node.content.currentType = lvl.type;
					this.nodeRequest(node, quadtree, refinementCommandCancellationFn);
					return;
				}
			}
		}
	}
};

NodeManager.prototype.nodeRequest = function(node, quadtree, refinementCommandCancellationFn) {
	var args = {
		layer: node.content.layer
	};

	quadtree.interCommand.request(args, node, refinementCommandCancellationFn)
	.catch(function(/*err*/) {
    // Command has been canceled, no big deal, we just need to catch it
    });

};

export default NodeManager;
