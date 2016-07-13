

define('Renderer/RendererConstant', [],function(){

	var instanceRendererConstant = null;

	function RendererConstant() {

		//Constructor

        if (instanceRendererConstant !== null) {
            throw new Error("Cannot instantiate more than one instanceRendererConstant");
        }

        // state to render
        // According to the state rendering, the material's object switches
        // to the correct state material
		this.RENDERING_STATE = {
			// final color
			FINAL: 0,
			// depth buffer
			DEPTH: 1,
			// id object
			ID: 2
		};
	}

	RendererConstant.prototype.constructor = RendererConstant;

	return function() {
        instanceRendererConstant = instanceRendererConstant || new RendererConstant();
        return instanceRendererConstant;
    };

});
