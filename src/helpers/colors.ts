import $ from 'jquery';



function getClosestParentColorElement(childId: string): HTMLElement | undefined {
    let child: JQuery<HTMLElement> | HTMLElement | null = document.getElementById(childId);

    if (child !== null) {
        child = $(child);

        child = child.parents('span[data-type="color"]').first()[0];

        return child;
    }
    else {
        throw ReferenceError("There is no element with that id.");
    }
};

export {
    getClosestParentColorElement
};