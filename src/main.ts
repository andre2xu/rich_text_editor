import $ from 'jquery';
import * as GENERAL_HELPERS from './helpers/general';
import * as COLOR_HELPERS from './helpers/colors';



interface TextBoxSelection {
    selection: Selection | null,
    range: Range | null,
    editedContent: HTMLElement | null
};

class RichTextEditor {
    TEXT_BOX: JQuery<HTMLDivElement>;
    TEXT_BOX_SELECTION_DATA: TextBoxSelection = {
        selection: null,
        range: null,
        editedContent: null // HTML of selection after it has been styled
    };

    constructor(textBoxId: string) {
        const ELEMENT: HTMLElement | null = document.getElementById(textBoxId);

        if (typeof textBoxId !== 'string' || ELEMENT === null || ELEMENT instanceof HTMLDivElement === false) {
            throw ReferenceError("Must be an id of a div");
        }

        this.TEXT_BOX = $(ELEMENT);

        // make sure the text box div is empty
        // this.TEXT_BOX.empty();

        // set text box attributes
        this.TEXT_BOX.prop('contenteditable', true);
        this.TEXT_BOX.prop('spellcheck', false);

        // bind event(s) to text box
        this.TEXT_BOX.on('mouseup', (event: JQuery.MouseUpEvent) => {
            if (event.button === 0) {
                // execute the following when the left mouse button is released
                this.__updateTextBoxSelectionData__();
            }
        });

        this.TEXT_BOX.on('mouseenter', (_: JQuery.MouseEnterEvent) => {
            this.__updateTextBoxSelectionData__();
        });

        this.TEXT_BOX.on('keyup', (_: JQuery.KeyUpEvent) => {
            if (this.TEXT_BOX_SELECTION_DATA.editedContent !== null) {
                // copy the HTML of the selection before updating the text box selection data
                const ELEMENT: HTMLElement = this.TEXT_BOX_SELECTION_DATA.editedContent;

                // update the text box selection data to see what is currently selected
                this.__updateTextBoxSelectionData__();

                // save the element's reference again in the text box selection data
                this.TEXT_BOX_SELECTION_DATA.editedContent = ELEMENT;

                // check if a caret selection was made
                if (this.__selectionInTextBoxExists__() && this.TEXT_BOX_SELECTION_DATA.selection instanceof Selection && this.TEXT_BOX_SELECTION_DATA.selection.type === 'Caret') {
                    // check if the element, whose reference was saved in the text box selection data, matches the current selection
                    if (this.TEXT_BOX_SELECTION_DATA.selection.anchorNode?.parentElement === ELEMENT) {
                        // remove zero-width space character
                        ELEMENT.innerHTML = ELEMENT.innerHTML.replace('\u200b', '');

                        // move the caret to the right of the newly-inserted character
                        this.__selectAndPlaceCaretInsideElement__(ELEMENT);
                    }
                }
            }
        });
    };



    // PRIVATE
    __updateTextBoxSelectionData__() {
        // assume there is no selection in the text box
        this.TEXT_BOX_SELECTION_DATA.selection = null;
        this.TEXT_BOX_SELECTION_DATA.range = null;
        this.TEXT_BOX_SELECTION_DATA.editedContent = null;

        // check if there is a selection inside of the text box and update the mapping
        const WINDOW_SELECTION: Selection | null = window.getSelection();

        if (WINDOW_SELECTION !== null && WINDOW_SELECTION.anchorNode !== null && WINDOW_SELECTION.focusNode !== null) {
            const TEXT_BOX_ELEMENT: HTMLDivElement = this.TEXT_BOX[0];

            if (TEXT_BOX_ELEMENT.compareDocumentPosition(WINDOW_SELECTION.anchorNode) & Node.DOCUMENT_POSITION_CONTAINED_BY && TEXT_BOX_ELEMENT.compareDocumentPosition(WINDOW_SELECTION.focusNode) & Node.DOCUMENT_POSITION_CONTAINED_BY) {
                this.TEXT_BOX_SELECTION_DATA.selection = WINDOW_SELECTION;
                this.TEXT_BOX_SELECTION_DATA.range = WINDOW_SELECTION.getRangeAt(0);
            }
        }
    };

    __selectionInTextBoxExists__() {
        return this.TEXT_BOX_SELECTION_DATA.selection !== null && this.TEXT_BOX_SELECTION_DATA.range !== null;
    };

    __selectAndHighlightElement__(element: HTMLElement) {
        const HIGHLIGHT_RANGE: Range = document.createRange();
        HIGHLIGHT_RANGE.selectNode(element);

        const WINDOW_SELECTION: Selection | null = window.getSelection();

        if (WINDOW_SELECTION !== null) {
            WINDOW_SELECTION.removeAllRanges();
            WINDOW_SELECTION.addRange(HIGHLIGHT_RANGE);

            // update text box selection data
            this.__updateTextBoxSelectionData__();
        }
    };

