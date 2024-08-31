import $ from 'jquery';
import * as FORMAT_HELPERS from './formats';
import * as COLOR_HELPERS from './colors';



function moveContentsTo(element: HTMLElement, destination: HTMLElement) {
    const ELEMENT: JQuery<HTMLElement> = $(element);

    ELEMENT.contents().appendTo(destination);
    ELEMENT.remove();

    mergeSimilarAdjacentChildNodes(destination);
};

function mergeSimilarAdjacentChildNodes(parent: HTMLElement) {
    const RANGE: Range = document.createRange();
    RANGE.selectNodeContents(parent);

    const FRAGMENT: DocumentFragment = RANGE.extractContents();

    // perform merging
    const NODES_TO_DELETE: Node[] = [];

    let previous_node: Node;

    $(FRAGMENT).contents().each((_: number, node: Document | DocumentFragment | Text | Comment) => {
        if (previous_node === undefined) {
            previous_node = node;

            return; // skip first node
        }

        let current_node_marked_for_deletion: boolean = false;

        // merge similar adjacent nodes
        if (node instanceof Node) {
            if (node instanceof HTMLElement && previous_node instanceof HTMLElement) {
                if (COLOR_HELPERS.isColorElement(node) && COLOR_HELPERS.isColorElement(previous_node) && node.getAttribute('style') === previous_node.getAttribute('style')) {
                    // merge color elements with the same color
                    $(node).contents().appendTo(previous_node);

                    NODES_TO_DELETE.push(node);

                    current_node_marked_for_deletion = true;

                    mergeSimilarAdjacentChildNodes(previous_node);
                }
                else if (FORMAT_HELPERS.isFormatElement(node) && FORMAT_HELPERS.isFormatElement(previous_node) && node.tagName === previous_node.tagName) {
                    // merge format elements with the same tag
                    $(node).contents().appendTo(previous_node);

                    NODES_TO_DELETE.push(node);

                    current_node_marked_for_deletion = true;

                    mergeSimilarAdjacentChildNodes(previous_node);
                }
            }
            else if (node.nodeType === Node.TEXT_NODE && previous_node.nodeType === Node.TEXT_NODE && node.nodeValue !== null && previous_node.nodeValue !== null) {
                previous_node.nodeValue = previous_node.nodeValue + node.nodeValue;

                NODES_TO_DELETE.push(node);

                current_node_marked_for_deletion = true;
            }

            if (current_node_marked_for_deletion) {
                // skip to next node so the current node (marked for deletion) won't replace the previous node
                return;
            }
            else {
                previous_node = node;
            }
        }
    });

    // delete nodes marked for deletion
    if (NODES_TO_DELETE.length > 0) {
        $(NODES_TO_DELETE).each((_: number, node: Node[]) => {
            if (node instanceof Node) {
                $(node).remove();
            }
        });
    }

    // put fragment back into parent element
    RANGE.insertNode(FRAGMENT);
};

function deleteAllEmptyDescendants(parent: HTMLElement) {
    const RANGE: Range = document.createRange();
    RANGE.selectNodeContents(parent);

    const FRAGMENT: DocumentFragment = RANGE.extractContents();

    $(FRAGMENT).find('*').each((_: number, element: HTMLElement) => {
        if (element.innerHTML.length === 0) {
            $(element).remove();
        }
    });

    RANGE.insertNode(FRAGMENT);
};

function separateElementFromSpecificAncestor(element: HTMLElement, ancestor: HTMLElement) {
    if ((ancestor.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_CONTAINED_BY) === 0) {
        throw ReferenceError("The given element is not a descendant of the ancestor element");
    }

    const LEFT_SLICE: Range = document.createRange();
    LEFT_SLICE.setStartBefore(ancestor);
    LEFT_SLICE.setEndBefore(element);

    const MIDDLE_SLICE: Range = document.createRange();
    MIDDLE_SLICE.selectNode(element);

    const RIGHT_SLICE: Range = document.createRange();
    RIGHT_SLICE.setStartAfter(element);
    RIGHT_SLICE.setEndAfter(ancestor);

    const NEW_ANCESTOR: DocumentFragment = document.createDocumentFragment();
    NEW_ANCESTOR.appendChild(LEFT_SLICE.cloneContents());
    NEW_ANCESTOR.appendChild(MIDDLE_SLICE.extractContents());
    NEW_ANCESTOR.appendChild(RIGHT_SLICE.cloneContents());

    $(ancestor).replaceWith(NEW_ANCESTOR);
};

export {
    moveContentsTo,
    mergeSimilarAdjacentChildNodes,
    deleteAllEmptyDescendants,
    separateElementFromSpecificAncestor
};