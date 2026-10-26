// Renders the photo grids (home, series), the series index and the About portrait from photos.json.
import { captionNodes, createImage, loadData, url } from "./data.js";
import { Lightbox } from "./lightbox.js";

// Approximate rendered width of a grid photo, so phones pick the 800px file.
const GRID_SIZES = "(min-width: 64em) 40vw, (min-width: 40em) 50vw, calc(100vw - 2.5rem)";

const root = document.querySelector("[data-gallery]");
const portrait = document.querySelector("[data-portrait]");

if (root || portrait) {
  loadData().then(render, (error) => {
    console.error(error);
    const target = root || portrait;
    target.innerHTML =
      '<p class="grid-status">The photos could not be loaded. If you opened this file directly, ' +
      "start a local server instead (see README.md).</p>";
  });
}

function render(data) {
  if (portrait) renderPortrait(portrait, data.portrait);
  if (!root) return;

  if (root.dataset.gallery === "featured") {
    renderGrid(root, data.photos.filter((p) => p.featured));
    return;
  }

  const slug = new URLSearchParams(location.search).get("s");
  const series = data.series.find((s) => s.slug === slug);
  if (series) renderSeries(root, data, series);
  else renderSeriesIndex(root, data);
}

function renderGrid(container, photos) {
  const list = document.createElement("ul");
  list.className = "grid";
  const links = photos.map((photo, i) => {
    const item = document.createElement("li");
    item.className = "tile";
    item.style.setProperty("--ar", (photo.width / photo.height) || 1.5);

    const figure = document.createElement("figure");
    const link = document.createElement("a");
    link.href = url(photo, 2400); // works without JavaScript too
    link.dataset.index = i;
    link.append(createImage(photo, { sizes: GRID_SIZES, eager: i < 2 }));

    const caption = document.createElement("figcaption");
    caption.className = "caption";
    caption.append(...captionNodes(photo));

    figure.append(link, caption);
    item.append(figure);
    list.append(item);
    return link;
  });

  container.replaceChildren(list);
  if (!photos.length) {
    container.innerHTML = '<p class="grid-status">No photos here yet.</p>';
    return;
  }

  const lightbox = new Lightbox(photos, (i) => links[i]);
  list.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-index]");
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    lightbox.open(Number(link.dataset.index));
  });
  if (location.hash) lightbox.openFromHash();
}

function renderSeries(container, data, series) {
  const photos = data.photos.filter((p) => p.series === series.slug);
  document.title = `${series.title} — ${document.title}`;

  const intro = document.createElement("header");
  intro.className = "intro";
  intro.innerHTML = `
    <span class="eyebrow"><a href="series.html">Series</a></span>
    <h1></h1>
    <p class="lead"></p>
    <p class="meta"></p>`;
  intro.querySelector("h1").textContent = series.title;
  intro.querySelector(".lead").textContent = series.description || "";
  intro.querySelector(".meta").textContent = `${photos.length} photograph${photos.length === 1 ? "" : "s"}`;

  const grid = document.createElement("div");
  renderGrid(grid, photos);

  container.replaceChildren(intro, grid, seriesNav(data.series, series));
}

function seriesNav(all, current) {
  const i = all.indexOf(current);
  const nav = document.createElement("nav");
  nav.className = "series-nav";
  nav.setAttribute("aria-label", "More series");
  const link = (s, cls, label) => {
    const a = document.createElement("a");
    a.className = cls;
    a.href = `series.html?s=${encodeURIComponent(s.slug)}`;
    a.textContent = label;
    return a;
  };
  if (i > 0) nav.append(link(all[i - 1], "prev", `← ${all[i - 1].title}`));
  if (i < all.length - 1) nav.append(link(all[i + 1], "next", `${all[i + 1].title} →`));
  return nav;
}

function renderSeriesIndex(container, data) {
  const intro = document.createElement("header");
  intro.className = "intro";
  intro.innerHTML = "<h1>Series</h1>";

  const list = document.createElement("ul");
  list.className = "series-grid";
  for (const series of data.series) {
    const photos = data.photos.filter((p) => p.series === series.slug);
    const cover = photos.find((p) => p.file === series.cover) || photos[0];

    const item = document.createElement("li");
    const link = document.createElement("a");
    link.className = "series-card";
    link.href = `series.html?s=${encodeURIComponent(series.slug)}`;
    if (cover) {
      const img = createImage(cover, {
        sizes: "(min-width: 64em) 30vw, (min-width: 40em) 45vw, calc(100vw - 2.5rem)",
        className: "series-cover",
      });
      img.alt = ""; // decorative here: the series title is the link text
      link.append(img);
    }
    const label = document.createElement("span");
    label.className = "series-label";
    const h2 = document.createElement("h2");
    h2.textContent = series.title;
    const meta = document.createElement("span");
    meta.className = "series-count";
    meta.textContent = `${photos.length} photograph${photos.length === 1 ? "" : "s"}`;
    label.append(h2, meta);
    link.append(label);
    item.append(link);
    list.append(item);
  }
  container.replaceChildren(intro, list);
}

function renderPortrait(figure, photo) {
  if (!photo) return;
  const img = createImage(photo, { sizes: "(min-width: 52em) 26rem, calc(100vw - 2.5rem)", eager: true, className: "" });
  figure.replaceChildren(img);
}
