import $ from 'jquery';



const FORMAT_ELEMENT_SELECTOR: string = 'b, i, u, s';

function isFormatElement(element: HTMLElement) {
    return $.inArray(element.tagName.toLowerCase(), ['b', 'i', 'u', 's']) !== -1;
};

export {
    isFormatElement
};