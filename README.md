# Photography portfolio

A minimal black-and-white portfolio in plain HTML, CSS and JavaScript. There is no build step for the site itself, and every photo is described in `photos.json`.

```
index.html  series.html  about.html  contact.html
photos.json            all photo data: edit this to add, remove or reorder photos
assets/css/style.css   the whole design (colour tokens and type scale are at the top)
assets/js/             site.js (theme toggle) · data.js · gallery.js · lightbox.js
images/                web-ready WebP files, generated (do not edit by hand)
originals/             your full-size masters: never modified, never published
tools/                 build_images.py · read_exif.py · make_placeholders.py
```

## Preview locally

The pages load `photos.json` with `fetch`, which browsers block on `file://`, so serve the folder over HTTP:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. To check it on your phone, connect the phone to the same Wi-Fi and open `http://<your-computer's-IP>:8000`.

## Fill in the placeholders

Anything in `[square brackets]` is a placeholder: your name, the home sentence, bio, gear, email, Instagram handle, series descriptions, and photo titles and alt text. To find all of them, run:

```sh
grep -rn "\[" --include=*.html --include=photos.json .
```

## Adding photos

1. Install Pillow once: `python3 -m pip install Pillow`
2. Put the full-size file in `originals/`, for example `originals/void-deck.jpg`.
3. Add an entry to `photos.json`:

   ```json
   {
     "file": "void-deck.jpg",
     "title": "Void deck, Toa Payoh",
     "series": "overlooked-singapore",
     "alt": "An empty void deck at dawn, a single chair facing a pillar",
     "featured": true,
     "camera": { "focalLength": "", "aperture": "", "shutter": "", "iso": "" }
   }
   ```

   - `series` must match a `slug` in the `series` list at the top of the file. To add a series, add `{ "slug", "title", "description" }` there. You can also add `"cover": "file.jpg"` to choose its thumbnail.
   - `featured: true` puts the photo on the home page.
   - The order in the file is the order on the site.
4. Build the web versions. This also records each photo's width and height in `photos.json`:

   ```sh
   python3 tools/build_images.py          # add --force to rebuild everything
   ```
5. Fill in the camera settings from EXIF:

   ```sh
   python3 tools/read_exif.py             # preview only
   python3 tools/read_exif.py --write     # fill empty fields (add --overwrite to replace existing ones)
   ```

`build_images.py` writes `images/<name>-800.webp`, `-1600.webp` and `-2400.webp`. It never upscales, and it leaves out EXIF, so GPS locations are not published. Neither script writes to `originals/`.

The `placeholder-*.jpg` files in `originals/` are grey test images made by `tools/make_placeholders.py`. When your real photos are in, delete them from `originals/` and `images/` and remove their entries from `photos.json`. Also replace `originals/portrait.jpg`; it is the About page portrait (the `portrait` entry in `photos.json`).

## Publishing for free

`originals/` is listed in `.gitignore`, so your full-resolution files are never uploaded. Only `images/` is published.

### GitHub Pages

1. Create a new **public** repository on GitHub, for example `portfolio`, without a README.
2. In this folder, run:
   ```sh
   git remote add origin https://github.com/<your-username>/portfolio.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then **main** and **/ (root)**, and click **Save**.
4. After a minute or two the site is live at `https://<your-username>.github.io/portfolio/`. Name the repository `<your-username>.github.io` instead if you want the shorter address.

### Cloudflare Pages

1. Push the repository to GitHub (steps 1 and 2 above). It can be private.
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and pick the repository.
3. Set the framework preset to **None**, leave the build command empty and set the output directory to `/`. Then deploy.
4. The site is live at `https://<project>.pages.dev`. Every `git push` redeploys it.

Both services let you add your own domain later in their settings.

## Updating the site

```sh
python3 tools/build_images.py && python3 tools/read_exif.py --write
git add -A && git commit -m "Add new photos" && git push
```
