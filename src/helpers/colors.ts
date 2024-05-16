import $ from 'jquery';



const COLOR_ELEMENT_SELECTOR: string = 'span[data-type="color"]';

function isColorElement(element: HTMLElement) {
    return element instanceof HTMLSpanElement && element.getAttribute('data-type') === 'color';
};

function getClosestParentColorElement(colorElement: HTMLElement): HTMLElement | undefined {
    if (isColorElement(colorElement)) {
        const PARENT = $(colorElement).parents(COLOR_ELEMENT_SELECTOR).first()[0];

        return PARENT;
    }

    throw TypeError("Child element must be a color element");
};

function getFurthestUnderlineOrStrikethroughAncestorElement(colorElement: HTMLElement): HTMLElement | undefined {
    if (isColorElement(colorElement) === false) {
        throw TypeError("Must be a color element");
    }

    return $(colorElement).parents('u, s').last()[0];
};

function getInnerColorElements(parent: HTMLElement) {
    if (isColorElement(parent) === false) {
        throw TypeError("Parent must be a color element");
    }

    return $(parent).find(COLOR_ELEMENT_SELECTOR).toArray();
};

function separateColorElementFromParentColorElement(colorElement: HTMLElement, parent: HTMLElement) {
    if (isColorElement(colorElement) === false) {
        throw TypeError("Must be a color element");
    }

    if (isColorElement(parent) === false) {
        throw TypeError("Parent element must be a color element");
    }

    if ((parent.compareDocumentPosition(colorElement) & Node.DOCUMENT_POSITION_CONTAINED_BY) === 0) {
        throw ReferenceError("The given parent element does not contain that color element");
    }

    const PARENT_RANGE: Range = document.createRange();
    PARENT_RANGE.selectNode(parent);

    // move parent into a fragment
    const PARENT_FRAGMENT: DocumentFragment = PARENT_RANGE.extractContents();

    // split parent contents into 3 slices (left, middle, right); the middle slice is the color element to separate
    const LEFT_SLICE_RANGE: Range = document.createRange();
    LEFT_SLICE_RANGE.setStartBefore(PARENT_FRAGMENT.children[0]);
    LEFT_SLICE_RANGE.setEndBefore(colorElement);

    const MIDDLE_SLICE_RANGE: Range = document.createRange();
    MIDDLE_SLICE_RANGE.selectNode(colorElement);

    const RIGHT_SLICE_RANGE: Range = document.createRange();
    RIGHT_SLICE_RANGE.setStartAfter(colorElement);
    RIGHT_SLICE_RANGE.setEndAfter(PARENT_FRAGMENT.children[0]);

    // shallow copy the non-color-element parents of the color element
    const NON_COLOR_ELEMENT_PARENTS: Node[] = [];

    $(colorElement).parents().each((_: number, p: HTMLElement) => {
        if (p === parent) {
            // stop looping if the color element parent has been reached
            return false;
        }

        // make a shallow copy of the parent (in order to keep any attributes while leaving the element itself empty)
        NON_COLOR_ELEMENT_PARENTS.push(p.cloneNode(false));
    });

    // extract the slices
    const LEFT_SLICE_FRAGMENT: DocumentFragment = LEFT_SLICE_RANGE.extractContents();
    const MIDDLE_SLICE_FRAGMENT: DocumentFragment = MIDDLE_SLICE_RANGE.extractContents();
    const RIGHT_SLICE_FRAGMENT: DocumentFragment = RIGHT_SLICE_RANGE.extractContents();

    // wrap the contents of the child color element with the non-color-element parents
    $(NON_COLOR_ELEMENT_PARENTS).each((_: number, element: Node[]) => {
        if (element instanceof HTMLElement) {
            const RANGE = document.createRange();
            RANGE.selectNodeContents(MIDDLE_SLICE_FRAGMENT.children[0]);
            RANGE.surroundContents(element);
        }
    });

    // create a new fragment that has the color elements separated
    const NEW_PARENT_FRAGMENT: DocumentFragment = document.createDocumentFragment();

    NEW_PARENT_FRAGMENT.append(LEFT_SLICE_FRAGMENT);
    NEW_PARENT_FRAGMENT.append(MIDDLE_SLICE_FRAGMENT);
    NEW_PARENT_FRAGMENT.append(RIGHT_SLICE_FRAGMENT);

    // delete empty elements
    $(NEW_PARENT_FRAGMENT).find('*').each((_: number, element: HTMLElement) => {
        if (element.innerHTML.length === 0) {
            $(element).remove();
        }
    });

    // replace parent fragment with new one
    PARENT_RANGE.insertNode(NEW_PARENT_FRAGMENT);
};

