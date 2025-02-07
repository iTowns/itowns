import { Fetcher } from 'itowns';
import Widget from './Widget';


const DEFAULT_OPTIONS = {
    width: 300,
    height: 38,
    position: 'top',
    maxSuggestionNumber: 10,
    fontSize: 16,
    placeholder: 'Search location',
};


function addActive(htmlElements, index) {
    if (!htmlElements) { return index; }

    removeAllActives(htmlElements);
    if (index >= htmlElements.length) {
        index = 0;
    } else if (index < 0) {
        index = (htmlElements.length - 1);
    }

    htmlElements[index]?.classList.add('active');

    return index;
}


function removeAllActives(htmlElements) {
    for (let i = 0; i < htmlElements.length; i++) {
        htmlElements[i].classList.remove('active');
    }
}


function eraseSuggestionList(form) {
    while (form.children.length > 1) {
        form.removeChild(form.lastChild);
    }
}


/**
 * A widget for searchbar
 *
 * To use it, you need to link the widgets' stylesheet to your html webpage. This stylesheet is included in
 * [itowns bundles](https://github.com/iTowns/itowns/releases) if you downloaded them, or it can be found in
 * `node_modules/itowns/examples/css` if you installed iTowns with npm. Otherwise, it can be found at
 * [this link](https://raw.githubusercontent.com/iTowns/itowns/master/examples/css/widgets.css). See
 * [this example](http://www.itowns-project.org/itowns/examples/#widgets_searchbar) for more details.
 *
 * @extends Widget
 *
 * @property    {HTMLElement}   domElement      An html div containing the searchbar.
 * @property    {HTMLElement}   parentElement   The parent HTML container of `this.domElement`.
 */
class Searchbar extends Widget {
    #_onSelected;

