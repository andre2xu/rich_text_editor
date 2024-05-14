import $ from 'jquery';



const COLOR_ELEMENT_SELECTOR: string = 'span[data-type="color"]';

function isColorElement(element: HTMLElement) {
    return element instanceof HTMLSpanElement && element.getAttribute('data-type') === 'color';
};

function getClosestParentColorElement(child: HTMLElement): HTMLElement | undefined {
    if (isColorElement(child)) {
        const PARENT = $(child).parents(COLOR_ELEMENT_SELECTOR).first()[0];

        return PARENT;
    }

    throw TypeError("Child element must be a color element");
};

function getInnerColorElements(parent: HTMLElement) {
    if (isColorElement(parent) === false) {
        throw TypeError("Parent must be a color element");
    }

    return $(parent).find(COLOR_ELEMENT_SELECTOR).toArray();
};

function separateColorElementFromParentColorElement(child: HTMLElement, parent: HTMLElement) {
    if (isColorElement(child) === false) {
        throw TypeError("Child element must be a color element");
    }

    if (isColorElement(parent) === false) {
        throw TypeError("Parent element must be a color element");
    }

    const PARENT_RANGE: Range = document.createRange();
    PARENT_RANGE.selectNode(parent);

    // move parent into a fragment
    const PARENT_FRAGMENT: DocumentFragment = PARENT_RANGE.extractContents();

    // split parent contents into 3 slices (left, middle, right); the middle slice is the color element to separate
    const LEFT_SLICE_RANGE: Range = document.createRange();
    LEFT_SLICE_RANGE.setStartBefore(PARENT_FRAGMENT.children[0]);
    LEFT_SLICE_RANGE.setEndBefore(child);

    const MIDDLE_SLICE_RANGE: Range = document.createRange();
    MIDDLE_SLICE_RANGE.selectNode(child);

    const RIGHT_SLICE_RANGE: Range = document.createRange();
    RIGHT_SLICE_RANGE.setStartAfter(child);
    RIGHT_SLICE_RANGE.setEndAfter(PARENT_FRAGMENT.children[0]);

    // shallow copy the non-color-element parents of the color element
    const NON_COLOR_ELEMENT_PARENTS: Node[] = [];

    $(child).parents().each((_: number, p: HTMLElement) => {
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

export {
    isColorElement,
    getClosestParentColorElement,
    getInnerColorElements,
    separateColorElementFromParentColorElement
};