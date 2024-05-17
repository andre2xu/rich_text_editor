import $ from 'jquery';
import { COLOR_ELEMENT_SELECTOR } from './colors';



const FORMAT_ELEMENT_SELECTOR: string = 'b, i, u, s';

function isFormatElement(element: HTMLElement) {
    return $.inArray(element.tagName.toLowerCase(), ['b', 'i', 'u', 's']) !== -1;
};

function getDuplicateDescendants(formatElement: HTMLElement): HTMLElement[] {
    if (isFormatElement(formatElement) === false) {
        throw TypeError("Must be a format element");
    }

    const ELEMENT_TAG: string = formatElement.tagName.toLowerCase();

    return $(formatElement).find(ELEMENT_TAG).toArray();
};

function getClosestDuplicateAncestor(formatElement: HTMLElement): HTMLElement | undefined {
    if (isFormatElement(formatElement) === false) {
        throw TypeError("Must be a format element");
    }

    const ELEMENT_TAG: string = formatElement.tagName.toLowerCase();

    return $(formatElement).parents(ELEMENT_TAG).first()[0];
};

function getInnerColorElements(formatElement: HTMLElement): HTMLElement[] {
    if (isFormatElement(formatElement) === false) {
        throw TypeError("Must be a format element");
    }

    return $(formatElement).find(COLOR_ELEMENT_SELECTOR).toArray();
};

function separateInnerColorElementsFromParentFormatElement(formatElement: HTMLElement) {
    if (isFormatElement(formatElement) === false) {
        throw TypeError("Must be a format element");
    }

    const FORMAT_ELEMENT_TAG: string = formatElement.tagName.toLowerCase();

    const PARENT_RANGE: Range = document.createRange();
    PARENT_RANGE.selectNode(formatElement);

    const PARENT_FRAGMENT: DocumentFragment = PARENT_RANGE.extractContents();

    const INNER_COLOR_ELEMENTS: HTMLElement[] = $(PARENT_FRAGMENT).find(COLOR_ELEMENT_SELECTOR).toArray();
    const LAST_COLOR_ELEMENT_INDEX: number = INNER_COLOR_ELEMENTS.length - 1;

    // divide the parent format element into color element & non-color-element slices
    const FIRST_SLICE_RANGE: Range = document.createRange();
    FIRST_SLICE_RANGE.setStartBefore(formatElement);
    FIRST_SLICE_RANGE.setEndBefore(INNER_COLOR_ELEMENTS[0]);

    const LAST_SLICE_RANGE: Range = document.createRange();
    LAST_SLICE_RANGE.setStartAfter(INNER_COLOR_ELEMENTS[LAST_COLOR_ELEMENT_INDEX]);
    LAST_SLICE_RANGE.setEndAfter(formatElement);

    const RANGES_OF_MIDDLE_SLICES: Range[] = [];

    $(INNER_COLOR_ELEMENTS).each((index: number, colorElement: HTMLElement) => {
        const COLOR_ELEMENT_RANGE: Range = document.createRange();
        COLOR_ELEMENT_RANGE.selectNode(colorElement);

        // wrap the contents of color elements with the format element (i.e. put the underline/strikethrough inside the color elements)
        const CURRENT_COLOR_ELEMENT: JQuery<HTMLElement> = $(colorElement);
        const FORMAT_ELEMENT: JQuery<HTMLElement> = $(document.createElement(FORMAT_ELEMENT_TAG));

        CURRENT_COLOR_ELEMENT.contents().appendTo(FORMAT_ELEMENT);
        CURRENT_COLOR_ELEMENT.append(FORMAT_ELEMENT);

        RANGES_OF_MIDDLE_SLICES.push(COLOR_ELEMENT_RANGE);

        // get the range of the nodes in between the current color element and the next
        if (index < LAST_COLOR_ELEMENT_INDEX) {
            const IN_BETWEEN_CONTENT_RANGE: Range = document.createRange();

            IN_BETWEEN_CONTENT_RANGE.setStartAfter(colorElement);
            IN_BETWEEN_CONTENT_RANGE.setEndBefore(INNER_COLOR_ELEMENTS[index + 1]);

            // wrap the in between nodes with the format element
            IN_BETWEEN_CONTENT_RANGE.surroundContents(document.createElement(FORMAT_ELEMENT_TAG));

            RANGES_OF_MIDDLE_SLICES.push(IN_BETWEEN_CONTENT_RANGE);
        }
    });

    // build a new parent fragment using the slices
    const NEW_PARENT_FRAGMENT: DocumentFragment = document.createDocumentFragment();

    NEW_PARENT_FRAGMENT.append(FIRST_SLICE_RANGE.extractContents());

    $(RANGES_OF_MIDDLE_SLICES).each((_: number, range: Range[]) => {
        if (range instanceof Range) {
            NEW_PARENT_FRAGMENT.append(range.extractContents());
        }
    });

    NEW_PARENT_FRAGMENT.append(LAST_SLICE_RANGE.extractContents());

    // replace the old parent fragment with the new one
    PARENT_RANGE.insertNode(NEW_PARENT_FRAGMENT);
};

export {
    isFormatElement,
    getDuplicateDescendants,
    getClosestDuplicateAncestor,
    getInnerColorElements,
    separateInnerColorElementsFromParentFormatElement
};