    /**
     * @param   {View}          view                                    The iTowns view the searchbar should be linked
                                                                        * to.
     *
     * @param   {Object}        geocodingOptions                        Configuration for geocoding.
     * @param   {URL}           geocodingOptions.url                    The URL of a geocoding service that should be
                                                                        * used to build suggestions.
     * @param   {function}      geocodingOptions.parser                 A method to parse fetched results from geocoding
                                                                        * url into a Map object. For each entry of this
                                                                        * Map, the key must be a string that will be
                                                                        * displayed as the html content of each
                                                                        * suggestion bellow the searchbar. The value
                                                                        * associated to the key is whatever the user
                                                                        * wants. The value is the parameter that is
                                                                        * passed to the `onSelected` method (specified
                                                                        * in another `geocodingOptions` parameter).
     * @param   {function}      [geocodingOptions.onSelected]           A method which describes what should be done
                                                                        * when user selects a location (by clicking or
                                                                        * hitting enter on a suggestion). The only
                                                                        * parameter of this method is the value mapped
                                                                        * with `geocodingOptions.parser` method.
     *
     * @param   {Object}        [options]                               The searchbar optional configuration.
     * @param   {HTMLElement}   [options.parentElement=view.domElement] The parent HTML container of the div which
                                                                        * contains searchbar widgets.
     * @param   {number}        [options.size]                          The size of the searchbar. It is a number that
                                                                        * describes both width and height in pixels of
                                                                        * the searchbar.
     * @param   {number}        [options.width=300]                     The width in pixels of the searchbar.
     * @param   {number}        [options.height=38]                     The height in pixels of the searchbar.
     * @param   {string}        [options.position='top']                Defines which position within the
                                                                        * `parentElement` the searchbar should be
                                                                        * displayed to. Possible values are `top`,
                                                                        * `bottom`, `left`, `right`, `top-left`,
                                                                        * `top-right`, `bottom-left` and `bottom-right`.
                                                                        * If the input value does not match one of
                                                                        * these, it will be defaulted to `top`.
     * @param   {Object}        [options.translate]                     An optional translation of the searchbar.
     * @param   {number}        [options.translate.x=0]                 The searchbar translation along the page x-axis.
     * @param   {number}        [options.translate.y=0]                 The searchbar translation along the page y-axis.
     * @param   {number}        [options.fontSize=16]                   The font size in pixel of the searchbar content.
     * @param   {number}        [options.maxSuggestionNumber=10]        The maximum number of suggestions that should
                                                                        * appear under the searchbar.
     * @param   {string}        [options.placeholder='Search location'] The placeholder that appears in the searchbar
                                                                        * when nothing has yet been typed.
     */
    constructor(view, geocodingOptions, options = {}) {
        // ---------- BUILD PROPERTIES ACCORDING TO DEFAULT OPTIONS AND OPTIONS PASSED IN PARAMETERS : ----------
        super(view, options, DEFAULT_OPTIONS);

        // Check if `geocodingOptions` parameter was correctly specified.
        if (
            !geocodingOptions
            || !geocodingOptions.url
            || !geocodingOptions.parser || typeof geocodingOptions.parser !== 'function'
        ) {
            throw new Error(
                '\'geocodingOptions\' parameter for \'Searchbar\' constructor is not a valid option. Please refer to '
                + 'the documentation.',
            );
        }
        this.#_onSelected = geocodingOptions.onSelected ?? (() => {});



        // ---------- this.domElement SETTINGS SPECIFIC TO SEARCHBAR : ----------

        this.domElement.id = 'widgets-searchbar';

        this.domElement.style.height = 'auto';

        const form = document.createElement('form');
        form.setAttribute('autocomplete', 'off');
        form.id = 'searchbar-autocompletion-form';
        this.domElement.appendChild(form);

        const input = document.createElement('input');
        input.setAttribute('type', 'text');
        input.setAttribute('name', 'mySearch');
        input.setAttribute('placeholder', options.placeholder || DEFAULT_OPTIONS.placeholder);
        input.style.height = `${options.height || options.size || DEFAULT_OPTIONS.height}px`;
        input.style.fontSize = `${options.fontSize || DEFAULT_OPTIONS.fontSize}px`;
        form.appendChild(input);

        // currentFocus variable stores the index of the suggestions that is focused by user, either with mouse or arrow
        // keys.
        let currentFocus;



        // ----------  BUILD AUTOCOMPLETION SUGGESTIONS LIST WHEN TYPING THE SEARCHBAR INPUT : ----------

        input.addEventListener('input', () => {
            const value = input.value;

            // Close any already opened list of autocompleted values
            eraseSuggestionList(form);

            currentFocus = -1;

            if (!value) { return false; }

            geocodingOptions.url.searchParams.set('text', value);

            Fetcher.json(geocodingOptions.url).then((geocodingResult) => {
                const result = geocodingOptions.parser(geocodingResult);

                let i = 0;
                result.forEach((info, location) => {
                    // Stop looping through the map if enough location have been proceeded.
                    if (i === Math.min(
                        result.size,
                        options.maxSuggestionNumber || DEFAULT_OPTIONS.maxSuggestionNumber,
                    )) { return; }
                    const mapIndex = i;
                    i++;

                    const index = location.toUpperCase().indexOf(value.toUpperCase());

                    if (index > -1) {
                        const autocompleteItem = document.createElement('div');

                        autocompleteItem.style.minHeight = input.style.height;
                        autocompleteItem.style.fontSize = `${options.fontSize || DEFAULT_OPTIONS.fontSize}px`;

                        // Make the matching letters bold.
                        const start = location.slice(0, index);
                        const bold = location.slice(index, index + value.length);
                        const end = location.slice(index + value.length, location.length);

                        autocompleteItem.innerHTML = `<p>${start}<strong>${bold}</strong>${end}</p>`;
                        // Store the current location value as an attribute of autocompleteItem div.
                        autocompleteItem.setAttribute('location', location);

                        form.appendChild(autocompleteItem);

                        // eslint-disable-next-line no-loop-func
                        autocompleteItem.addEventListener('mouseover', () => {
                            removeAllActives(form.children);
                            currentFocus = mapIndex;
                            autocompleteItem.classList.add('active');
                        });

                        autocompleteItem.addEventListener('click', () => {
                            this.#_onSelected(info);

                            input.value = autocompleteItem.getAttribute('location');
                            eraseSuggestionList(form);
                        });
                    }
                });
            });
        });



        // ---------- MANAGE KEYBOARD INTERACTIONS ON AUTOCOMPLETION SUGGESTIONS : ----------

        // When searchbar is positioned at the bottom of the screen (therefore is a flex with `column-reverse`
        // direction, we must exchange up and down arrow actions.
        const topOrBottom = (options.position || DEFAULT_OPTIONS.position).includes('top') ? 1 : -1;

        input.addEventListener('keydown', (event) => {
            event.stopPropagation();
            const completionSuggestions = form.getElementsByTagName('div');

            switch (event.code) {
                case 'Escape':
                    eraseSuggestionList(form);
                    input.value = '';
                    view.domElement.focus();
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    currentFocus = addActive(completionSuggestions, currentFocus + topOrBottom);
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    currentFocus = addActive(completionSuggestions, currentFocus - topOrBottom);
                    break;
                case 'Enter':
                    event.preventDefault();
                    if (completionSuggestions[Math.max(currentFocus, 0)]) {
                        completionSuggestions[Math.max(currentFocus, 0)].click();
                        view.domElement.focus();
                    }
                    break;
                default:
                    break;
            }
        });



        // ---------- MANAGE FOCUS AND ACTIVE SUGGESTION WHEN USER ENTERS OR LEAVES THE SEARCHBAR : ----------

        // User clicks the searchbar.
        input.addEventListener('focus', () => {
            form.classList.add('focus');
        });
        // User clicks out of the searchbar.
        input.addEventListener('blur', () => {
            form.classList.remove('focus');
            removeAllActives(form.children);
        });
        // Cursor leaves the searchbar.
        form.addEventListener('mouseleave', () => {
            removeAllActives(form.children);
            currentFocus = -1;
        });
    }
}


export default Searchbar;