    __selectAndPlaceCaretInsideElement__(element: HTMLElement) {
        const CARET_RANGE: Range = document.createRange();
        CARET_RANGE.selectNode(element);

        const WINDOW_SELECTION: Selection | null = window.getSelection();

        if (WINDOW_SELECTION !== null) {
            WINDOW_SELECTION.removeAllRanges();
            WINDOW_SELECTION.addRange(CARET_RANGE);

            // reduce selection to a caret
            CARET_RANGE.collapse();

            // update text box selection data
            this.__updateTextBoxSelectionData__();
        }
    };



    // PUBLIC
    applyColor(r: number, g: number, b: number) {
        // validate RGB values
        const ARGS: number[] = [r, g, b];

        if (ARGS.every((arg) => { return typeof arg === 'number' }) === false || ARGS.every((arg) => { return arg >= 0 && arg <= 255 }) === false) {
            throw TypeError("All RGB values must be a number between 0 and 255");
        }

        if (this.TEXT_BOX_SELECTION_DATA.editedContent !== null && COLOR_HELPERS.isColorElement(this.TEXT_BOX_SELECTION_DATA.editedContent)) {
            // apply color to the existing selection

            const SELECTED_COLOR_ELEMENT: HTMLElement = this.TEXT_BOX_SELECTION_DATA.editedContent;

            $(SELECTED_COLOR_ELEMENT).css('color', `rgb(${r},${g},${b})`);
        }
        else if (this.__selectionInTextBoxExists__()) {
            // create color element
            const COLOR_ELEMENT: JQuery<HTMLSpanElement> = $(document.createElement('span'));
            COLOR_ELEMENT.attr('data-type', 'color');
            COLOR_ELEMENT.css('color', `rgb(${r},${g},${b})`);

            // apply color to selection
            const SELECTION_TYPE: string = this.TEXT_BOX_SELECTION_DATA.selection?.type as string;

            if (SELECTION_TYPE === 'Caret') {
                const SELECTION_RANGE: Range = this.TEXT_BOX_SELECTION_DATA.range as Range;

                // add a zero-width space character to the empty color element so that it can be focused
                COLOR_ELEMENT.append(document.createTextNode('\u200b'));

                SELECTION_RANGE.insertNode(COLOR_ELEMENT[0]);

                // make caret re-appear inside the color element
                this.__selectAndPlaceCaretInsideElement__(COLOR_ELEMENT[0]);

                // save reference of colored selection (in case user wants to make modifications to it before deselecting it)
                this.TEXT_BOX_SELECTION_DATA.editedContent = COLOR_ELEMENT[0];
            }
            else if (SELECTION_TYPE === 'Range') {
                const SELECTION_RANGE: Range = this.TEXT_BOX_SELECTION_DATA.range as Range

                // convert selection to a fragment
                const SELECTED_CONTENTS: DocumentFragment = SELECTION_RANGE.extractContents();

                // put fragment inside of color element
                COLOR_ELEMENT.append(SELECTED_CONTENTS);

                // replace selection with colored contents
                SELECTION_RANGE.insertNode(COLOR_ELEMENT[0]);

                // check if the new color element is inside of an existing one and if so take it out
                const PARENT_COLOR_ELEMENT: HTMLElement | undefined = COLOR_HELPERS.getClosestParentColorElement(COLOR_ELEMENT[0]);

                if (PARENT_COLOR_ELEMENT !== undefined) {
                    COLOR_HELPERS.separateColorElementFromParentColorElement(COLOR_ELEMENT[0], PARENT_COLOR_ELEMENT);
                }

                // check if the new color element has inner color elements and if so remove them leaving only their contents
                const INNER_COLOR_ELEMENTS: HTMLElement[] = COLOR_HELPERS.getInnerColorElements(COLOR_ELEMENT[0]);

                if (INNER_COLOR_ELEMENTS.length > 0) {
                    COLOR_HELPERS.removeInnerColorElements(COLOR_ELEMENT[0]);

                    GENERAL_HELPERS.mergeSimilarAdjacentChildNodes(COLOR_ELEMENT[0]);
                }

                // highlight selection again
                this.__selectAndHighlightElement__(COLOR_ELEMENT[0]);

                // save reference of colored selection (in case user wants to make modifications to it before deselecting it)
                this.TEXT_BOX_SELECTION_DATA.editedContent = COLOR_ELEMENT[0];
            }
            else {
                throw TypeError("Invalid selection type");
            }
        }
    };
};

export default RichTextEditor;