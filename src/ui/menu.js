export function createMenu(doc, { chapters, settings, onNew, onChapter, onChange }) {
  const $ = (id) => doc.getElementById(id);
  const how = doc.querySelector("#start .how");
  const panels = [...doc.querySelectorAll("#start .panel")];
  const speedButtons = [...doc.querySelectorAll("#p-debug [data-speed]")];
  const toggles = { fly: $("d-fly"), skip: $("d-skip"), stats: $("d-stats") };
  let current = { ...settings };
  const cleanups = [];

  const listen = (target, type, handler) => {
    target.addEventListener(type, handler);
    cleanups.push(() => target.removeEventListener(type, handler));
  };

  const show = (panelId) => {
    panels.forEach((panel) => { panel.hidden = panel.id !== panelId; });
    $("menu").hidden = panelId !== null;
    how.hidden = panelId !== null;
  };

  const reflect = () => {
    speedButtons.forEach((button) => button.setAttribute("aria-pressed", String(Number(button.dataset.speed) === current.speed)));
    Object.entries(toggles).forEach(([key, button]) => button.setAttribute("aria-pressed", String(current[key])));
  };

  const change = (patch) => {
    current = { ...current, ...patch };
    reflect();
    onChange({ ...current });
  };

  $("chapters").replaceChildren(...chapters.map(([code, name], index) => {
    const item = doc.createElement("li");
    const button = doc.createElement("button");
    button.dataset.stage = code;
    button.textContent = `${index + 1} ${name}`;
    listen(button, "click", () => onChapter(code));
    item.append(button);
    return item;
  }));

  listen($("go"), "click", () => onNew());
  [["m-chapters", "p-chapters"], ["m-credits", "p-credits"], ["m-debug", "p-debug"]].forEach(([buttonId, panelId]) => {
    listen($(buttonId), "click", () => show(panelId));
  });
  doc.querySelectorAll("#start .back").forEach((button) => listen(button, "click", () => show(null)));
  listen(doc, "keydown", (event) => {
    if (event.code === "Escape") show(null);
  });
  speedButtons.forEach((button) => listen(button, "click", () => change({ speed: Number(button.dataset.speed) })));
  Object.entries(toggles).forEach(([key, button]) => listen(button, "click", () => change({ [key]: !current[key] })));

  reflect();
  return { dispose: () => cleanups.forEach((cleanup) => cleanup()) };
}
