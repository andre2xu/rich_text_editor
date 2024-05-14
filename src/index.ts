import RichTextEditor from './main';

window.addEventListener('load', () => {
    const RTE: RichTextEditor = new RichTextEditor('text-box');

    // COLOR PICKER
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
    }
});