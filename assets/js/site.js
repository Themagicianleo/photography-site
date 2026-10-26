// Light/dark toggle. With no saved choice the site follows the system setting.
const root = document.documentElement;
const systemDark = matchMedia("(prefers-color-scheme: dark)");
const button = document.querySelector(".theme-toggle");
const themeColor = document.querySelector('meta[name="theme-color"]');

const current = () => root.dataset.theme || (systemDark.matches ? "dark" : "light");

function sync() {
  const next = current() === "dark" ? "light" : "dark";
  button?.setAttribute("aria-label", `Switch to ${next} theme`);
  themeColor?.setAttribute("content", current() === "dark" ? "#0d0d0d" : "#ffffff");
}

button?.addEventListener("click", () => {
  const next = current() === "dark" ? "light" : "dark";
  const system = systemDark.matches ? "dark" : "light";
  try {
    // Choosing the same theme as the system means "follow the system" again.
    if (next === system) {
      delete root.dataset.theme;
      localStorage.removeItem("theme");
    } else {
      root.dataset.theme = next;
      localStorage.setItem("theme", next);
    }
  } catch {
    root.dataset.theme = next;
  }
  sync();
});

systemDark.addEventListener("change", sync);
sync();

for (const el of document.querySelectorAll("[data-year]")) el.textContent = new Date().getFullYear();
