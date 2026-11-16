import { HINT_HOLD } from "../config.js";

export function createOverlay(doc, scheduler) {
  const $ = (id) => doc.getElementById(id);
  const white = $("white");
  const hintEl = $("hint");
  let hintTimer = null;

  const cancelHintTimer = () => {
    if (hintTimer !== null) scheduler.cancel(hintTimer);
    hintTimer = null;
  };

  return {
    curtainOn: () => white.classList.remove("off"),
    curtainOff: () => white.classList.add("off"),
    setText(yearsLine, sub) {
      $("yrs").textContent = yearsLine;
      $("sub").textContent = sub;
    },
    textOn: () => white.classList.add("txt"),
    textOff: () => white.classList.remove("txt"),
    hint(text) {
      cancelHintTimer();
      hintEl.textContent = text;
      hintEl.classList.add("on");
      hintTimer = scheduler.after(HINT_HOLD, () => {
        hintTimer = null;
        hintEl.classList.remove("on");
      });
    },
    hintOn() {
      cancelHintTimer();
      hintEl.classList.add("on");
    },
    hintOff() {
      cancelHintTimer();
      hintEl.classList.remove("on");
    },
    hideStart() {
      $("start").style.display = "none";
    },
    showEnd(html) {
      const end = $("end");
      $("endtxt").innerHTML = html;
      end.style.display = "flex";
      doc.defaultView.requestAnimationFrame(() => {
        end.style.opacity = 1;
      });
    },
    beamGlow(opacity) {
      $("bfx").style.opacity = opacity;
    },
    onAgain: (fn) => $("again").addEventListener("click", fn),
  };
}
