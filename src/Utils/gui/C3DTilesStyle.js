import Style from 'Core/Style';
import { C3DTILES_LAYER_EVENTS } from 'Layer/C3DTilesLayer';
import Widget from './Widget';

const DEFAULT_OPTIONS = {
    width: 200,
    position: 'top-right',
};


/**
 * A widget for dynamic 3DTiles styling
 *
 * To use it, you need to link the widgets' stylesheet to your html webpage. This stylesheet is included in
 * [itowns bundles](https://github.com/iTowns/itowns/releases) if you downloaded them, or it can be found in
 * `node_modules/itowns/examples/css` if you installed iTowns with npm. Otherwise, it can be found at
 * [this link](https://raw.githubusercontent.com/iTowns/itowns/master/examples/css/widgets.css). See
 * [this example](http://www.itowns-project.org/itowns/examples/#widgets_3dtiles_style) for more details.
 *
 * @extends Widget
 *
 * @property    {HTMLElement}   domElement      An html div containing the minimap.
 * @property    {HTMLElement}   parentElement   The parent HTML container of `this.domElement`.
 */
class C3DTilesStyle extends Widget {
/**
   *
   * @param {View} view view
   * @param {*} options options
   */
    constructor(view, options) {
        super(view, options, DEFAULT_OPTIONS);

        this.domElement.onclick = event => event.stopImmediatePropagation();

        // create select of the C3DTilesLayers
        const selectC3DTilesLayer = document.createElement('select');
        this.domElement.appendChild(selectC3DTilesLayer);

        /** @type {Map<HTMLElement, HTMLElement>} */
        const selectOptionLayerContent = new Map();

        const updateSelectedLayer = () => {
            for (const [sO, lC] of selectOptionLayerContent) {
                lC.hidden = sO !== selectC3DTilesLayer.selectedOptions[0];
            }
        };
        selectC3DTilesLayer.onchange = updateSelectedLayer;

        view.getLayers().filter(el => el.isC3DTilesLayer === true).forEach((c3DTilesLayer) => {
            const selectC3DTilesLayerOption = document.createElement('option');
            selectC3DTilesLayerOption.innerText = c3DTilesLayer.name;
            selectC3DTilesLayer.add(selectC3DTilesLayerOption);

            const layerContent = document.createElement('div');
            this.domElement.appendChild(layerContent);

            // link select option to layer content
            selectOptionLayerContent.set(selectC3DTilesLayerOption, layerContent);

            // wait for C3DTileFeatures to load
            c3DTilesLayer.addEventListener(C3DTILES_LAYER_EVENTS.ON_TILE_CONTENT_LOADED, () => {
                // reset
                while (layerContent.firstChild) {
                    layerContent.firstChild.remove();
                }

                /** @type {Map<string,Array>} */
                const buffer = new Map(); // record what are the possible values for a key in batchTable
                // eslint-disable-next-line no-unused-vars
                for (const [tileId, tileC3DTileFeatures] of c3DTilesLayer.tilesC3DTileFeatures) {
                    // eslint-disable-next-line no-unused-vars
                    for (const [batchId, c3DTileFeature] of tileC3DTileFeatures) {
                        // eslint-disable-next-line guard-for-in
                        for (const key in c3DTileFeature.getInfo().batchTable) {
                            if (!buffer.has(key)) {
                                buffer.set(key, []);
                            }

                            // check possible value for this key
                            const value = c3DTileFeature.getInfo().batchTable[key];
                            if (!buffer.get(key).includes(value)) {
                                buffer.get(key).push(value);
                            }
                        }
                    }
                }

                /** @type {Map<HTMLElement, Function>} */
                const colorFunctions = new Map();

                const fillColorFunction = (c3DTileFeature) => {
                    let result = null;
                    // eslint-disable-next-line no-unused-vars
                    for (const [keyValue, colorFunction] of colorFunctions) {
                        result = colorFunction(c3DTileFeature) || result;
                    }
                    return result;
                };

                /** @type {Map<HTMLElement, Function>} */
                const opacityFunctions = new Map();

                const fillOpacityFunction = (c3DTileFeature) => {
                    let result = 1;
                    // eslint-disable-next-line no-unused-vars
                    for (const [keyValue, opacityFunction] of opacityFunctions) {
                        result = opacityFunction(c3DTileFeature) || result;
                    }
                    return result;
                };

                const appendInputColorAndOpacity = (getKeyValue, key, possibleValues) => {
                    const inputColor = document.createElement('input');
                    inputColor.setAttribute('type', 'color');
                    layerContent.appendChild(inputColor);

                    inputColor.onchange = () => {
                        const keyValue = getKeyValue();

                        if (!possibleValues.includes(keyValue)) {
                            return;
                        }

                        const colorSelected = inputColor.value;// copy
                        colorFunctions.set(keyValue, (c3DTileFeature) => {
                            if (c3DTileFeature.getInfo().batchTable[key] == keyValue) {
                                return colorSelected;
                            }
                            return null;
                        });
                        c3DTilesLayer.updateStyle();
                        view.notifyChange();
                    };

                    const opacityElement = document.createElement('input');
                    opacityElement.setAttribute('type', 'range');
                    opacityElement.min = 0;
                    opacityElement.max = 1;
                    opacityElement.step = 0.1;
                    opacityElement.value = 1;
                    layerContent.appendChild(opacityElement);

                    opacityElement.onchange = () => {
                        const keyValue = getKeyValue();

                        if (!possibleValues.includes(keyValue)) {
                            return;
                        }

                        const opacitySelected = opacityElement.value;// copy
                        opacityFunctions.set(keyValue, (c3DTileFeature) => {
                            if (c3DTileFeature.getInfo().batchTable[key] == keyValue) {
                                return opacitySelected;
                            }
                            return null;
                        });
                        c3DTilesLayer.updateStyle();
                        view.notifyChange();
                    };

                    return { inputColor, opacityElement };
                };

                const appendFilterSelect = (key, values) => {
                    const label = document.createElement('label');
                    label.innerText = key;
                    layerContent.appendChild(label);

                    const selectKey = document.createElement('select');
                    layerContent.appendChild(selectKey);
                    values.forEach((value) => {
                        const selectKeyOption = document.createElement('option');
                        selectKeyOption.value = value;
                        selectKeyOption.text = value;
                        selectKey.add(selectKeyOption);
                    });

                    appendInputColorAndOpacity(() => selectKey.selectedOptions[0].value, key, values);
                };

                const appendFilterInputText = (key, values) => {
                    const label = document.createElement('label');
                    label.innerText = key;
                    layerContent.appendChild(label);

                    const inputText = document.createElement('input');
                    inputText.setAttribute('type', 'text');
                    layerContent.appendChild(inputText);

                    const { inputColor, opacityElement } = appendInputColorAndOpacity(() => inputText.value, key, values);

                    inputText.onchange = () => {
                        if (!values.includes(inputText.value)) {
                            return;
                        }

                        const colorSelected = inputColor.value;// copy
                        const textSelected = inputText.value;// copy
                        colorFunctions.set(textSelected, (c3DTileFeature) => {
                            if (c3DTileFeature.getInfo().batchTable[key] == textSelected) {
                                return colorSelected;
                            }
                            return null;
                        });
                        const opacitySelected = opacityElement.value;// copy
                        opacityFunctions.set(textSelected, (c3DTileFeature) => {
                            if (c3DTileFeature.getInfo().batchTable[key] == textSelected) {
                                return opacitySelected;
                            }
                            return null;
                        });
                        c3DTilesLayer.updateStyle();
                        view.notifyChange();
                    };
                };

                // create ui from buffer
                for (const [key, values] of buffer) {
                    if (values.length < C3DTilesStyle.MAX_SELECT_VALUE) {
                        appendFilterSelect(key, values);
                    } else {
                        appendFilterInputText(key, values);
                    }
                }

                // set style
                c3DTilesLayer.style = new Style({
                    fill: {
                        color: fillColorFunction,
                        opacity: fillOpacityFunction,
                    },
                });
            });
        });

        updateSelectedLayer();
    }

    static get MAX_SELECT_VALUE() {
        return 10;
    }
}

export default C3DTilesStyle;
