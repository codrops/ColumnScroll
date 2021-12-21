import { calcWinsize, adjustedBoundingRect } from './utils';
import LocomotiveScroll from 'locomotive-scroll';
import { GridItem } from './gridItem';
import { ContentItem } from './contentItem';
import { gsap } from 'gsap';

// body element
const bodyEl = document.body;

// Calculate the viewport size
let winsize = calcWinsize();
window.addEventListener('resize', () => winsize = calcWinsize());

/**
 * Class representing a grid of items
 */
export class Grid {
    // DOM elements
    DOM = {
        // main element (.columns)
        el: null,
        // The .column elements (odd columns) that eill animate to the opposite scroll direction
        oddColumns: null,
        // .column__item
        gridItems: null,
        // .content
        content: document.querySelector('.content'),
        // .content__item
        contentItems: document.querySelectorAll('.content__item'),
        // .heading
        heading: {top: document.querySelector('.heading--up'), bottom: document.querySelector('.heading--down')},
        // .button-back button
        backCtrl: document.querySelector('.button-back'),
        // .content__nav
        contentNav: document.querySelector('.content__nav'),
        
        // For demo purposes only (proof of concept).
        // .content__nav-item
        contentNavItems: document.querySelectorAll('.content__nav-item'),

    };
    // GridItem instances array.
    gridItemArr = [];
    // Index of current GridItem.
    currentGridItem = -1;
    // Checks if in grid mode or if in content mode.
    isGridView = true;
    // Checks for active animation.
    isAnimating = false;
    // Scroll cached value
    lastscroll = 0;
    
    /**
     * Constructor.
     * @param {Element} DOM_el - the .columns element
     */
    constructor(DOM_el) {
        
        this.DOM.el = DOM_el;
        
        // first and third columns
        this.DOM.oddColumns = [...this.DOM.el.querySelectorAll('.column')].filter((_, index) => index != 1);
        // grid items (figure.column__item)
        this.DOM.gridItems = [...this.DOM.el.querySelectorAll('.column__item')];
        
        // Assign a ContentItem to each GridItem
        this.DOM.gridItems.forEach(gridItem => {
            const newItem =  new GridItem(gridItem);
            this.gridItemArr.push(newItem);
            // The ContentItem instance
            newItem.contentItem = new ContentItem(this.DOM.contentItems[newItem.position]);
        });
        
        // Initialize the Locomotive scroll
        this.initSmoothScroll();

        // Initialize the events on the page.
        this.initEvents();

        // Track which items are visible
        this.trackVisibleItems();
    }

    /**
     * Initialize the Locomotive scroll.
     */
    initSmoothScroll() {
        
        this.lscroll = new LocomotiveScroll({
            el: this.DOM.el,
            smooth: true,
            lerp: 0.13,
            smartphone: {smooth: true},
            tablet: {smooth: true}
        });

        // Locomotive scroll event: translate the first and third grid column -1*scrollValue px.
        this.lscroll.on('scroll', obj => {
            this.lastscroll = obj.scroll.y;
            this.DOM.oddColumns.forEach(column => column.style.transform = `translateY(${obj.scroll.y}px)`);
        });

    }

