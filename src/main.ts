import $ from 'jquery';



class RichTextEditor {
    TEXT_BOX: JQuery<HTMLDivElement>;

    constructor(textBoxId: string) {
        const ELEMENT: HTMLElement | null = document.getElementById(textBoxId);

        if (typeof textBoxId !== 'string' || ELEMENT === null || ELEMENT instanceof HTMLDivElement === false) {
            throw ReferenceError("Must be an id of a div");
        }

        this.TEXT_BOX = $(ELEMENT);

        // set text box attributes
        this.TEXT_BOX.prop('contenteditable', true);
        this.TEXT_BOX.prop('spellcheck', false);
    };
};

export default RichTextEditor;