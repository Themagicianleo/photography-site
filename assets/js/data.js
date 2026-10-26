// Loading photos.json and turning a photo entry into a responsive <img>.

export const WIDTHS = [800, 1600, 2400]; // must match tools/build_images.py

let request;

export function loadData() {
  request ??= fetch("photos.json").then((res) => {
    if (!res.ok) throw new Error(`photos.json: HTTP ${res.status}`);
    return res.json();
  });
  return request;
}

export const stem = (file) => file.replace(/\.[^.]+$/, "");

export const url = (photo, width) => `images/${stem(photo.file)}-${width}.webp`;

export function aspect(photo) {
  if (photo.width && photo.height) return photo.width / photo.height;
  console.warn(`${photo.file}: no width/height in photos.json — run tools/build_images.py`);
  return 3 / 2;
}

// Files are never upscaled, so a small original yields smaller (or duplicate) sizes.
export function srcset(photo) {
  const seen = new Set();
  return WIDTHS.map((w) => [w, Math.min(w, photo.width || w)])
    .filter(([, actual]) => !seen.has(actual) && seen.add(actual))
    .map(([w, actual]) => `${url(photo, w)} ${actual}w`)
    .join(", ");
}

export function settingsText(camera = {}) {
  return ["focalLength", "aperture", "shutter", "iso"]
    .map((key) => camera[key])
    .filter(Boolean)
    .join(" · ");
}

export function createImage(photo, { sizes, eager = false, className = "photo" } = {}) {
  const img = document.createElement("img");
  img.className = className;
  img.alt = photo.alt || "";
  if (photo.width && photo.height) {
    img.width = photo.width;
    img.height = photo.height;
  }
  img.style.setProperty("--ar", aspect(photo));
  img.decoding = "async";
  img.loading = eager ? "eager" : "lazy";
  if (eager) img.fetchPriority = "high";
  img.sizes = sizes;
  img.srcset = srcset(photo);
  img.src = url(photo, 800);
  // Fade in once decoded (instant when reduced motion is on, see style.css).
  const loaded = () => img.classList.add("is-loaded");
  if (img.complete && img.naturalWidth) loaded();
  else {
    img.addEventListener("load", loaded, { once: true });
    img.addEventListener("error", loaded, { once: true });
  }
  return img;
}

export function captionNodes(photo, tag = "span") {
  const title = document.createElement(tag);
  title.className = "title";
  title.textContent = photo.title || "";
  const settings = document.createElement(tag);
  settings.className = "settings";
  settings.textContent = settingsText(photo.camera);
  return [title, settings];
}