    /**
     * Initialize the events.
     */
    initEvents() {

        // For every GridItem
        for (const [position, gridItem] of this.gridItemArr.entries()) {

            // Open the gridItem and reveal its content
            gridItem.DOM.img.outer.addEventListener('click', () => {
                if ( !this.isGridView || this.isAnimating || document.documentElement.classList.contains('has-scroll-scrolling') ) {
                    return false;
                }
                this.isAnimating = true;
                this.isGridView = false;

                // Update currentGridItem
                this.currentGridItem = position;
                
                // Stop/Destroy the Locomotive scroll
                this.lscroll.destroy();

                this.showContent(gridItem);
            });
            
            // Hovering on the grid item's image outer.
            gridItem.DOM.img.outer.addEventListener('mouseenter', () => {
                if ( !this.isGridView || this.isAnimating ) {
                    return false;
                }
                gsap.killTweensOf([gridItem.DOM.img.outer, gridItem.DOM.img.inner]);
                gsap.timeline({
                    defaults: {duration: 1.4, ease: 'expo'},
                    onComplete: () => gsap.set([gridItem.DOM.img.outer, gridItem.DOM.img.inner], {willChange: ''})
                })
                .addLabel('start', 0)
                .set([gridItem.DOM.img.outer, gridItem.DOM.img.inner], { willChange: 'transform' }, 'start')
                .to(gridItem.DOM.img.outer, {scaleY: 0.95,scaleX: 0.88}, 'start')
                .to(gridItem.DOM.img.inner, {ease: 'power4', scaleY: 1.2, scaleX: 1.7}, 'start');
            });

            // Hovering out will reverse the scale values.
            gridItem.DOM.img.outer.addEventListener('mouseleave', () => {
                if ( !this.isGridView || this.isAnimating ) {
                    return false;
                }
                gsap.killTweensOf([gridItem.DOM.img.outer, gridItem.DOM.img.inner]);
                gsap.timeline({
                    defaults: {duration: 1.4, ease: 'expo'},
                    onComplete: () => gsap.set([gridItem.DOM.img.outer, gridItem.DOM.img.inner], { willChange: '' })
                })
                .addLabel('start', 0)
                .set([gridItem.DOM.img.outer, gridItem.DOM.img.inner], { willChange: 'transform' }, 'start')
                .to([gridItem.DOM.img.outer, gridItem.DOM.img.inner], {scale: 1}, 0);
            });
        }

        // Recalculate current image transform
        window.addEventListener('resize', () => {
            if ( this.isGridView ) {
                return false;
            }

            // Calculate the transform to apply to the current grid item image
            const imageTransform = this.calcTransformImage();
            gsap.set(this.gridItemArr[this.currentGridItem].DOM.img.outer, {
                scale: imageTransform.scale,
                x: imageTransform.x,
                y: imageTransform.y
            });

            // Adjust the transform value for all the other grid items that moved to the thumbnails area.
            for (const [position, viewportGridItem] of this.viewportGridItems.entries()) {
                const imgOuter = viewportGridItem.DOM.img.outer;    
                gsap.set(viewportGridItem.DOM.img.outer, {
                    scale: this.getFinalScaleValue(imgOuter),
                    x: this.getFinalTranslationValue(imgOuter, position).x,
                    y: this.getFinalTranslationValue(imgOuter, position).y
                });
            }
        });

        // Close the current item's content and reveal back the grid.
        this.DOM.backCtrl.addEventListener('click', () => {
            if ( this.isGridView || this.isAnimating ) {
                return false;
            }
            this.isAnimating = true;
            this.isGridView = true;

            // Restart the Locomotive scroll
            this.initSmoothScroll();
            this.lscroll.scrollTo(this.lastscroll, {duration: 0, disableLerp: true});

            this.closeContent();
        });

    }

