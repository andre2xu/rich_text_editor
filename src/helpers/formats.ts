import $ from 'jquery';



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

export {
    isFormatElement,
    getDuplicateDescendants,
    getClosestDuplicateAncestor
};