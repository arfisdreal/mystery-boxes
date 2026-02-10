const MAX = 20;

const editorGrid = document.getElementById("editor-grid");
const hudGrid = document.getElementById("hud-grid");

const btnApply = document.getElementById("btn-apply");
const btnShuffle = document.getElementById("btn-shuffle");
const btnRandom = document.getElementById("btn-random");
const btnReset = document.getElementById("btn-reset");
const btnSave = document.getElementById("btn-save");
const btnLoad = document.getElementById("btn-load");
const btnClear = document.getElementById("btn-clear");

const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalClose = document.getElementById("modal-close");
const modalOk = document.getElementById("modal-ok");
const modalText = document.getElementById("modal-text");
const modalBadge = document.getElementById("modal-badge");
const flipInner = document.getElementById("flip-inner");

// STATE
// editorModel: ce que TU configures (type + texte), index fixe 0..19
const editorModel = Array.from({ length: MAX }, () => ({
  type: "BONUS", // BONUS | MALUS
  text: "",
}));

// deckModel: ce qui est dans les cases du HUD après "Appliquer" (+ shuffle)
// Chaque case du HUD a un contenu (ou disabled si vide)
// IMPORTANT: tu ne vois pas les contenus dans le HUD -> tu ne sais pas où est quoi.
let deckModel = Array.from({ length: MAX }, () => ({
  enabled: false,
  type: "BONUS",
  text: "",
}));

// opened state dans le HUD
let opened = Array.from({ length: MAX }, () => false);

// ----- UI BUILD: EDITOR -----
function buildEditor() {
  editorGrid.innerHTML = "";
  for (let i = 0; i < MAX; i++) {
    const row = document.createElement("div");
    row.className = "editor-row";

    const left = document.createElement("div");
    left.className = "slot";
    left.innerHTML = `<div class="idx">CASE ${i + 1}</div>`;

    const pill = document.createElement("div");
    pill.className = "pill";

    const b1 = document.createElement("button");
    b1.textContent = "BONUS";
    b1.className = "bonus";

    const b2 = document.createElement("button");
    b2.textContent = "MALUS";
    b2.className = "malus";

    function syncButtons() {
      b1.classList.toggle("active", editorModel[i].type === "BONUS");
      b1.classList.toggle("bonus", true);
      b2.classList.toggle("active", editorModel[i].type === "MALUS");
      b2.classList.toggle("malus", true);
    }

    b1.addEventListener("click", () => {
      editorModel[i].type = "BONUS";
      syncButtons();
    });
    b2.addEventListener("click", () => {
      editorModel[i].type = "MALUS";
      syncButtons();
    });

    pill.appendChild(b1);
    pill.appendChild(b2);
    left.appendChild(pill);

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 120;
    input.placeholder = "Texte (ex: +70M€ budget, vendre ton meilleur joueur...)";
    input.value = editorModel[i].text;

    input.addEventListener("input", (e) => {
      editorModel[i].text = e.target.value;
    });

    row.appendChild(left);
    row.appendChild(input);

    editorGrid.appendChild(row);
    syncButtons();
  }
}

// ----- HUD RENDER -----
function renderHud() {
  hudGrid.innerHTML = "";
  for (let i = 0; i < MAX; i++) {
    const card = document.createElement("div");
    const enabled = deckModel[i].enabled;
    const isOpened = opened[i];

    card.className = "card";
    if (!enabled) card.classList.add("disabled");
    else card.classList.add(deckModel[i].type === "BONUS" ? "bonus" : "malus");
    if (isOpened) card.classList.add("opened");

    card.innerHTML = `
      <div class="q">?</div>
      <div class="label">BOX ${i + 1}</div>
    `;

    card.addEventListener("click", () => {
      if (!enabled) return;
      if (opened[i]) return;
      openBox(i);
    });

    hudGrid.appendChild(card);
  }
}

function openModal({ type, text }) {
  modalBadge.textContent = type;
  modalBadge.classList.remove("bonus", "malus");
  modalBadge.classList.add(type === "BONUS" ? "bonus" : "malus");

  modalText.textContent = text;

  // reset flip state
  flipInner.classList.remove("flipped");
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  // petite "animation d'ouverture"
  setTimeout(() => {
    flipInner.classList.add("flipped");
  }, 160);
}