    /**
     * Scale up the image and reveal its content.
     * @param {GridItem} gridItem - the gridItem element.
     */
    showContent(gridItem) {
        // All the other (that are inside the viewport)
        this.viewportGridItems = this.gridItemArr.filter(el => el != gridItem && el.DOM.el.classList.contains('in-view'));
        // Remaining (not in the viewport)
        this.remainingGridItems = this.gridItemArr.filter(el => !this.viewportGridItems.includes(el) && el != gridItem).map(gridItem => gridItem.DOM.el);

        // image outer elements
        this.viewportGridItemsImgOuter = this.viewportGridItems.map(gridItem => gridItem.DOM.img.outer);

        // Calculate the transform to apply to the gridItem's image .
        const imageTransform = this.calcTransformImage();

        gsap.killTweensOf([gridItem.DOM.img.outer, gridItem.DOM.img.inner]);
        this.timeline = gsap.timeline({
            defaults: {
                duration: 1.4, 
                ease: 'expo.inOut'
            },
            // overflow hidden
            onStart: () => bodyEl.classList.add('oh'),
            onComplete: () => {
                // Hide all other grid items from the grid.
                gsap.set(this.remainingGridItems, {opacity: 0});
                this.isAnimating = false;
            }
        })
        .addLabel('start', 0)
        .set([gridItem.DOM.el, gridItem.DOM.el.parentNode.parentNode], {
            zIndex: 100
        }, 'start')
        .set([gridItem.DOM.img.outer, gridItem.DOM.img.inner, this.viewportGridItemsImgOuter], {
            willChange: 'transform, opacity'
        }, 'start')
        .to(this.DOM.heading.top, {
            y: '-200%',
            scaleY: 4
        }, 'start')
        .to(this.DOM.heading.bottom, {
            y: '200%',
            scaleY: 4
        }, 'start+=0.05')
        .to(gridItem.DOM.img.outer, {
            scale: imageTransform.scale,
            x: imageTransform.x,
            y: imageTransform.y,
            onComplete: () => gsap.set(gridItem.DOM.img.outer, {willChange: ''})
        }, 'start')
        .to(gridItem.DOM.img.inner, {
            scale: 1,
            onComplete: () => gsap.set(gridItem.DOM.img.inner, {willChange: ''})
        }, 'start')
        

        .add(() => {
            gsap.set(this.DOM.contentNavItems, {
                y: `${gsap.utils.random(100,300)}%`, 
                opacity: 0
            });
        }, 'start');

        for (const [position, viewportGridItem] of this.viewportGridItems.entries()) {
            const imgOuter = viewportGridItem.DOM.img.outer;
            
            this.timeline
            .to([viewportGridItem.DOM.caption, gridItem.DOM.caption], {
                ease: 'expo',
                opacity: 0,
                delay: 0.03*position
            }, 'start')
            .to(viewportGridItem.DOM.img.outer, {
                scale: this.getFinalScaleValue(imgOuter),
                x: this.getFinalTranslationValue(imgOuter, position).x,
                y: this.getFinalTranslationValue(imgOuter, position).y,
                onComplete: () => gsap.set(imgOuter, {willChange: ''}),
                delay: 0.03*position
            }, 'start');
        }

        this.timeline
        .addLabel('showContent', 'start+=0.2')
        .to([...this.DOM.contentNavItems].slice(this.viewportGridItems.length+1), {
            y: '0%', 
            opacity: 1,
            delay: pos => 0.03*pos
        }, 'showContent')
        .add(() => {
            gridItem.contentItem.DOM.el.classList.add('content__item--current');
            bodyEl.classList.add('view-content');
        }, 'showContent')
        .to([this.DOM.backCtrl, this.DOM.contentNav, gridItem.contentItem.DOM.text], {
            opacity: 1
        }, 'showContent')
        .to(gridItem.contentItem.DOM.title, {
            opacity: 1,
            startAt: {
                y: '-100%',
                scaleY: 3
            },
            y: '0%',
            scaleY: 1
        }, 'showContent')
    }

