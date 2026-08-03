// @ts-check
import * as itowns from 'itowns';
import {
    endpointFromUrl,
    listLayers,
    sourceFromEndpoint,
    getLayerCrs,
    getZoom,
} from './jsm/OGCClientHelper.js';

/** @typedef {import('./jsm/OGCClientHelper.js').Endpoint} Endpoint */
/** @typedef {import('./jsm/OGCClientHelper.js').LayerDescriptor} LayerDescriptor */

/**
 * @template {keyof HTMLElementTagNameMap} T
 * @param {T} tag
 * @param {Partial<HTMLElementTagNameMap[T]>} [props]
 * @param {...(Node | string)} children
 * @returns {HTMLElementTagNameMap[T]}
 */
function el(tag, props = {}, ...children) {
    const element = Object.assign(document.createElement(tag), props);
    element.append(...children);
    return element;
}


// ---- OGC client wrapper ----

/**
 * @param {itowns.GlobeView} view
 * @param {object} props
 * @param {Endpoint} props.endpoint
 * @param {string} props.name
 * @returns {Promise<itowns.ColorLayer>}
 */
async function addLayer(view, { endpoint, name }) {
    const layerId = `${name}_${crypto.randomUUID()}`;
    const { source } = sourceFromEndpoint(endpoint, name);

    /** @type {itowns.ColorLayer} */
    let layer;
    if (source.isWFSSource) {
        layer = new itowns.ColorLayer(layerId, {
            source,
            name,
            // Keep those parameters until we have saner defaults
            style: {
                fill: { color: 'orange', opacity: 0.5 },
                stroke: { color: 'white', width: 1.5 },
            },
        });
    } else {
        layer = new itowns.ColorLayer(layerId, { source, name });
    }

    await view.addLayer(layer);
    return layer;
}

// ---- UI components ----

/**
 * @param {object} props
 * @param {LayerDescriptor} props.layer
 * @returns {HTMLLIElement}
 */
function ogcLayerItem({ layer }) {
    const crs = getLayerCrs(layer);
    const zoom = getZoom(layer);

    const title = 'title' in layer ? layer.title : undefined;
    let subtitle = 'unsupported CRS';
    if (crs) {
        subtitle = zoom ? `${crs}, zoom ${zoom.min}-${zoom.max}` : crs;
    }

    const checkbox = el('input', { type: 'checkbox', value: layer.name, disabled: !crs });
    const label = el('label', { title },
        checkbox,
        el('span', {},
            layer.name ?? '',
            el('small', { textContent: subtitle }),
        ),
    );

    return el('li', {}, label);
}

/**
 * @param {object} props
 * @param {itowns.ColorLayer} props.layer
 * @param {(direction: -1 | 1) => void} props.onMove
 * @param {() => void} props.onRemove
 * @param {(opacity: number) => void} props.onOpacity
 * @returns {HTMLLIElement}
 */
function itownsLayerItem({ layer, onMove, onRemove, onOpacity }) {
    const upBtn = el('button', { type: 'button', textContent: '\u25B2', title: 'Move up' });
    const downBtn = el('button', { type: 'button', textContent: '\u25BC', title: 'Move down' });
    const removeBtn = el('button', { type: 'button', textContent: '\u2715', title: 'Remove' });

    const label = layer.name;
    const children = [
        upBtn,
        downBtn,
        el('span', { textContent: label }),
    ];

    if ('isColorLayer' in layer) {
        const slider = el('input', {
            type: 'range', min: '0', max: '1', step: '0.05', value: '1', title: 'opacity',
        });
        slider.addEventListener('input', () => onOpacity(slider.valueAsNumber));
        children.push(slider);
    }

    children.push(removeBtn);
    const item = el('li', {}, ...children);

    /**
     * @param {-1 | 1} direction
     */
    function move(/** @type {-1 | 1} */ direction) {
        const sibling = direction < 0 ?
            item.previousElementSibling : item.nextElementSibling;
        if (!sibling) {
            return;
        }

        if (direction < 0) {
            sibling.before(item);
        } else {
            sibling.after(item);
        }
        onMove(direction);
    }

    upBtn.addEventListener('click', () => move(-1));
    downBtn.addEventListener('click', () => move(1));
    removeBtn.addEventListener('click', () => {
        item.remove();
        onRemove();
    });

    return item;
}


// ---- State ----

const viewerDiv = /** @type {HTMLDivElement} */ (document.getElementById('viewerDiv'));
const state = {
    /** @type {Endpoint | null} */
    endpoint: null,
    /** @type {itowns.GlobeView} */
    view: new itowns.GlobeView(viewerDiv, {
        coord: new itowns.Coordinates('EPSG:4326', 2.351323, 48.856712),
    }),
};


// ---- DOM events ----

