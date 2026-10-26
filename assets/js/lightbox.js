// Full-screen photo viewer: arrow keys, Esc, swipe, and a shareable #photo-name in the URL.
import { aspect, captionNodes, srcset, stem, url } from "./data.js";

const ICONS = {
  close: '<path d="M4 4l12 12M16 4L4 16"/>',
  prev: '<path d="M12.5 4L6.5 10l6 6"/>',
  next: '<path d="M7.5 4l6 6-6 6"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true">${ICONS[name]}</svg>`;

const SWIPE_DISTANCE = 40;

export class Lightbox {
  /**
   * @param {object[]} photos  the photos this viewer steps through
   * @param {(index: number) => HTMLElement} getTrigger  element to return focus to on close
   */
  constructor(photos, getTrigger) {
    this.photos = photos;
    this.getTrigger = getTrigger;
    this.index = 0;

    const dialog = document.createElement("dialog");
    dialog.className = "lightbox";
    dialog.setAttribute("aria-label", "Photo viewer");
    dialog.innerHTML = `
      <div class="lightbox-bar">
        <span class="lightbox-count" aria-live="polite"></span>
        <button class="icon-button close" type="button" aria-label="Close">${icon("close")}</button>
      </div>
      <div class="lightbox-stage">
        <img class="lightbox-img" alt="" decoding="async">
        <p class="lightbox-caption"></p>
      </div>
      <div class="lightbox-controls">
        <button class="icon-button prev" type="button" aria-label="Previous photo">${icon("prev")}</button>
        <button class="icon-button next" type="button" aria-label="Next photo">${icon("next")}</button>
      </div>`;
    document.body.append(dialog);

    this.dialog = dialog;
    this.stage = dialog.querySelector(".lightbox-stage");
    this.img = dialog.querySelector(".lightbox-img");
    this.caption = dialog.querySelector(".lightbox-caption");
    this.count = dialog.querySelector(".lightbox-count");

    dialog.querySelector(".close").addEventListener("click", () => dialog.close());
    dialog.querySelector(".prev").addEventListener("click", () => this.step(-1));
    dialog.querySelector(".next").addEventListener("click", () => this.step(1));
    dialog.addEventListener("keydown", (e) => this.onKey(e));
    dialog.addEventListener("close", () => this.onClose());
    // Tapping the empty area around the photo closes the viewer.
    this.stage.addEventListener("click", (e) => e.target === this.stage && dialog.close());
    this.addSwipe();
    window.addEventListener("resize", () => dialog.open && this.fit());

    if (photos.length < 2) dialog.querySelector(".lightbox-controls").hidden = true;
  }

  open(index) {
    document.documentElement.classList.add("lightbox-open");
    this.dialog.showModal();
    this.show(index);
  }

  openFromHash() {
    const name = decodeURIComponent(location.hash.slice(1));
    const index = this.photos.findIndex((p) => stem(p.file) === name);
    if (index >= 0) this.open(index);
  }

  step(delta) {
    const n = this.photos.length;
    this.show((this.index + delta + n) % n);
  }

  show(index) {
    this.index = index;
    const photo = this.photos[index];
    this.count.textContent = `${index + 1} / ${this.photos.length}`;
    this.caption.replaceChildren(...captionNodes(photo));

    const img = this.img;
    img.removeAttribute("srcset");
    img.removeAttribute("src");
    img.alt = photo.alt || "";
    this.fit();
    img.srcset = srcset(photo);
    img.src = url(photo, 1600);

    history.replaceState(null, "", `#${encodeURIComponent(stem(photo.file))}`);
    this.preload(index + 1);
    this.preload(index - 1);
  }

  // Size the image to fit the space left after the caption, keeping its shape.
  fit() {
    const photo = this.photos[this.index];
    const style = getComputedStyle(this.stage);
    const w = this.stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const caption = getComputedStyle(this.caption);
    const h =
      this.stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) -
      this.caption.offsetHeight - parseFloat(caption.marginTop) - parseFloat(caption.marginBottom);
    const ratio = aspect(photo);
    const width = Math.max(1, Math.min(w, h * ratio));
    this.img.style.width = `${Math.round(width)}px`;
    this.img.style.height = `${Math.round(width / ratio)}px`;
    this.img.sizes = `${Math.round(width)}px`;
  }

  preload(index) {
    const photo = this.photos[(index + this.photos.length) % this.photos.length];
    const img = new Image();
    img.sizes = this.img.sizes;
    img.srcset = srcset(photo);
  }

  onKey(e) {
    if (e.key === "ArrowRight") this.step(1);
    else if (e.key === "ArrowLeft") this.step(-1);
    else return;
    e.preventDefault();
  }

  onClose() {
    document.documentElement.classList.remove("lightbox-open");
    history.replaceState(null, "", location.pathname + location.search);
    const trigger = this.getTrigger(this.index);
    if (trigger) {
      trigger.focus({ preventScroll: true });
      trigger.scrollIntoView({ block: "nearest" });
    }
  }

  addSwipe() {
    let start = null;
    this.dialog.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" && e.isPrimary) start = { x: e.clientX, y: e.clientY };
    });
    this.dialog.addEventListener("pointercancel", () => (start = null));
    this.dialog.addEventListener("pointerup", (e) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      if (window.visualViewport && window.visualViewport.scale > 1.01) return; // user is zoomed in
      if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) {
        this.step(dx < 0 ? 1 : -1);
      } else if (dy > SWIPE_DISTANCE * 2 && Math.abs(dy) > Math.abs(dx) * 1.5) {
        this.dialog.close(); // swipe down to dismiss
      }
    });
  }
}
