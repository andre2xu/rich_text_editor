import $ from 'jquery';

import RichTextEditor, {RichTextEditorStyles, TextColor} from './main';

window.addEventListener('load', () => {
    const RTE: RichTextEditor = new RichTextEditor('text-box');


    // FONT FORMATS
    const FORMAT_BUTTONS: HTMLElement | null = document.getElementById('font-formats');

    if (FORMAT_BUTTONS instanceof HTMLElement) {
        FORMAT_BUTTONS.addEventListener('click', (event: MouseEvent) => {
            const ELEMENT_CLICKED: HTMLElement = event.target as HTMLElement;

            switch (ELEMENT_CLICKED.id) {
                case 'bold':
                    RTE.applyBold();
                    break;
                case 'italic':
                    RTE.applyItalic();
                    break;
                case 'underline':
                    RTE.applyUnderline();
                    break;
                case 'strikethrough':
                    RTE.applyStrikethrough();
                    break;
                default:
            }
        });
    }


    // COLOR PICKER
    let color_picker_is_visible: boolean = false;

    const COLOR_PICKER: HTMLElement | null = document.getElementById('color-picker');

    if (COLOR_PICKER !== null && COLOR_PICKER instanceof HTMLInputElement && COLOR_PICKER.type === 'color') {
        // detect & respond to color selection
        COLOR_PICKER.addEventListener('input', (event: Event) => {
            if (event.target !== null && event.target instanceof HTMLInputElement) {
                const HEX = event.target.value.substring(1); // ignore '#' at the start

                // convert the hex color code to RGB values
                const R: number = parseInt(HEX.substring(0, 2), 16);
                const G: number = parseInt(HEX.substring(2, 4), 16);
                const B: number = parseInt(HEX.substring(4, 6), 16);

                RTE.applyColor(R, G, B);
            }
        });

        COLOR_PICKER.addEventListener('mousedown', (event: Event) => {
            // prevent the text box from losing focus (i.e. the selection) when clicking on the color picker
            event.preventDefault();

            if (color_picker_is_visible) {
                // hide color picker
                COLOR_PICKER.type = 'text';
                COLOR_PICKER.type = 'color';
            }

            color_picker_is_visible ? color_picker_is_visible = false : color_picker_is_visible = true;
        });
    }


    // HELPERS
    function updateRTEToolWidgets(styles: RichTextEditorStyles) {
        const FORMATS_IN_SELECTION: Array<string> = styles.formats;
        const NUM_OF_FORMATS: number = FORMATS_IN_SELECTION.length;

        const BOLD_BUTTON: JQuery<HTMLElement> = $('#bold');
        const ITALIC_BUTTON: JQuery<HTMLElement> = $('#italic');
        const UNDERLINE_BUTTON: JQuery<HTMLElement> = $('#underline');
        const STRIKETHROUGH_BUTTON: JQuery<HTMLElement> = $('#strikethrough');

        // deselect all format buttons
        BOLD_BUTTON.removeClass('selected');
        ITALIC_BUTTON.removeClass('selected');
        UNDERLINE_BUTTON.removeClass('selected');
        STRIKETHROUGH_BUTTON.removeClass('selected');

        // select only the buttons of the formats present in the current text box selection
        for (let i=0; i < NUM_OF_FORMATS; i++) {
            switch (FORMATS_IN_SELECTION[i]) {
                case 'b':
                    BOLD_BUTTON.addClass('selected');
                    break;
                case 'i':
                    ITALIC_BUTTON.addClass('selected');
                    break;
                case 'u':
                    UNDERLINE_BUTTON.addClass('selected');
                    break;
                case 's':
                    STRIKETHROUGH_BUTTON.addClass('selected');
                    break;
            }
        }

        // change the color displayed by the color picker
        if (COLOR_PICKER instanceof HTMLInputElement) {
            let r: string = '00';
            let g: string = '00';
            let b: string = '00';

            if (styles.textColor !== undefined) {
                const RGB: TextColor = styles.textColor;

                r = RGB.r.toString(16);
                g = RGB.g.toString(16);
                b = RGB.b.toString(16);

                if (r.length === 1) {
                    r = `0${r}`;
                }

                if (g.length === 1) {
                    g = `0${g}`;
                }

                if (b.length === 1) {
                    b = `0${b}`;
                }
            }

            COLOR_PICKER.value = `#${r}${g}${b}`;
        }
    };


    // EVENT LISTENERS
    RTE.addEventListener('mouseup', (event) => {
        updateRTEToolWidgets(event.styles);
    });

    RTE.addEventListener('format', (event) => {
        
    });
});