const toolbox = /** @type {HTMLFormElement} */ (document.getElementById('toolbox'));
const ogcURL = /** @type {HTMLInputElement} */ (document.getElementById('ogc-url'));
const ogcSelect = /** @type {HTMLSelectElement} */ (document.getElementById('ogc-type'));
const ogcStatus = /** @type {HTMLOutputElement} */ (document.getElementById('ogc-status'));
const layerPicker = /** @type {HTMLFieldSetElement} */ (document.getElementById('layer-picker'));
const layerPickerCount = /** @type {HTMLOutputElement} */ (document.getElementById('layer-count'));
const layerPickerSearch = /** @type {HTMLInputElement} */ (document.getElementById('layer-search'));
const pickerEl = /** @type {HTMLUListElement} */ (document.getElementById('layer-list'));
const layerAddButton = /** @type {HTMLButtonElement} */ (document.getElementById('layer-add'));
const activeLayers = /** @type {HTMLFieldSetElement} */ (document.getElementById('active'));
const activeLayersList = /** @type {HTMLOListElement} */ (document.getElementById('active-list'));
const activeLayersCount = /** @type {HTMLOutputElement} */ (document.getElementById('active-count'));

function getCheckedNames() {
    return Array.from(
        /** @type {NodeListOf<HTMLInputElement>} */ (pickerEl.querySelectorAll('input:checked')),
        input => input.value,
    );
}

function updateActiveList() {
    const items = activeLayersList.children;

    activeLayers.hidden = items.length === 0;
    activeLayersCount.value = items.length.toString();

    for (let i = 0; i < items.length; i++) {
        const buttons = items[i].getElementsByTagName('button');
        buttons[0].disabled = i === 0;
        buttons[1].disabled = i === items.length - 1;
    }
}

ogcURL.value = 'https://data.geopf.fr/wmts';
const types = ['wmts', 'wms', 'wfs'];

const params = new URLSearchParams(window.location.search);
const url = params.get('url');
if (url) {
    ogcURL.value = url;
}
const type = params.get('type');
if (type && types.includes(type)) {
    ogcSelect.value = type;
}

toolbox.addEventListener('submit', async (event) => {
    event.preventDefault();

    const type = /** @type {'wmts' | 'wms' | 'wfs'} */ (ogcSelect.value);

    ogcStatus.textContent = 'Connecting...';
    layerPicker.hidden = true;
    pickerEl.replaceChildren();
    layerPickerSearch.value = '';

    try {
        const endpoint = await endpointFromUrl(ogcURL.value.trim(), type);
        state.endpoint = endpoint;
        ogcStatus.textContent = endpoint.getServiceInfo()?.title;

        const layers = listLayers(endpoint);
        const supported = layers.filter(layer => getLayerCrs(layer) !== undefined);
        pickerEl.replaceChildren(...layers.map(
            layer => ogcLayerItem({ layer }),
        ));
        layerPickerCount.value = `${supported.length}/${layers.length}`;
        layerPicker.hidden = false;
    } catch (err) {
        ogcStatus.textContent = `Error: ${err instanceof Error ? err.message : err}`;
    }
});

layerPickerSearch.addEventListener('input', () => {
    const query = layerPickerSearch.value.toLowerCase().trim();
    for (const item of pickerEl.children) {
        if (!(item instanceof HTMLElement)) {
            continue;
        }
        const label = item.firstElementChild;
        if (!(label instanceof HTMLLabelElement)) {
            continue;
        }
        const content = `${label.textContent} ${label.title}`.toLowerCase();
        item.hidden = query !== '' && !content.includes(query);
    }
});

layerAddButton.addEventListener('click', async () => {
    const { endpoint, view } = state;
    if (!endpoint) {
        return;
    }

    for (const name of getCheckedNames()) {
        try {
            const layer = await addLayer(view, { endpoint, name });
            activeLayersList.append(itownsLayerItem({
                layer,
                onMove(direction) {
                    if (layer instanceof itowns.ColorLayer) {
                        if (direction < 0) {
                            itowns.ColorLayersOrdering.moveLayerDown(state.view, layer.id);
                        } else {
                            itowns.ColorLayersOrdering.moveLayerUp(state.view, layer.id);
                        }
                    }
                    updateActiveList();
                },
                onRemove() {
                    state.view.removeLayer(layer.id);
                    state.view.notifyChange();
                    updateActiveList();
                },
                onOpacity(opacity) {
                    if (layer instanceof itowns.ColorLayer) {
                        layer.opacity = opacity;
                        state.view.notifyChange(layer);
                    }
                },
            }));
            updateActiveList();
        } catch (err) {
            console.error(err instanceof Error ? err.message : err);
        }
    }

    for (const checkbox of /** @type {NodeListOf<HTMLInputElement>} */ (
        pickerEl.querySelectorAll('input:checked')
    )) {
        checkbox.checked = false;
    }
});
