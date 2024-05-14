import $ from 'jquery';
import * as COLOR_HELPERS from './colors';



function mergeSimilarAdjacentChildNodes(parent: HTMLElement) {
    const RANGE: Range = document.createRange();
    RANGE.selectNodeContents(parent);

    const FRAGMENT: DocumentFragment = RANGE.extractContents();

    // perform merging
    let previous_node: Node;

    $(FRAGMENT).contents().each((_: number, node: Document | DocumentFragment | Text | Comment) => {
        if (previous_node === undefined) {
            previous_node = node;

            return; // skip first node
        }

        // merge similar adjacent nodes
        if (node instanceof Node) {
            if (node instanceof HTMLElement && previous_node instanceof HTMLElement) {
                if (COLOR_HELPERS.isColorElement(node) && COLOR_HELPERS.isColorElement(previous_node) && node.getAttribute('style') === previous_node.getAttribute('style')) {
                    // merge color elements with the same color

                    const NODE_AFTER: JQuery<HTMLElement> = $(node);

                    NODE_AFTER.contents().appendTo(previous_node);
                    NODE_AFTER.remove();
                }
            }
            else if (node.nodeType === Node.TEXT_NODE && previous_node.nodeType === Node.TEXT_NODE && node.nodeValue !== null && previous_node.nodeValue !== null) {
                previous_node.nodeValue = previous_node.nodeValue + node.nodeValue;

                $(node).remove();
            }

            previous_node = node;
        }
    });

    // put fragment back into parent element
    RANGE.insertNode(FRAGMENT);
};

export {
    mergeSimilarAdjacentChildNodes
};