function separateColorElementFromUnderlineOrStrikethroughAncestorElement(colorElement: HTMLElement, ancestor: HTMLElement) {
    if (isColorElement(colorElement) === false) {
        throw TypeError("Must be a color element");
    }

    if (ancestor.tagName !== 'U' && ancestor.tagName !== 'S') {
        throw TypeError("The ancestor must be an underline or strikethrough element");
    }

    if ((ancestor.compareDocumentPosition(colorElement) & Node.DOCUMENT_POSITION_CONTAINED_BY) === 0) {
        throw ReferenceError("The given ancestor does not contain that color element");
    }

    const ANCESTOR_RANGE: Range = document.createRange();
    ANCESTOR_RANGE.selectNode(ancestor);

    const ANCESTOR_FRAGMENT: DocumentFragment = ANCESTOR_RANGE.extractContents();

    // get all the underline/strikethrough ancestors of the color element
    const ANCESTORS = $(colorElement).parents('u, s');

    // divide the ancestor fragment into 3 fragment slices (left, middle, right); the middle slice contains the color element to separate
    const LEFT_SLICE_RANGE: Range = document.createRange();
    LEFT_SLICE_RANGE.setStartBefore(ANCESTOR_FRAGMENT.children[0]);
    LEFT_SLICE_RANGE.setEndBefore(colorElement);

    const MIDDLE_SLICE_RANGE: Range = document.createRange();
    MIDDLE_SLICE_RANGE.selectNode(colorElement);

    const RIGHT_SLICE_RANGE: Range = document.createRange();
    RIGHT_SLICE_RANGE.setStartAfter(colorElement);
    RIGHT_SLICE_RANGE.setEndAfter(ANCESTOR_FRAGMENT.children[0]);

    // extract the fragment slices
    const LEFT_SLICE: DocumentFragment = LEFT_SLICE_RANGE.extractContents();
    const MIDDLE_SLICE: DocumentFragment = MIDDLE_SLICE_RANGE.extractContents();
    const RIGHT_SLICE: DocumentFragment = RIGHT_SLICE_RANGE.extractContents();

    // wrap the contents of the color element with all the underline/strikethrough ancestors
    const COLOR_ELEMENT_CONTENTS_RANGE: Range = document.createRange();
    COLOR_ELEMENT_CONTENTS_RANGE.selectNodeContents(colorElement);

    ANCESTORS.each((_: number, ancestor: HTMLElement) => {
        COLOR_ELEMENT_CONTENTS_RANGE.surroundContents(ancestor.cloneNode());
    });

    // create a new ancestor fragment that has the color element separated
    const NEW_ANCESTOR_FRAGMENT: DocumentFragment = document.createDocumentFragment();

    NEW_ANCESTOR_FRAGMENT.append(LEFT_SLICE);
    NEW_ANCESTOR_FRAGMENT.append(MIDDLE_SLICE);
    NEW_ANCESTOR_FRAGMENT.append(RIGHT_SLICE);

    // delete empty elements
    $(NEW_ANCESTOR_FRAGMENT).find('*').each((_: number, element: HTMLElement) => {
        if (element.innerHTML.length === 0) {
            $(element).remove();
        }
    });

    // replace the old ancestor fragment with the new one
    ANCESTOR_RANGE.insertNode(NEW_ANCESTOR_FRAGMENT);
};

function removeInnerColorElements(parent: HTMLElement) {
    if (isColorElement(parent) === false) {
        throw TypeError("Parent must be a color element");
    }

    const RANGE: Range = document.createRange();
    RANGE.selectNode(parent);

    const FRAGMENT: DocumentFragment = RANGE.extractContents();

    // find all inner color elements and move their contents out
    $(FRAGMENT.children[0]).find(COLOR_ELEMENT_SELECTOR).each((_: number, innerColorElement: HTMLElement) => {
        const INNER_COLOR_ELEMENT: JQuery<HTMLElement> = $(innerColorElement);

        INNER_COLOR_ELEMENT.replaceWith(INNER_COLOR_ELEMENT.contents());
    });

    RANGE.insertNode(FRAGMENT);
};

export {
    isColorElement,
    getClosestParentColorElement,
    getFurthestUnderlineOrStrikethroughAncestorElement,
    getInnerColorElements,
    separateColorElementFromParentColorElement,
    separateColorElementFromUnderlineOrStrikethroughAncestorElement,
    removeInnerColorElements
};