function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function openBox(i) {
  opened[i] = true;
  renderHud();
  const payload = deckModel[i];
  openModal(payload);
}

// ----- LOGIC -----
function applyEditorToDeckRandomized() {
  // Collecter les entrées remplies
  const filled = editorModel
    .filter((x) => (x.text || "").trim().length > 0)
    .map((x) => ({ enabled: true, type: x.type, text: x.text.trim() }));

  // Remplir le deck en “mélangeant” le contenu pour que tu ne saches pas où c’est.
  const shuffled = shuffleArray(filled);

  deckModel = Array.from({ length: MAX }, (_, idx) => {
    if (idx < shuffled.length) return shuffled[idx];
    return { enabled: false, type: "BONUS", text: "" }; // grise si non remplie
  });

  // Reset ouvertures
  opened = Array.from({ length: MAX }, () => false);
  renderHud();
}

function shuffleDeckInPlace() {
  // Shuffle uniquement les cases "enabled" (les gris restent gris)
  const enabledIdx = [];
  const enabledItems = [];
  for (let i = 0; i < MAX; i++) {
    if (deckModel[i].enabled) {
      enabledIdx.push(i);
      enabledItems.push(deckModel[i]);
    }
  }

  const shuffled = shuffleArray(enabledItems);

  enabledIdx.forEach((pos, k) => {
    deckModel[pos] = shuffled[k];
  });

  // Reset ouvertures (comme tu l’as demandé: "shuffle qui mélange toutes les cases")
  opened = Array.from({ length: MAX }, () => false);
  renderHud();
}

function resetOpenedOnly() {
  // Reset “toute la case à la base” = toutes redeviennent ouvrables (mais on garde le deck)
  opened = Array.from({ length: MAX }, () => false);
  renderHud();
}

function randomChoiceOpen() {
  // Choisir une case au hasard parmi celles qui sont enabled ET pas encore ouvertes
  const candidates = [];
  for (let i = 0; i < MAX; i++) {
    if (deckModel[i].enabled && !opened[i]) candidates.push(i);
  }
  if (candidates.length === 0) return;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  openBox(pick);
}

// ----- HELPERS -----
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ----- SAVE/LOAD -----
const STORAGE_KEY = "mystery_boxes_v1";

function saveToLocal() {
  const payload = { editorModel };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadFromLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    if (!data?.editorModel || !Array.isArray(data.editorModel)) return false;
    for (let i = 0; i < MAX; i++) {
      editorModel[i].type = data.editorModel[i]?.type === "MALUS" ? "MALUS" : "BONUS";
      editorModel[i].text = String(data.editorModel[i]?.text ?? "");
    }
    return true;
  } catch {
    return false;
  }
}

function clearAll() {
  for (let i = 0; i < MAX; i++) {
    editorModel[i].type = "BONUS";
    editorModel[i].text = "";
  }
  deckModel = Array.from({ length: MAX }, () => ({ enabled: false, type: "BONUS", text: "" }));
  opened = Array.from({ length: MAX }, () => false);
  renderHud();
  buildEditor();
}

// ----- EVENTS -----
btnApply.addEventListener("click", () => {
  applyEditorToDeckRandomized();
});

btnShuffle.addEventListener("click", () => {
  shuffleDeckInPlace();
});

btnRandom.addEventListener("click", () => {
  randomChoiceOpen();
});

btnReset.addEventListener("click", () => {
  resetOpenedOnly();
});

btnSave.addEventListener("click", () => {
  saveToLocal();
});

btnLoad.addEventListener("click", () => {
  const ok = loadFromLocal();
  buildEditor();
  if (ok) applyEditorToDeckRandomized();
});

btnClear.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  clearAll();
});

// Modal events
modalBackdrop.addEventListener("click", closeModal);
modalClose.addEventListener("click", closeModal);
modalOk.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// INIT
buildEditor();
renderHud();

// Optionnel: auto-load
if (loadFromLocal()) {
  buildEditor();
  applyEditorToDeckRandomized();
}
