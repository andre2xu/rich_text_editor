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

export interface TextColor {
    r: number,
    g: number,
    b: number
};

export interface RichTextEditorStyles {
    formats: Array<string>,
    textColor: TextColor | undefined
};

namespace RichTextEditorEvent {
    export interface MouseUp {
        metaData: JQuery.MouseUpEvent,
        styles: RichTextEditorStyles
    };

    export interface KeyUp {
        metaData: JQuery.KeyUpEvent,
        styles: RichTextEditorStyles
    };

    export interface Format {
        format: string,
        action: string // apply OR remove
    };

    export interface Color {
        textColor: TextColor
    };
};

type RichTextEditorEventListener = {
    (type: 'mouseup', listener: (event: RichTextEditorEvent.MouseUp) => void): void,
    (type: 'keyup', listener: (event: RichTextEditorEvent.KeyUp) => void): void,
    (type: 'format', listener: (event: RichTextEditorEvent.Format) => void): void,
    (type: 'color', listener: (event: RichTextEditorEvent.Color) => void): void
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
    TEXT_BOX_SELECTION_STYLES: RichTextEditorStyles = {
        formats: [],
        textColor: undefined
    };
    EVENT_LISTENERS: {[key: string]: Array<Function>} = {
        mouseup: [],
        keyup: [],
        format: [],
        color: []
    };
    TEMPORARY_CONTAINER_CLASS: string = 'temporary-rte-container';

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

                this.clearTextBoxLastSelectionData();

                this.__triggerEventListeners__(
                    'mouseup',
                    {
                        metaData: event,
                        styles: this.__getStylesInSelection__()
                    }
                );
            }
        });

        this.TEXT_BOX.on('mousedown', (_: JQuery.MouseDownEvent) => {
            // this is for resetting the selection when clicking on a highlighted text so that it registers as a caret selection instead of a range
            window.getSelection()?.removeAllRanges();
        });

        this.TEXT_BOX.on('keyup', (event: JQuery.KeyUpEvent) => {
            /*
            OBJECTIVES:
            - Delete zero-width space character from caret selection elements if the user populates them with text

            - Ignore zero-width space character if the user moves caret with arrow keys

            - Ensure caret selection element doesn't violate the rules for its type (see 'applyX' methods)

            - Delete temporary containers
            */

            // invoke listeners before selection data update (to avoid styles not being detected due to caret movement)
            this.__triggerEventListeners__(
                'keyup',
                {
                    metaData: event,
                    styles: this.__getStylesInSelection__()
                }
            );

            // update current selection data
            this.__updateTextBoxSelectionData__();

            if (event.key.indexOf('Arrow') === -1) {
                if (this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection !== null && this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType !== null) {
                    // check if a caret selection was made
                    if (this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType === 'Caret') {
                        let element: HTMLElement = this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection;

                        if (COLOR_HELPERS.isColorElement(element)) {
                            // check if the caret selection color element is inside of an existing color element and if so take it out
                            const PARENT_COLOR_ELEMENT: HTMLElement | undefined = COLOR_HELPERS.getClosestParentColorElement(element);

                            if (PARENT_COLOR_ELEMENT !== undefined) {
                                COLOR_HELPERS.separateColorElementFromParentColorElement(element, PARENT_COLOR_ELEMENT);

                                this.__selectAndPlaceCaretInsideElement__(element);
                            }

                            // check if the caret selection color element is inside of <u> or <s> elements and if so take it out of the furthest ancestor
                            const FURTHEST_UNDERLINE_OR_STRIKETHROUGH_ELEMENT: HTMLElement | undefined = COLOR_HELPERS.getFurthestUnderlineOrStrikethroughAncestorElement(element);

                            if (FURTHEST_UNDERLINE_OR_STRIKETHROUGH_ELEMENT !== undefined) {
                                COLOR_HELPERS.separateColorElementFromUnderlineOrStrikethroughAncestorElement(element, FURTHEST_UNDERLINE_OR_STRIKETHROUGH_ELEMENT);

                                this.__selectAndPlaceCaretInsideElement__(element);
                            }

                            // if the caret selection color element has descendants then the caret will be in the innermost descendant (where the user's new text will be) so mark it as the new caret element
                            const DESCENDANTS: JQuery<HTMLElement> = $(element).find('*');

                            if (DESCENDANTS.length > 0) {
                                const INNERMOST_DESCENDANT: HTMLElement = DESCENDANTS.get(-1) as HTMLElement;

                                element = INNERMOST_DESCENDANT;
                            }
                        }
                        else if (FORMAT_HELPERS.isFormatElement(element)) {
                            const FORMAT_ELEMENT: JQuery<HTMLElement> = $(element);

                            // check if the new format element is inside of an ancestor format element with the same tag and if so undo the formatting
                            const CLOSEST_DUPLICATE_ANCESTOR: HTMLElement | undefined = FORMAT_HELPERS.getClosestDuplicateAncestor(element);

                            if (CLOSEST_DUPLICATE_ANCESTOR !== undefined) {
                                const PARENT: HTMLElement = element.parentElement as HTMLElement;

                                FORMAT_ELEMENT.replaceWith(FORMAT_ELEMENT.contents());

                                GENERAL_HELPERS.mergeSimilarAdjacentChildNodes(PARENT);
                            }
                        }

                        if (element.innerText.indexOf('\u200b') !== -1) {
                            // remove ZWSC
                            element.innerHTML = element.innerHTML.replace('\u200b', '');

                            // move caret at the end of the text
                            this.__selectAndPlaceCaretInsideElement__(element);

                            // delete saved reference so that no modifications can be applied to the element that is no longer a caret selection element
                            this.clearTextBoxLastSelectionData();
                        }
                    }
                }

                // delete temporary containers (if any exist)
                this.TEXT_BOX.find(`.${this.TEMPORARY_CONTAINER_CLASS}`).each((_, container: HTMLElement) => {
                    const CONTAINER: JQuery<HTMLElement> = $(container);

                    // delete zero-width space character
                    container.innerHTML = container.innerHTML.replace('\u200b', '');

                    if (container.innerHTML.length > 0) {
                        // the non-empty container is the one with the user's text so move its contents out
                        const CONTENTS: JQuery<HTMLElement | Text | Comment | Document> = CONTAINER.contents();
                        const LAST_NODE: JQuery<HTMLElement | Text | Comment | Document> = CONTENTS.last();

                        CONTENTS.insertBefore(container);

                        // place the caret at the end of the last node
                        const NEW_SELECTION_RANGE: Range = document.createRange();
                        const NODE_TYPE: number = LAST_NODE[0].nodeType;

                        if (NODE_TYPE === Node.ELEMENT_NODE) {
                            NEW_SELECTION_RANGE.selectNodeContents(LAST_NODE[0]);
                        }
                        else if (NODE_TYPE === Node.TEXT_NODE) {
                            NEW_SELECTION_RANGE.selectNode(LAST_NODE[0]);
                        }

                        NEW_SELECTION_RANGE.collapse();

                        const SELECTION: Selection | null = window.getSelection();

                        if (SELECTION !== null) {
                            SELECTION.removeAllRanges();
                            SELECTION.addRange(NEW_SELECTION_RANGE);

                            this.__updateTextBoxSelectionData__();
                        }
                    }

                    CONTAINER.remove();
                });
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

            const SELECTION_INSIDE_TEXT_BOX: number = TEXT_BOX_ELEMENT.compareDocumentPosition(WINDOW_SELECTION.anchorNode) & Node.DOCUMENT_POSITION_CONTAINED_BY && TEXT_BOX_ELEMENT.compareDocumentPosition(WINDOW_SELECTION.focusNode) & Node.DOCUMENT_POSITION_CONTAINED_BY;

            const SELECTION_IS_TEXT_BOX: boolean = WINDOW_SELECTION.anchorNode === TEXT_BOX_ELEMENT && WINDOW_SELECTION.focusNode === TEXT_BOX_ELEMENT;

            if (SELECTION_INSIDE_TEXT_BOX || SELECTION_IS_TEXT_BOX) {
                this.TEXT_BOX_SELECTION_DATA.selection = WINDOW_SELECTION;
                this.TEXT_BOX_SELECTION_DATA.range = WINDOW_SELECTION.getRangeAt(0);
            }
        }
    };

    __getStylesInSelection__() {
        const STYLES: RichTextEditorStyles = {
            formats: [],
            textColor: undefined
        };

        if (this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection !== null && this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType !== null && this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType === 'Range') {
            const SELECTED_ELEMENT: JQuery<HTMLElement> = $(this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection);
            const TAG: string = SELECTED_ELEMENT[0].tagName.toLowerCase();

            // get formats
            SELECTED_ELEMENT.parents(FORMAT_HELPERS.FORMAT_ELEMENT_SELECTOR).each((_, element: HTMLElement) => {
                STYLES.formats.push(element.tagName.toLowerCase());
            });

            if (FORMAT_HELPERS.isFormatElement(SELECTED_ELEMENT[0]) && $.inArray(TAG, STYLES.formats) === -1) {
                STYLES.formats.push(TAG);
            }

            // get color
            let color_string: string | undefined = undefined;

            if (COLOR_HELPERS.isColorElement(SELECTED_ELEMENT[0])) {
                color_string = SELECTED_ELEMENT.css('color');
            }
            else {
                color_string = SELECTED_ELEMENT.parents(COLOR_HELPERS.COLOR_ELEMENT_SELECTOR).first().css('color');
            }

            if (color_string !== undefined && color_string.length > 0) {
                const RGB_STRINGS: Array<string> = color_string.replace(/[a-zA-Z)(]/g, '').split(/, ?/);

                if (RGB_STRINGS.length === 3) {
                    STYLES.textColor = {
                        r: parseInt(RGB_STRINGS[0]),
                        g: parseInt(RGB_STRINGS[1]),
                        b: parseInt(RGB_STRINGS[2])
                    };
                }
            }
        }
        else if (this.__selectionInTextBoxExists__()) {
            const SELECTION = this.TEXT_BOX_SELECTION_DATA.selection as Selection;

            if (SELECTION.anchorNode !== null && SELECTION.focusNode !== null && SELECTION.anchorNode === SELECTION.focusNode) {
                // get formats
                $(SELECTION.anchorNode).parents(FORMAT_HELPERS.FORMAT_ELEMENT_SELECTOR).each((_, element: HTMLElement) => {
                    STYLES.formats.push(element.tagName.toLowerCase());
                });

                if (SELECTION.anchorNode instanceof HTMLElement && FORMAT_HELPERS.isFormatElement(SELECTION.anchorNode)) {
                    const TAG: string = SELECTION.anchorNode.tagName.toLowerCase();

                    if ($.inArray(TAG, this.TEXT_BOX_SELECTION_STYLES.formats) === -1) {
                        STYLES.formats.push(TAG);
                    }
                }

                // get color
                let color_string: string | undefined = undefined;

                if (SELECTION.anchorNode instanceof HTMLElement && COLOR_HELPERS.isColorElement(SELECTION.anchorNode)) {
                    color_string = $(SELECTION.anchorNode).css('color');
                }
                else {
                    color_string = $(SELECTION.anchorNode).parents(COLOR_HELPERS.COLOR_ELEMENT_SELECTOR).first().css('color');
                }

                if (color_string !== undefined) {
                    const RGB_STRINGS: Array<string> = color_string.replace(/[a-zA-Z)(]/g, '').split(/, ?/);

                    if (RGB_STRINGS.length === 3) {
                        STYLES.textColor = {
                            r: parseInt(RGB_STRINGS[0]),
                            g: parseInt(RGB_STRINGS[1]),
                            b: parseInt(RGB_STRINGS[2])
                        };
                    }
                }
            }
        }

        // update the rich text editor's copy of the selection styles object
        this.TEXT_BOX_SELECTION_STYLES = STYLES;

        return STYLES;
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
        CARET_RANGE.selectNodeContents(element);

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

        const FORMAT_EVENT_DATA: RichTextEditorEvent.Format = {
            format: formatElement.tagName.toLowerCase(),
            action: 'apply'
        };

        if (this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection !== null && this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType !== null) {
            const SELECTED_ELEMENT: HTMLElement = this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection;
            const SELECTION_TYPE: string = this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType;

            if (SELECTION_TYPE === 'Caret') {
                // this block only fires when the caret selection element is still empty (because 'keyup' event handler resets last selection data if text was written)

                if (SELECTED_ELEMENT.tagName !== formatElement.tagName) {
                    const RANGE: Range = document.createRange();
                    RANGE.selectNodeContents(SELECTED_ELEMENT);
                    RANGE.surroundContents(formatElement);

                    this.__selectAndPlaceCaretInsideElement__(formatElement);

                    // save reference of formatted selection (in case user wants to make modifications to it before deselecting it)
                    this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection = formatElement;
                }
                else {
                    this.__selectAndPlaceCaretInsideElement__(SELECTED_ELEMENT);
                }

                this.__triggerEventListeners__(
                    'format',
                    FORMAT_EVENT_DATA
                );
            }
            else if (SELECTION_TYPE === 'Range') {
                const RANGE: Range = document.createRange();

                if (COLOR_HELPERS.isColorElement(SELECTED_ELEMENT)) {
                    RANGE.selectNodeContents(SELECTED_ELEMENT);
                    RANGE.surroundContents(formatElement);

                    // save reference of formatted selection (in case user wants to make modifications to it before deselecting it)
                    this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection = formatElement;
                }
                else {
                    RANGE.selectNodeContents(SELECTED_ELEMENT);
                    RANGE.surroundContents(formatElement);

                    // check if the new format element has descendants with the same tag and if so remove them but keep their contents
                    const DUPLICATE_DESCENDANTS: HTMLElement[] = FORMAT_HELPERS.getDuplicateDescendants(formatElement);

                    if (DUPLICATE_DESCENDANTS.length > 0) {
                        $(DUPLICATE_DESCENDANTS).each((_: number, element: HTMLElement) => {
                            const DESCENDANT: JQuery<HTMLElement> = $(element);

                            DESCENDANT.replaceWith(DESCENDANT.contents());
                        });

                        GENERAL_HELPERS.mergeSimilarAdjacentChildNodes(formatElement);
                    }

                    // check if the new format element is an underline/strikethrough and if it has color element descendants, if so, separate them from the new format element
                    const ELEMENT_TAG: string = formatElement.tagName.toLowerCase();
                    const INNER_COLOR_ELEMENTS: HTMLElement[] = FORMAT_HELPERS.getInnerColorElements(formatElement);

                    if ((ELEMENT_TAG === 'u' || ELEMENT_TAG === 's') && INNER_COLOR_ELEMENTS.length > 0) {
                        FORMAT_HELPERS.separateInnerColorElementsFromParentFormatElement(formatElement);

                        GENERAL_HELPERS.mergeSimilarAdjacentChildNodes(formatElement);
                    };

                    // get rid of any empty elements left
                    GENERAL_HELPERS.deleteAllEmptyDescendants(this.TEXT_BOX[0]);

                    // highlight selection again
                    this.__selectAndHighlightElement__(formatElement);

                    // save reference of formatted selection (in case user wants to make modifications to it before deselecting it)
                    this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection = formatElement;
                }

                this.__triggerEventListeners__(
                    'format',
                    FORMAT_EVENT_DATA
                );
            }
        }
        else if (this.__selectionInTextBoxExists__()) {
            const FORMAT_ELEMENT: JQuery<HTMLElement> = $(formatElement);

            const SELECTION_TYPE: string = this.TEXT_BOX_SELECTION_DATA.selection?.type as string;

            if (SELECTION_TYPE === 'Caret') {
                // check if the new format element is going to be inside a format element with the same tag and if so do not apply the formatting
                const ANCESTOR_FORMAT_ELEMENT_WITH_SAME_TAG: HTMLElement | undefined = $(this.TEXT_BOX_SELECTION_DATA.selection?.anchorNode as Node).parents(formatElement.tagName).first()[0] as HTMLElement;

                if (ANCESTOR_FORMAT_ELEMENT_WITH_SAME_TAG === undefined) {
                    const SELECTION_RANGE: Range = this.TEXT_BOX_SELECTION_DATA.range as Range;

                    // add a zero-width space character to the empty format element so that it can be focused
                    FORMAT_ELEMENT.append(document.createTextNode('\u200b'));

                    SELECTION_RANGE.insertNode(FORMAT_ELEMENT[0]);

                    // make caret re-appear inside the format element
                    this.__selectAndPlaceCaretInsideElement__(FORMAT_ELEMENT[0]);

                    // save reference of formatted selection (in case user wants to make modifications to it before deselecting it)
                    this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection = FORMAT_ELEMENT[0];

                    // save selection type
                    this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType = SELECTION_TYPE;
                }
                else {
                    // make caret re-appear at the same spot
                    const WINDOW_SELECTION: Selection = window.getSelection() as Selection;

                    WINDOW_SELECTION.removeAllRanges();

                    WINDOW_SELECTION.addRange(this.TEXT_BOX_SELECTION_DATA.range as Range);
                }

                this.__triggerEventListeners__(
                    'format',
                    FORMAT_EVENT_DATA
                );
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

                    if (this.TEXT_BOX[0].contains(FORMAT_ELEMENT[0])) {
                        // get rid of any empty elements left
                        GENERAL_HELPERS.deleteAllEmptyDescendants(this.TEXT_BOX[0]);

                        // highlight selection again
                        this.__selectAndHighlightElement__(FORMAT_ELEMENT[0]);

                        // save reference of formatted selection (in case user wants to make modifications to it before deselecting it)
                        this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection = FORMAT_ELEMENT[0];

                        // save selection type
                        this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType = SELECTION_TYPE;
                    }
                }
                else {
                    // undo formatting
                    const PARENT: HTMLElement = FORMAT_ELEMENT.parent()[0];

                    FORMAT_ELEMENT.replaceWith(FORMAT_ELEMENT.contents());

                    GENERAL_HELPERS.mergeSimilarAdjacentChildNodes(PARENT);
                }

                this.__triggerEventListeners__(
                    'format',
                    FORMAT_EVENT_DATA
                );
            }
            else {
                throw TypeError("Invalid selection type");
            }
        }
    };

    __removeFormat__(format: string) {
        if ($.inArray(format, ['b', 'i', 'u', 's']) === -1) {
            throw RangeError(`Format must be one of the following: ${FORMAT_HELPERS.FORMAT_ELEMENT_SELECTOR}`);
        }

        const FORMAT_EVENT_DATA: RichTextEditorEvent.Format = {
            format: format,
            action: 'remove'
        };

        if (this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType === 'Range' && this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection !== null) {
            // this block handles removal of formats in highlighted range selections

            const HIGHLIGHTED_ELEMENT: JQuery<HTMLElement> = $(this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection);

            const TARGET: JQuery<HTMLElement> = HIGHLIGHTED_ELEMENT.parents(format).first();

            if (TARGET[0] === undefined) {
                // target is the highlighted element

                const CONTENTS: JQuery<HTMLElement | Text | Comment | Document> = HIGHLIGHTED_ELEMENT.contents();

                const PARENT: HTMLElement = HIGHLIGHTED_ELEMENT.parent()[0];

                CONTENTS.insertAfter(HIGHLIGHTED_ELEMENT[0]);
                HIGHLIGHTED_ELEMENT.remove();

                GENERAL_HELPERS.mergeSimilarAdjacentChildNodes(PARENT);
            }
            else {
                TARGET.contents().insertAfter(TARGET[0]);
                TARGET.remove();
            }

            this.__triggerEventListeners__(
                'format',
                FORMAT_EVENT_DATA
            );
        }
        else if (this.__selectionInTextBoxExists__()) {
            const SELECTION_RANGE: Range = this.TEXT_BOX_SELECTION_DATA.range as Range;
            const SELECTION_TYPE: string = this.TEXT_BOX_SELECTION_DATA.selection?.type as string;

            if (SELECTION_TYPE === 'Caret' && SELECTION_RANGE.startContainer instanceof HTMLElement && SELECTION_RANGE.startContainer.innerHTML === '\u200b') {
                // this block only runs when the user clicks on a format button that's already active without typing anything into the caret selection element (i.e. they want to undo a format that's been applied to the caret selection)

                const CARET_FORMAT_ELEMENT: JQuery<HTMLElement> = $(SELECTION_RANGE.startContainer);

                const TARGET: JQuery<HTMLElement> = CARET_FORMAT_ELEMENT.parents(format).first();

                if (TARGET[0] === undefined) {
                    // target is the caret format element

                    CARET_FORMAT_ELEMENT.contents().insertAfter(CARET_FORMAT_ELEMENT[0]);

                    const PARENT: HTMLElement = CARET_FORMAT_ELEMENT.parent()[0];

                    CARET_FORMAT_ELEMENT.remove();

                    if (PARENT.innerHTML !== '\u200b') {
                        GENERAL_HELPERS.mergeSimilarAdjacentChildNodes(PARENT);

                        // find the zero-width space character and place caret at the end of it
                        $(PARENT.childNodes).each((_, node: NodeListOf<ChildNode>) => {
                            if (node instanceof Node && node.nodeType === Node.TEXT_NODE && node.nodeValue !== null) {
                                const ZWSC_POSITION: number = node.nodeValue.indexOf('\u200b');

                                if (ZWSC_POSITION !== -1) {
                                    // delete zero-width space character since it's no longer needed to find the caret's original position
                                    node.nodeValue = node.nodeValue.replace('\u200b', '');

                                    // make the caret re-appear at its original position
                                    const NEW_CARET_SELECTION_RANGE: Range = document.createRange();
                                    NEW_CARET_SELECTION_RANGE.setStart(node, ZWSC_POSITION);
                                    NEW_CARET_SELECTION_RANGE.collapse();

                                    const SELECTION: Selection | null = window.getSelection();

                                    if (SELECTION !== null) {
                                        SELECTION.removeAllRanges();
                                        SELECTION.addRange(NEW_CARET_SELECTION_RANGE);

                                        this.__updateTextBoxSelectionData__();
                                    }

                                    // stop loop
                                    return false;
                                }
                            }
                        });
                    }
                    else {
                        this.__selectAndPlaceCaretInsideElement__(PARENT);

                        // save reference of empty caret selection format element (in case user wants to make modifications to it before deselecting it)
                        this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection = PARENT;
                    }

                    this.__triggerEventListeners__(
                        'format',
                        FORMAT_EVENT_DATA
                    );
                }
                else {
                    // target is an ancestor of the caret format element

                    TARGET.replaceWith(CARET_FORMAT_ELEMENT[0]);

                    this.__selectAndPlaceCaretInsideElement__(CARET_FORMAT_ELEMENT[0]);

                    this.__triggerEventListeners__(
                        'format',
                        FORMAT_EVENT_DATA
                    );
                }
            }
            else {
                const TEMPORARY_CONTAINER: JQuery<HTMLElement> = $(document.createElement('span'));
                TEMPORARY_CONTAINER.addClass(this.TEMPORARY_CONTAINER_CLASS);

                SELECTION_RANGE.surroundContents(TEMPORARY_CONTAINER[0]);

                let styled_container: HTMLElement | undefined = undefined;
                let target_format_element: HTMLElement | undefined = undefined;

                TEMPORARY_CONTAINER.parents().each((_, parent: HTMLElement) => {
                    const TAG: string = parent.tagName.toLowerCase();

                    if (TAG === format) {
                        // stop when the target format has been reached
                        target_format_element = parent;

                        return false;
                    }

                    // recreate the selection's styles but exclude the target format
                    const STYLE_ELEMENT: HTMLElement = document.createElement(TAG);

                    if (FORMAT_HELPERS.isFormatElement(STYLE_ELEMENT) || COLOR_HELPERS.isColorElement(STYLE_ELEMENT)) {
                        if (styled_container === undefined) {
                            styled_container = STYLE_ELEMENT;
                        }
                        else {
                            STYLE_ELEMENT.appendChild(styled_container);

                            styled_container = STYLE_ELEMENT;
                        }
                    }
                });

                // put the modified version of the selection's styled container inside the temporary container
                if (styled_container !== undefined) {
                    TEMPORARY_CONTAINER.append(styled_container);
                }

                if (target_format_element !== undefined) {
                    // separate temporary container from target format element
                    GENERAL_HELPERS.separateElementFromSpecificAncestor(TEMPORARY_CONTAINER[0], target_format_element);

                    if (SELECTION_TYPE === 'Caret') {
                        const INNERMOST_ELEMENT: JQuery<HTMLElement> = TEMPORARY_CONTAINER.find('*').last();

                        if (INNERMOST_ELEMENT[0] !== undefined) {
                            INNERMOST_ELEMENT.text('\u200b');

                            // make caret re-appear inside the temporary container's innermost element
                            this.__selectAndPlaceCaretInsideElement__(INNERMOST_ELEMENT[0]);
                        }
                        else {
                            TEMPORARY_CONTAINER.text('\u200b');

                            // make caret re-appear inside the temporary container
                            this.__selectAndPlaceCaretInsideElement__(TEMPORARY_CONTAINER[0]);
                        }

                        this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType = SELECTION_TYPE;

                        // delete empty format elements with the same tag
                        this.TEXT_BOX.find(format).each((_, element: HTMLElement) => {
                            if (element.innerHTML.length === 0) {
                                $(element).remove();
                            }
                        });

                        this.__triggerEventListeners__(
                            'format',
                            FORMAT_EVENT_DATA
                        );
                    }
                    else if (SELECTION_TYPE === 'Range') {
                        // move the temporary container's contents outside of the element
                        const CONTENTS: JQuery<HTMLElement | Document | Text | Comment> = TEMPORARY_CONTAINER.contents();
                        const FIRST_NODE: JQuery<HTMLElement | Document | Text | Comment> = CONTENTS.first();
                        const LAST_NODE: JQuery<HTMLElement | Document | Text | Comment> = CONTENTS.last();

                        CONTENTS.insertBefore(TEMPORARY_CONTAINER[0]);

                        // highlight the selection again
                        const NEW_SELECTION_RANGE: Range = document.createRange();
                        NEW_SELECTION_RANGE.setStartBefore(FIRST_NODE[0]);
                        NEW_SELECTION_RANGE.setEndAfter(LAST_NODE[0]);

                        const SELECTION: Selection | null = window.getSelection();

                        if (SELECTION !== null) {
                            SELECTION.removeAllRanges();
                            SELECTION.addRange(NEW_SELECTION_RANGE);

                            this.__updateTextBoxSelectionData__();

                            // get rid of the temporary container
                            TEMPORARY_CONTAINER.remove();
                        }

                        this.__triggerEventListeners__(
                            'format',
                            FORMAT_EVENT_DATA
                        );
                    }
                    else {
                        throw TypeError("Invalid selection type");
                    }
                }
            }
        }
    };

    __toggleFormat__(format: string) {
        if ($.inArray(format, this.TEXT_BOX_SELECTION_STYLES.formats) !== -1) {
            this.__removeFormat__(format);
        }
        else {
            switch (format) {
                case 'b':
                    this.applyBold();
                    break;
                case 'i':
                    this.applyItalic();
                    break;
                case 'u':
                    this.applyUnderline();
                    break;
                case 's':
                    this.applyStrikethrough();
                    break;
            }
        }
    };

    __triggerEventListeners__(event: string, eventData: any) {
        if (this.EVENT_LISTENERS[event] === undefined) {
            throw RangeError("That event does not exist");
        }

        if ($.inArray(event, ['format', 'color']) !== -1) {
            // update selection styles data
            this.__getStylesInSelection__();
        }

        // invoke listener(s)
        const LISTENERS: Array<Function> = this.EVENT_LISTENERS[event];
        const NUM_OF_LISTENERS: number = LISTENERS.length;

        for (let i=0; i < NUM_OF_LISTENERS; i++) {
            LISTENERS[i](eventData);
        }
    };



    // PUBLIC
    addEventListener: RichTextEditorEventListener = (type: string, listener: any) => {
        if (this.EVENT_LISTENERS[type] === undefined) {
            throw RangeError("Invalid event type");
        }

        this.EVENT_LISTENERS[type].push(listener);
    };

    clearTextBoxLastSelectionData() {
        this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection = null;
        this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType = null;
    };

    applyColor(r: number, g: number, b: number) {
        // validate RGB values
        const ARGS: number[] = [r, g, b];

        if (ARGS.every((arg) => { return typeof arg === 'number' }) === false || ARGS.every((arg) => { return arg >= 0 && arg <= 255 }) === false) {
            throw TypeError("All RGB values must be a number between 0 and 255");
        }

        // create color element
        const COLOR_ELEMENT: JQuery<HTMLSpanElement> = $(document.createElement('span'));
        COLOR_ELEMENT.attr('data-type', 'color');
        COLOR_ELEMENT.css('color', `rgb(${r},${g},${b})`);

        if (this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection !== null && this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType !== null) {
            const SELECTED_ELEMENT: HTMLElement = this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection;
            const SELECTION_TYPE: string = this.TEXT_BOX_LAST_SELECTION_DATA.lastSelectionType;

            if (SELECTION_TYPE === 'Caret') {
                // this block only fires when the caret selection element is still empty (because 'keyup' event handler resets last selection data if text was written)

                if (COLOR_HELPERS.isColorElement(SELECTED_ELEMENT)) {
                    // modify color of caret-selected color element
                    $(SELECTED_ELEMENT).css('color', `rgb(${r},${g},${b})`);

                    this.__selectAndPlaceCaretInsideElement__(SELECTED_ELEMENT);
                }
                else {
                    // add color to other caret-selected elements
                    const RANGE: Range = document.createRange();
                    RANGE.selectNode(SELECTED_ELEMENT);
                    RANGE.surroundContents(COLOR_ELEMENT[0]);

                    // NOTE: no need to process because the 'keyup' event handler will do it once text is added

                    // make caret re-appear inside the color element
                    this.__selectAndPlaceCaretInsideElement__(COLOR_ELEMENT[0]);

                    // save reference of colored selection (in case user wants to make modifications to it before deselecting it)
                    this.TEXT_BOX_LAST_SELECTION_DATA.lastSelection = COLOR_ELEMENT[0];
                }
            }
            else if (SELECTION_TYPE === 'Range') {
                if (COLOR_HELPERS.isColorElement(SELECTED_ELEMENT)) {
                    // modify color of range-selected color element
                    $(SELECTED_ELEMENT).css('color', `rgb(${r},${g},${b})`);

                    // highlight selection again
                    this.__selectAndHighlightElement__(SELECTED_ELEMENT);
                }
                else {
                    // add color to other range-selected elements
                    const RANGE: Range = document.createRange();
                    RANGE.selectNode(SELECTED_ELEMENT);
                    RANGE.surroundContents(COLOR_ELEMENT[0]);

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
                }
            }
        }
        else if (this.__selectionInTextBoxExists__()) {
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

    toggleBold() {
        this.__toggleFormat__('b');
    };

    toggleItalic() {
        this.__toggleFormat__('i');
    };

    toggleUnderline() {
        this.__toggleFormat__('u');
    };

    toggleStrikethrough() {
        this.__toggleFormat__('s');
    };
};

export default RichTextEditor;