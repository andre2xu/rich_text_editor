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

export {
    isFormatElement,
    getDuplicateDescendants,
    getClosestDuplicateAncestor,
    getInnerColorElements
};