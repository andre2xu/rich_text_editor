import $ from 'jquery';



function isColorElement(element: HTMLElement) {
    return element instanceof HTMLSpanElement && element.getAttribute('data-type') === 'color';
};

function getClosestParentColorElement(child: HTMLElement): HTMLElement | undefined {
    if (isColorElement(child)) {
        const PARENT = $(child).parents('span[data-type="color"]').first()[0];

        return PARENT;
    }

    throw TypeError("Child element must be a color element");
};

export {
    isColorElement,
    getClosestParentColorElement
};