/**
 * Class representing a grid of items
 */
 export class GridItem {
    // DOM elements
    DOM = {
        // main element (.column__item)
        el: null,
        // The image element
        img: {outer: null, inner: null},
        // The caption
        caption: null,

        // The GridItem's content item id.
        contentId: null,
        // The ContentItem instance
        contentItem: null
    };
    // Position on the grid.
    position = -1;
    
    /**
     * Constructor.
     * @param {Element} DOM_el - the .column__item element
     */
    constructor(DOM_el) {
        
        this.DOM.el = DOM_el;

        this.DOM.img.outer = this.DOM.el.querySelector('.column__item-imgwrap');
        this.DOM.img.inner = this.DOM.el.querySelector('.column__item-img');
        this.position = Number(this.DOM.img.outer.dataset.pos) - 1;
        this.DOM.caption = this.DOM.el.querySelector('figcaption');
    }
 }