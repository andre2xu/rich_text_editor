import $ from 'jquery';
import * as GENERAL_HELPERS from './helpers/general';
import * as COLOR_HELPERS from './helpers/colors';
import * as FORMAT_HELPERS from './helpers/formats';



interface TextBoxSelectionData {
    selection: Selection | null,
    range: Range | null
};

interface TextBoxLastSelectionData {
    lastSelection: HTMLElement | null,
    lastSelectionType: string | null
};

class RichTextEditor {
    TEXT_BOX: JQuery<HTMLDivElement>;
    TEXT_BOX_SELECTION_DATA: TextBoxSelectionData = {
        selection: null,
        range: null
    };
    TEXT_BOX_LAST_SELECTION_DATA: TextBoxLastSelectionData = {
        lastSelection: null, // HTML of selection after it has been styled
        lastSelectionType: null // 'Caret' or 'Range'
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
                // check if a caret selection was made and delete the caret selection element if it's empty
                if (this.__emptyCaretSelectionElementExists__()) {
                    $(this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection as HTMLElement).remove();
                }

                this.__updateTextBoxSelectionData__();

                // reset last selection data
                this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection = null;
                this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType = null;
            }
        });

        this.TEXT_BOX.on('mouseenter', (_: JQuery.MouseEnterEvent) => {
            if (this.__emptyCaretSelectionElementExists__()) {
                const DELAY_BEFORE_DELETION: number = 3000; // 3 seconds

                // give the user X seconds before deleting the empty caret selection element after they enter the text box
                setTimeout(() => {
                    // if the caret selection element is still empty after the delay then delete it
                    if (this.__emptyCaretSelectionElementExists__()) {
                        $(this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection as HTMLElement).remove();

                        // reset last selection data
                        this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection = null;
                        this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType = null;
                    }
                }, DELAY_BEFORE_DELETION);
            }

            this.__updateTextBoxSelectionData__();
        });

        this.TEXT_BOX.on('keyup', (_: JQuery.KeyUpEvent) => {
            if (this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection !== null) {
                // update current selection data
                this.__updateTextBoxSelectionData__();

                // check if a caret selection was made
                if (this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType !== null && this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType === 'Caret' && this.TEXT_BOX_SELECTION_DATA.selection instanceof Selection) {
                    const ELEMENT: HTMLElement = this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection;

                    // check if the element, whose reference was saved in the text box selection data, matches the current selection
                    if (this.TEXT_BOX_SELECTION_DATA.selection.anchorNode?.parentElement === ELEMENT) {
                        // remove zero-width space character
                        ELEMENT.innerHTML = ELEMENT.innerHTML.replace('\u200b', '');

                        // move the caret to the right of the newly-inserted character
                        this.__selectAndPlaceCaretInsideElement__(ELEMENT);
                    }

                    if (ELEMENT.innerHTML === '\u200b') {
                        // delete the caret selection element if it's still empty (i.e. a key was pressed but no character was put inside)
                        $(ELEMENT).remove();

                        // reset last selection data
                        this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection = null;
                        this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType = null;
                    }
                    else if (COLOR_HELPERS.isColorElement(ELEMENT)) {
                        // check if the caret selection color element is inside of an existing color element and if so take it out
                        const PARENT_COLOR_ELEMENT: HTMLElement | undefined = COLOR_HELPERS.getClosestParentColorElement(ELEMENT);

                        if (PARENT_COLOR_ELEMENT !== undefined) {
                            COLOR_HELPERS.separateColorElementFromParentColorElement(ELEMENT, PARENT_COLOR_ELEMENT);

                            this.__selectAndPlaceCaretInsideElement__(ELEMENT);
                        }

                        // check if the caret selection color element is inside of <u> or <s> elements and if so take it out of the furthest ancestor
                        const FURTHEST_UNDERLINE_OR_STRIKETHROUGH_ELEMENT: HTMLElement | undefined = COLOR_HELPERS.getFurthestUnderlineOrStrikethroughAncestorElement(ELEMENT);

                        if (FURTHEST_UNDERLINE_OR_STRIKETHROUGH_ELEMENT !== undefined) {
                            COLOR_HELPERS.separateColorElementFromUnderlineOrStrikethroughAncestorElement(ELEMENT, FURTHEST_UNDERLINE_OR_STRIKETHROUGH_ELEMENT);

                            this.__selectAndPlaceCaretInsideElement__(ELEMENT);
                        }
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

    __emptyCaretSelectionElementExists__() {
        /*
        NOTE:
        Empty caret selection elements are elements that look like:

        <tag>&ZeroWidthSpace;</tag>.

        They only exist when caret-selection styling has been applied but
        no text was written inside the generated element. They are expected to be deleted automatically after deselection if left empty.

        Deselection in this context means the caret selection element doesn't
        have the caret inside it anymore.
        */

        return this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType !== null && this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType === 'Caret' && this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection !== null && this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection.innerHTML === '\u200b';
    };

    __applyFormat__(formatElement: HTMLElement) {
        if (FORMAT_HELPERS.isFormatElement(formatElement) === false) {
            throw TypeError("Format element must be one of the following: <b>, <i>, <u>, <s>");
        }

        if (this.__selectionInTextBoxExists__()) {
            const FORMAT_ELEMENT: JQuery<HTMLElement> = $(formatElement);

            const SELECTION_TYPE: string = this.TEXT_BOX_SELECTION_DATA.selection?.type as string;

            if (SELECTION_TYPE === 'Caret') {
                
            }
            else if (SELECTION_TYPE === 'Range') {
                const SELECTION_RANGE: Range = this.TEXT_BOX_SELECTION_DATA.range as Range

                // convert selection to a fragment
                const SELECTED_CONTENTS: DocumentFragment = SELECTION_RANGE.extractContents();

                // put fragment inside of format element
                FORMAT_ELEMENT.append(SELECTED_CONTENTS);

                // replace selection with formatted contents
                SELECTION_RANGE.insertNode(FORMAT_ELEMENT[0]);

                // check if the new format element is inside of an ancestor format element with the same tag and if so undo the formatting
                const CLOSEST_DUPLICATE_ANCESTOR: HTMLElement | undefined = FORMAT_HELPERS.getClosestDuplicateAncestor(FORMAT_ELEMENT[0]);

                if (CLOSEST_DUPLICATE_ANCESTOR === undefined) {
                    // check if the new format element has descendants with the same tag and if so remove them but keep their contents
                    const DUPLICATE_DESCENDANTS: HTMLElement[] = FORMAT_HELPERS.getDuplicateDescendants(FORMAT_ELEMENT[0]);

                    if (DUPLICATE_DESCENDANTS.length > 0) {
                        $(DUPLICATE_DESCENDANTS).each((_: number, element: HTMLElement) => {
                            const DESCENDANT: JQuery<HTMLElement> = $(element);

                            DESCENDANT.replaceWith(DESCENDANT.contents());
                        });

                        GENERAL_HELPERS.mergeSimilarAdjacentChildNodes(FORMAT_ELEMENT[0]);
                    }

                    // check if the new format element is an underline/strikethrough and if it has color element descendants, if so, separate them from the new format element
                    const ELEMENT_TAG: string = formatElement.tagName.toLowerCase();
                    const INNER_COLOR_ELEMENTS: HTMLElement[] = FORMAT_HELPERS.getInnerColorElements(FORMAT_ELEMENT[0]);

                    if ((ELEMENT_TAG === 'u' || ELEMENT_TAG === 's') && INNER_COLOR_ELEMENTS.length > 0) {
                        FORMAT_HELPERS.separateInnerColorElementsFromParentFormatElement(FORMAT_ELEMENT[0]);

                        GENERAL_HELPERS.mergeSimilarAdjacentChildNodes(FORMAT_ELEMENT[0]);
                    };

                    // get rid of any empty elements left
                    GENERAL_HELPERS.deleteAllEmptyDescendants(this.TEXT_BOX[0]);
                }
                else {
                    // undo formatting
                    const PARENT: HTMLElement = FORMAT_ELEMENT.parent()[0];

                    FORMAT_ELEMENT.replaceWith(FORMAT_ELEMENT.contents());

                    GENERAL_HELPERS.mergeSimilarAdjacentChildNodes(PARENT);
                }
            }
            else {
                throw TypeError("Invalid selection type");
            }
        }
    };



    // PUBLIC
    applyColor(r: number, g: number, b: number) {
        // validate RGB values
        const ARGS: number[] = [r, g, b];

        if (ARGS.every((arg) => { return typeof arg === 'number' }) === false || ARGS.every((arg) => { return arg >= 0 && arg <= 255 }) === false) {
            throw TypeError("All RGB values must be a number between 0 and 255");
        }

        if (this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection !== null && COLOR_HELPERS.isColorElement(this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection)) {
            // apply color to the existing selection

            const SELECTED_COLOR_ELEMENT: HTMLElement = this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection;

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
                this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection = COLOR_ELEMENT[0];

                // save selection type
                this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType = SELECTION_TYPE;
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

                // check if the new color element is inside of <u> or <s> elements and if so take it out of the furthest ancestor
                const FURTHEST_UNDERLINE_OR_STRIKETHROUGH_ELEMENT: HTMLElement | undefined = COLOR_HELPERS.getFurthestUnderlineOrStrikethroughAncestorElement(COLOR_ELEMENT[0]);

                if (FURTHEST_UNDERLINE_OR_STRIKETHROUGH_ELEMENT !== undefined) {
                    COLOR_HELPERS.separateColorElementFromUnderlineOrStrikethroughAncestorElement(COLOR_ELEMENT[0], FURTHEST_UNDERLINE_OR_STRIKETHROUGH_ELEMENT);
                }

                // get rid of any empty elements left
                GENERAL_HELPERS.deleteAllEmptyDescendants(this.TEXT_BOX[0]);

                // highlight selection again
                this.__selectAndHighlightElement__(COLOR_ELEMENT[0]);

                // save reference of colored selection (in case user wants to make modifications to it before deselecting it)
                this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection = COLOR_ELEMENT[0];

                // save selection type
                this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType = SELECTION_TYPE;
            }
            else {
                throw TypeError("Invalid selection type");
            }
        }
    };

    applyBold() {
        this.__applyFormat__(document.createElement('b'));
    };

    applyItalic() {
        this.__applyFormat__(document.createElement('i'));
    };

    applyUnderline() {
        this.__applyFormat__(document.createElement('u'));
    };

    applyStrikethrough() {
        this.__applyFormat__(document.createElement('s'));
    };
};

export default RichTextEditor;