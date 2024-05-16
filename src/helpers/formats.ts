import $ from 'jquery';



function isFormatElement(element: HTMLElement) {
    return $.inArray(element.tagName.toLowerCase(), ['b', 'i', 'u', 's']) !== -1;
};

export {
    isFormatElement
};