    /**
     * Scale down the image and reveal the grid again.
     */
    closeContent() {
        // Current grid item
        const gridItem = this.gridItemArr[this.currentGridItem];
        
        gsap.timeline({
            defaults: {
                duration: 1.4, 
                ease: 'expo.inOut'
            },
            // overflow hidden
            onStart: () => {
                // Show all other grid items in the grid.
                gsap.set(this.remainingGridItems, {opacity: 1});

                bodyEl.classList.remove('oh');
            },
            onComplete: () => {
                this.isAnimating = false;
            }
        })
        .addLabel('start', 0)
        .to([this.DOM.backCtrl, this.DOM.contentNav, gridItem.contentItem.DOM.text], {
            opacity: 0
        }, 'start')
        .to(gridItem.contentItem.DOM.title, {
            opacity: 0,
            y: '-100%',
            scaleY: 3
        }, 'start')
        .to([...this.DOM.contentNavItems].slice(this.viewportGridItems.length+1), {
            y: `${gsap.utils.random(100,300)}%`,
            opacity: 0,
            delay: pos => -0.03*pos,
            onComplete: () => bodyEl.classList.remove('view-content')
        }, 'start')
        .add(() => gridItem.contentItem.DOM.el.classList.remove('content__item--current'))
        
        .set([gridItem.DOM.img.outer, this.viewportGridItemsImgOuter], {
            willChange: 'transform, opacity'
        }, 'start')
        .to(gridItem.DOM.img.outer, {
            scale: 1,
            x: 0,
            y: 0,
            onComplete: () => {
                gsap.set(gridItem.DOM.img.outer, {willChange: ''});
                gsap.set([gridItem.DOM.el, gridItem.DOM.el.parentNode.parentNode], {zIndex: 1});
            }
        }, 'start')
        .to(this.viewportGridItemsImgOuter, {
            scale: 1,
            x: 0,
            y: 0,
            stagger: pos => -0.03*pos,
            onComplete: () => {
                gsap.set(this.viewportGridItemsImgOuter, {willChange: ''});
            }
        }, 'start')

        
        .addLabel('showGrid', 'start+=0.2')
        .to([this.DOM.heading.top, this.DOM.heading.bottom], {
            y: '0%',
            scaleY: 1
        }, 'showGrid')
        .to([this.viewportGridItems.map(gridItem => gridItem.DOM.caption), gridItem.DOM.caption], {
            ease: 'power4.in',
            opacity: 1
        }, 'showGrid')
        
    }

    /**
     * Calculates the scale value to apply to the images that animate to the .content__nav area (scale down to the size of a nav area item).
     * @param {Element} gridItemImageOuter - the gridItem image outer element.
     * @return {Number} the scale value.
     */
    getFinalScaleValue(gridItemImageOuter) {
        return this.DOM.contentNavItems[0].offsetHeight / gridItemImageOuter.offsetHeight;
    }

    /**
     * Calculates the translate value to apply to the images that animate to the .content__nav area (position it on the nav area).
     * @param {Element} gridItemImageOuter - the gridItem image outer element.
     * @param {Number} position - the gridItem's position.
     * @return {JSON} the translation values.
     */
    getFinalTranslationValue(gridItemImageOuter, position) {
        const imgrect = adjustedBoundingRect(gridItemImageOuter);
        const navrect = adjustedBoundingRect(this.DOM.contentNavItems[position]);
        return {
            x: (navrect.left + navrect.width/2) - (imgrect.left + imgrect.width/2),
            y: (navrect.top + navrect.height/2) - (imgrect.top + imgrect.height/2)
        };
    }

    /**
     * Track which items are visible (inside the viewport)
     * by adding/removing the 'in-view' class when scrolling.
     * This will be used to animate only the ones that are visible.
     */
    trackVisibleItems() {
        
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.intersectionRatio > 0) {
                    entry.target.classList.add('in-view');
                } 
                else {
                    entry.target.classList.remove('in-view');
                }
            });
        });
        this.DOM.gridItems.forEach(item => observer.observe(item));

    }

    /**
     * Calculates the scale and translation values to apply to the images when we click on it (scale up and center it). 
     * Also used to recalculate those values on resize.
     * @return {JSON} the translation and scale values
     */
    calcTransformImage() {
        const imgrect = adjustedBoundingRect(this.gridItemArr[this.currentGridItem].DOM.img.outer);
        return {
            scale: winsize.height * 0.7 / imgrect.height,
            x: winsize.width * 0.5 - (imgrect.left + imgrect.width/2),
            y: winsize.height * 0.5 - (imgrect.top + imgrect.height/2)
        };
    }

}