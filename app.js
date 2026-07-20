const STORAGE_KEY = "brainstorm-canvas-v1";
const MIN_CARD_WIDTH = 140;
const MIN_CARD_HEIGHT = 92;
const MAX_NOTE_CARD_WIDTH = 270;
const MAX_LABEL_CARD_WIDTH = 500;
const MAX_RESIZED_NOTE_WIDTH = 960;
const MAX_RESIZED_NOTE_HEIGHT = 720;
const MAX_NOTE_FONT_SCALE = 4;
const MIN_NOTE_FONT_SCALE = 0.75;
const SIZE_TOOL_SENSITIVITY = 0.0034;
const FIT_CARD_MIN_WIDTH = MIN_CARD_WIDTH;
const FIT_CARD_MIN_HEIGHT = MIN_CARD_HEIGHT;
const LABEL_CARD_MIN_WIDTH = 120;
const LABEL_CARD_MIN_HEIGHT = 64;
const CARD_TEXT_INSET_X = 16;
const CARD_TEXT_INSET_Y = 15;
const ZOOM_LIMITS = { min: 0.35, max: 2.8 };
const CARD_GAP = 18;
const EXPORT_PADDING = 44;
const DEFAULT_BACKGROUND_COLOR = "#d7d7d7";
const NOTE_CARD_INK = "#000000";
const MIN_BLACK_TEXT_CONTRAST = 8;
const DEFAULT_DARK_INK = "#231423";
const DEFAULT_LIGHT_INK = "#fbf2f4";
const LABEL_CARD_FILL = DEFAULT_DARK_INK;
const LABEL_CARD_INK = DEFAULT_LIGHT_INK;
const RAW_PALETTE = [
  { name: "Swatch 01", fill: "#94bb48" },
  { name: "Swatch 02", fill: "#b8b75a" },
  { name: "Swatch 03", fill: "#ff8ceb" },
  { name: "Swatch 04", fill: "#a7b927" },
  { name: "Swatch 05", fill: "#ff8a00" },
  { name: "Swatch 06", fill: "#75a8e9" },
  { name: "Swatch 07", fill: "#ff8d75" },
  { name: "Swatch 08", fill: "#f8c6d1" },
  { name: "Swatch 09", fill: "#bee8ff" },
  { name: "Swatch 10", fill: "#d69a16" },
  { name: "Swatch 11", fill: "#dde6b7" },
  { name: "Swatch 12", fill: "#f8b77d" },
  { name: "Swatch 13", fill: "#f8d59b" },
  { name: "Swatch 14", fill: "#f7a724" },
  { name: "Swatch 16", fill: "#d796ff" },
  { name: "Swatch 18", fill: "#fbef1f" },
  { name: "Swatch 19", fill: "#c3eb00" },
  { name: "Swatch 21", fill: "#76bce0" },
  { name: "Swatch 22", fill: "#b6c08e" },
  { name: "Swatch 23", fill: "#00be2e" },
  { name: "Swatch 24", fill: "#e780dc" },
  { name: "Swatch 25", fill: "#d84847" }
];
const PALETTE = RAW_PALETTE.map((swatch) => ({
  ...swatch,
  ink: getReadableInk(swatch.fill)
}));
const DISPLAY_PALETTE = PALETTE;
const TOOL_HINTS = {
  default: "",
  bucket: "",
  brush: "",
  label: "",
  size: "",
  delete: ""
};

const dom = {
  chrome: document.getElementById("chrome"),
  viewport: document.getElementById("viewport"),
  scene: document.getElementById("scene"),
  cardsLayer: document.getElementById("cardsLayer"),
  draftRect: document.getElementById("draftRect"),
  connectionsLayer: document.getElementById("connectionsLayer"),
  overlayLayer: document.getElementById("overlayLayer"),
  palette: document.getElementById("palette"),
  swatchToggle: document.getElementById("swatchToggle"),
  resetModal: document.getElementById("resetModal"),
  resetConfirmButton: document.getElementById("resetConfirmButton"),
  resetCancelButton: document.getElementById("resetCancelButton"),
  deleteModal: document.getElementById("deleteModal"),
  deleteConfirmButton: document.getElementById("deleteConfirmButton"),
  deleteCancelButton: document.getElementById("deleteCancelButton"),
  saveBoard: document.getElementById("saveBoard"),
  importBoard: document.getElementById("importBoard"),
  infoButton: document.getElementById("infoButton"),
  infoModal: document.getElementById("infoModal"),
  infoCloseButton: document.getElementById("infoCloseButton"),
  centerView: document.getElementById("centerView"),
  fullscreenButton: document.getElementById("fullscreenButton"),
  saveModal: document.getElementById("saveModal"),
  saveImageButton: document.getElementById("saveImageButton"),
  saveTextButton: document.getElementById("saveTextButton"),
  saveCodeButton: document.getElementById("saveCodeButton"),
  saveCancelButton: document.getElementById("saveCancelButton"),
  boardTitleInput: document.getElementById("boardTitleInput"),
  labelModal: document.getElementById("labelModal"),
  labelForm: document.getElementById("labelForm"),
  labelInput: document.getElementById("labelInput"),
  importFileInput: document.getElementById("importFileInput"),
  toast: document.getElementById("toast"),
  toastMessage: document.getElementById("toastMessage"),
  toastAction: document.getElementById("toastAction"),
  toolHint: document.getElementById("toolHint"),
  resetView: document.getElementById("resetView"),
  titleButton: document.getElementById("titleButton"),
  titleModal: document.getElementById("titleModal"),
  titleForm: document.getElementById("titleForm"),
  titleInput: document.getElementById("titleInput"),
  titleCancelButton: document.getElementById("titleCancelButton"),
  textToolbar: document.getElementById("textToolbar"),
  textToolbarHint: document.getElementById("textToolbarHint"),
  editTextButton: document.getElementById("editTextButton"),
  decreaseTextButton: document.getElementById("decreaseTextButton"),
  increaseTextButton: document.getElementById("increaseTextButton"),
  resetTextButton: document.getElementById("resetTextButton"),
  boldTextButton: document.getElementById("boldTextButton"),
  italicTextButton: document.getElementById("italicTextButton"),
  underlineTextButton: document.getElementById("underlineTextButton"),
  alignLeftButton: document.getElementById("alignLeftButton"),
  alignCenterButton: document.getElementById("alignCenterButton"),
  alignRightButton: document.getElementById("alignRightButton"),
  toolButtons: Array.from(document.querySelectorAll("[data-tool]"))
};

const uiState = {
  selectedCardId: null,
  activeColor: PALETTE[0].fill,
  paletteVisible: false,
  currentTool: "default",
  pendingLabelRootId: null,
  pendingDeleteCardId: null,
  pendingFocusCardId: null,
  labelModalPrimed: false
};

const interaction = {
  activeTouches: new Map(),
  mode: null,
  primaryPointerId: null,
  draft: null,
  pan: null,
  drag: null,
  resize: null,
  scale: null,
  brush: null,
  gesture: null
};

const cardElements = new Map();
let state = loadState();
let renderQueued = false;
let saveTimer = 0;
let isSpacePressed = false;
let pendingGlobalCardRefit = true;
let toastTimer = 0;
let undoSnapshot = null;

boot();

function boot() {
  renderPalette();
  bindEvents();
  applyToolState();
  syncFullscreenButton();
  syncPaletteVisibility();
  requestRender();
}

function bindEvents() {
  dom.viewport.addEventListener("pointerdown", handlePointerDown);
  dom.viewport.addEventListener("pointermove", handlePointerMove);
  dom.viewport.addEventListener("pointerup", handlePointerUp);
  dom.viewport.addEventListener("pointercancel", handlePointerCancel);
  dom.viewport.addEventListener("wheel", handleWheel, { passive: false });

  dom.palette.addEventListener("click", handlePaletteClick);
  dom.swatchToggle.addEventListener("click", togglePaletteVisibility);
  dom.toolButtons.forEach((button) => {
    button.addEventListener("click", () => toggleTool(button.dataset.tool));
  });
  dom.saveBoard.addEventListener("click", openSaveModal);
  dom.importBoard.addEventListener("click", handleImportButtonClick);
  dom.infoButton.addEventListener("click", openInfoModal);
  dom.infoCloseButton.addEventListener("click", closeInfoModal);
  dom.infoModal.addEventListener("click", handleInfoModalClick);
  dom.centerView.addEventListener("click", centerBoardView);
  dom.fullscreenButton.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", syncFullscreenButton);
  dom.resetView.addEventListener("click", openResetModal);
  dom.titleButton.addEventListener("click", openTitleModal);
  dom.titleForm.addEventListener("submit", handleTitleSubmit);
  dom.titleCancelButton.addEventListener("click", closeTitleModal);
  dom.titleModal.addEventListener("click", handleTitleModalClick);
  dom.editTextButton.addEventListener("click", editSelectedCardText);
  dom.decreaseTextButton.addEventListener("click", () => adjustSelectedTextScale(0.88));
  dom.increaseTextButton.addEventListener("click", () => adjustSelectedTextScale(1.14));
  dom.resetTextButton.addEventListener("click", resetSelectedTextScale);
  dom.boldTextButton.addEventListener("click", () => toggleSelectedTextFormat("fontWeight", "700", "400"));
  dom.italicTextButton.addEventListener("click", () => toggleSelectedTextFormat("fontStyle", "italic", "normal"));
  dom.underlineTextButton.addEventListener("click", () => toggleSelectedTextFormat("textDecoration", "underline", "none"));
  dom.alignLeftButton.addEventListener("click", () => setSelectedTextAlignment("left"));
  dom.alignCenterButton.addEventListener("click", () => setSelectedTextAlignment("center"));
  dom.alignRightButton.addEventListener("click", () => setSelectedTextAlignment("right"));
  dom.resetConfirmButton.addEventListener("click", wipeBoard);
  dom.resetCancelButton.addEventListener("click", closeResetModal);
  dom.resetModal.addEventListener("click", handleResetModalClick);
  dom.deleteConfirmButton.addEventListener("click", confirmDeletePendingCard);
  dom.deleteCancelButton.addEventListener("click", closeDeleteModal);
  dom.deleteModal.addEventListener("click", handleDeleteModalClick);
  dom.saveImageButton.addEventListener("click", exportBoardAsImage);
  dom.saveTextButton.addEventListener("click", exportBoardAsText);
  dom.saveCodeButton.addEventListener("click", exportBoardAsCode);
  dom.saveCancelButton.addEventListener("click", closeSaveModal);
  dom.boardTitleInput.addEventListener("input", handleBoardTitleInput);
  dom.saveModal.addEventListener("click", handleSaveModalClick);
  dom.labelForm.addEventListener("submit", handleLabelSubmit);
  dom.labelInput.addEventListener("keydown", handleLabelInputKeydown);
  dom.labelModal.addEventListener("click", handleLabelModalClick);
  dom.importFileInput.addEventListener("change", handleImportFileChange);
  dom.toastAction.addEventListener("click", restoreUndoSnapshot);

  dom.cardsLayer.addEventListener("focusin", handleCardFocus);
  dom.cardsLayer.addEventListener("dblclick", handleCardDoubleClick);
  dom.cardsLayer.addEventListener("input", handleCardInput);
  dom.cardsLayer.addEventListener("paste", handleCardPaste);

  window.addEventListener("resize", requestRender);
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("keyup", handleKeyup);
  window.addEventListener("blur", handleWindowBlur);
  window.addEventListener("beforeunload", saveNow);
}

function createEmptyState() {
  const camera = defaultCamera();
  return {
    version: 3,
    title: "",
    camera,
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    nextId: 1,
    nextOrder: 1,
    colorDeck: createColorDeck(),
    nextColorIndex: 0,
    cards: {},
    connections: []
  };
}

function normalizeStateSnapshot(parsed) {
  const base = createEmptyState();
  const baseCamera = base.camera;

  const cards = {};
  Object.values(parsed?.cards || {}).forEach((card) => {
    if (!card || !card.id) {
      return;
    }

    const isLabel = !!card.isLabel;
    const widthCap = isLabel
      ? MAX_LABEL_CARD_WIDTH
      : clamp(toNumber(card.widthCap, MAX_NOTE_CARD_WIDTH), MAX_NOTE_CARD_WIDTH, MAX_RESIZED_NOTE_WIDTH);
    const fontScale = isLabel
      ? 1
      : clamp(toNumber(card.fontScale, 1), MIN_NOTE_FONT_SCALE, MAX_NOTE_FONT_SCALE);
    const fitMinWidth = isLabel ? LABEL_CARD_MIN_WIDTH : FIT_CARD_MIN_WIDTH;
    const fitMinHeight = isLabel ? LABEL_CARD_MIN_HEIGHT : FIT_CARD_MIN_HEIGHT;

    cards[card.id] = {
      id: String(card.id),
      parentId: card.parentId ? String(card.parentId) : null,
      x: toNumber(card.x, 0),
      y: toNumber(card.y, 0),
      w: clamp(
        toNumber(card.w, fitMinWidth),
        fitMinWidth,
        isLabel ? MAX_LABEL_CARD_WIDTH : widthCap
      ),
      h: Math.max(fitMinHeight, toNumber(card.h, fitMinHeight)),
      color: isHex(card.color) ? card.color : PALETTE[0].fill,
      isLabel,
      labelRootId: card.labelRootId ? String(card.labelRootId) : null,
      collapsed: !!card.collapsed,
      widthCap,
      fontScale,
      fontWeight: card.fontWeight === "700" ? "700" : "400",
      fontStyle: card.fontStyle === "italic" ? "italic" : "normal",
      textDecoration: card.textDecoration === "underline" ? "underline" : "none",
      textAlign: ["left", "center", "right"].includes(card.textAlign) ? card.textAlign : "left",
      fitMinWidth,
      fitMinHeight,
      text:
        typeof card.text === "string"
          ? (isLabel
              ? normalizeLabelText(card.text)
              : normalizeStoredCardText(card.text, parsed?.version))
          : "",
      createdAt: typeof card.createdAt === "string" ? card.createdAt : new Date().toISOString(),
      order: Math.max(1, toNumber(card.order, 1))
    };
  });

  sanitizeCardRelationships(cards);

  const connections = Array.isArray(parsed?.connections)
    ? parsed.connections
        .map((item, index) => {
          if (!item) {
            return null;
          }

          return {
            id: item.id || `connection-${index + 1}`,
            fromId: item.fromId ? String(item.fromId) : null,
            toId: item.toId ? String(item.toId) : null,
            color: isHex(item.color) ? item.color : PALETTE[0].fill,
            via: Array.isArray(item.via)
              ? item.via
                  .map((point) =>
                    point && isFiniteNumber(point.x) && isFiniteNumber(point.y)
                      ? { x: point.x, y: point.y }
                      : null
                  )
                  .filter(Boolean)
              : []
          };
        })
        .filter((item) =>
          item &&
          item.fromId &&
          item.toId &&
          item.fromId !== item.toId &&
          cards[item.fromId] &&
          cards[item.toId] &&
          !cards[item.fromId].isLabel &&
          !cards[item.toId].isLabel
        )
    : [];

  const inferredNextId = Object.keys(cards).reduce((highest, id) => {
    const match = /^card-(\d+)$/.exec(id);
    return match ? Math.max(highest, Number(match[1]) + 1) : highest;
  }, 1);
  const inferredNextOrder = Object.values(cards).reduce(
    (highest, card) => Math.max(highest, card.order + 1),
    1
  );

  return {
    version: 3,
    title: typeof parsed?.title === "string" ? normalizeBoardTitle(parsed.title) : "",
    camera: {
      x: toNumber(parsed?.camera?.x, baseCamera.x),
      y: toNumber(parsed?.camera?.y, baseCamera.y),
      scale: clamp(toNumber(parsed?.camera?.scale, baseCamera.scale), ZOOM_LIMITS.min, ZOOM_LIMITS.max)
    },
    backgroundColor: isHex(parsed?.backgroundColor) ? parsed.backgroundColor : DEFAULT_BACKGROUND_COLOR,
    nextId: Math.max(inferredNextId, toNumber(parsed?.nextId, base.nextId)),
    nextOrder: Math.max(inferredNextOrder, toNumber(parsed?.nextOrder, base.nextOrder)),
    colorDeck: normalizeColorDeck(parsed?.colorDeck),
    nextColorIndex: Math.max(0, toNumber(parsed?.nextColorIndex, base.nextColorIndex)),
    cards,
    connections
  };
}

function sanitizeCardRelationships(cards) {
  Object.values(cards).forEach((card) => {
    if (!card.parentId || !cards[card.parentId] || cards[card.parentId].isLabel || card.parentId === card.id) {
      card.parentId = null;
    }
    if (card.isLabel) {
      card.parentId = null;
      if (!card.labelRootId || !cards[card.labelRootId] || cards[card.labelRootId].isLabel) {
        card.labelRootId = null;
      }
    }
  });

  Object.values(cards).forEach((card) => {
    const visited = new Set([card.id]);
    let currentId = card.parentId;
    while (currentId) {
      if (visited.has(currentId)) {
        card.parentId = null;
        break;
      }
      visited.add(currentId);
      currentId = cards[currentId]?.parentId || null;
    }
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyState();
    }

    return normalizeStateSnapshot(JSON.parse(raw));
  } catch (error) {
    console.warn("Could not restore board state.", error);
    return createEmptyState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Could not save board state.", error);
  }
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveState, 140);
}

function saveNow() {
  window.clearTimeout(saveTimer);
  saveState();
}

function renderPalette() {
  dom.palette.innerHTML = "";
  DISPLAY_PALETTE.forEach((swatch) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "palette-swatch";
    button.style.setProperty("--swatch", swatch.fill);
    button.dataset.color = swatch.fill;
    button.setAttribute("aria-label", swatch.name);
    button.title = swatch.name;
    dom.palette.appendChild(button);
  });
  syncPaletteSizing();
  syncPalette();
}

function syncPaletteSizing() {
  const swatchCount = DISPLAY_PALETTE.length;
  if (!swatchCount) {
    return;
  }

  const paletteStyle = window.getComputedStyle(dom.palette);
  const top = Number.parseFloat(paletteStyle.top) || 0;
  const gap = Number.parseFloat(paletteStyle.rowGap || paletteStyle.gap) || 0;
  const bottomClearance = 8;
  const availableHeight = Math.max(0, window.innerHeight - top - bottomClearance);
  const fittedSize = Math.floor(
    (availableHeight - gap * Math.max(0, swatchCount - 1)) / swatchCount
  );
  const preferredSize = window.matchMedia("(max-width: 760px)").matches ? 32 : 25;
  const size = clamp(fittedSize, 8, preferredSize);
  dom.palette.style.setProperty("--palette-swatch-size", `${size}px`);
}

function applyToolState() {
  document.body.dataset.tool = uiState.currentTool;
  document.body.classList.toggle("is-space-panning", isSpacePressed);
  dom.toolButtons.forEach((button) => {
    const active = button.dataset.tool === uiState.currentTool;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  if (dom.toolHint) {
    dom.toolHint.textContent = TOOL_HINTS[uiState.currentTool] || "";
  }
  syncTextToolbar();
}

function toggleTool(tool) {
  if (uiState.currentTool === tool) {
    setTool("default");
    return;
  }
  setTool(tool);
}

function setTool(tool) {
  if (!(tool in TOOL_HINTS)) {
    return;
  }
  cancelActiveInteraction();
  uiState.currentTool = tool;
  applyToolState();
  requestRender();
}

function handlePaletteClick(event) {
  const button = event.target.closest(".palette-swatch");
  if (!button) {
    return;
  }
  uiState.activeColor = button.dataset.color;
  syncPalette();
}

function syncPalette() {
  Array.from(dom.palette.querySelectorAll(".palette-swatch")).forEach((swatch) => {
    const active = swatch.dataset.color === uiState.activeColor;
    swatch.classList.toggle("is-active", active);
    swatch.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function togglePaletteVisibility() {
  uiState.paletteVisible = !uiState.paletteVisible;
  syncPaletteVisibility();
}

function syncPaletteVisibility() {
  dom.palette.hidden = !uiState.paletteVisible;
  dom.swatchToggle.classList.toggle("is-active", uiState.paletteVisible);
  dom.swatchToggle.setAttribute("aria-pressed", uiState.paletteVisible ? "true" : "false");
}

function setSelectedCard(nextCardId, options = {}) {
  const previousId = uiState.selectedCardId;
  if (!options.skipAutoFit && previousId && previousId !== nextCardId) {
    autoFitDeselectedCard(previousId);
  }
  uiState.selectedCardId = nextCardId;
}

function autoFitDeselectedCard(cardId) {
  const card = state.cards[cardId];
  if (!card || card.isLabel) {
    return;
  }

  const body = cardElements.get(cardId)?.querySelector(".card-body");
  if (!body) {
    return;
  }

  card.text = readCardBodyText(body);
  fitCardToText(cardId, body);
  if (uiState.pendingFocusCardId === cardId) {
    uiState.pendingFocusCardId = null;
  }
  if (document.activeElement === body) {
    body.blur();
    window.getSelection()?.removeAllRanges();
  }
  scheduleSave();
}

function handlePointerDown(event) {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  trackTouch(event);
  if (beginGestureIfNeeded()) {
    event.preventDefault();
    return;
  }

  if (interaction.mode === "gesture") {
    event.preventDefault();
    return;
  }

  if (shouldPanFromEvent(event)) {
    event.preventDefault();
    startPan(event);
    return;
  }

  const cardElement = event.target.closest(".note-card");
  const gripElement = event.target.closest(".card-grip");
  const bodyElement = event.target.closest(".card-body");

  if (uiState.currentTool === "bucket") {
    if (cardElement && !state.cards[cardElement.dataset.id]?.isLabel) {
      event.preventDefault();
      applyColorToSubtree(cardElement.dataset.id, uiState.activeColor);
      bringCardForward(cardElement.dataset.id);
      setSelectedCard(cardElement.dataset.id);
      scheduleSave();
      requestRender();
    } else if (!cardElement) {
      event.preventDefault();
      setBoardBackgroundColor(uiState.activeColor);
      setSelectedCard(null);
      scheduleSave();
      requestRender();
    } else {
      setSelectedCard(null);
      requestRender();
    }
    return;
  }

  if (uiState.currentTool === "brush") {
    if (cardElement && !state.cards[cardElement.dataset.id]?.isLabel) {
      event.preventDefault();
      startBrush(event, cardElement.dataset.id);
    } else {
      setSelectedCard(null);
      requestRender();
    }
    return;
  }

  if (uiState.currentTool === "label") {
    if (cardElement && !state.cards[cardElement.dataset.id]?.isLabel) {
      event.preventDefault();
      openLabelModal(cardElement.dataset.id);
      return;
    }
    if (!cardElement) {
      setSelectedCard(null);
      requestRender();
      return;
    }
  }

  if (uiState.currentTool === "delete") {
    if (cardElement?.dataset.id) {
      event.preventDefault();
      openDeleteModal(cardElement.dataset.id);
    } else {
      setSelectedCard(null);
      requestRender();
    }
    return;
  }

  if (uiState.currentTool === "size") {
    if (cardElement?.dataset.id && !state.cards[cardElement.dataset.id]?.isLabel) {
      event.preventDefault();
      setSelectedCard(cardElement.dataset.id);
      bringCardForward(cardElement.dataset.id);
      requestRender();
    } else {
      setSelectedCard(null);
      requestRender();
    }
    return;
  }

  if (cardElement) {
    if (!gripElement && isCollapsibleLabel(cardElement.dataset.id)) {
      event.preventDefault();
      toggleLabelCollapse(cardElement.dataset.id);
      return;
    }
    setSelectedCard(cardElement.dataset.id);
    if (gripElement) {
      event.preventDefault();
      if (gripElement.dataset.corner) {
        startCardResize(event, cardElement.dataset.id, gripElement.dataset.corner);
      } else {
        startCardDrag(event, cardElement.dataset.id, "move");
      }
      return;
    }
    if (!bodyElement) {
      event.preventDefault();
    }
    requestRender();
    return;
  }

  event.preventDefault();
  setSelectedCard(null);
  startDraft(event);
}

function handlePointerMove(event) {
  trackTouch(event);

  if (interaction.mode === "gesture") {
    updateGesture();
    event.preventDefault();
    return;
  }

  if (event.pointerId !== interaction.primaryPointerId) {
    return;
  }

  if (interaction.mode === "draw") {
    event.preventDefault();
    updateDraft(event);
    return;
  }

  if (interaction.mode === "pan") {
    event.preventDefault();
    updatePan(event);
    return;
  }

  if (interaction.mode === "drag-card") {
    event.preventDefault();
    updateCardDrag(event);
    return;
  }

  if (interaction.mode === "resize-card") {
    event.preventDefault();
    updateCardResize(event);
    return;
  }

  if (interaction.mode === "scale-card") {
    event.preventDefault();
    updateCardScale(event);
    return;
  }

  if (interaction.mode === "brush") {
    event.preventDefault();
    updateBrush(event);
  }
}

function handlePointerUp(event) {
  const wasTouch = event.pointerType === "touch";

  if (interaction.mode === "gesture") {
    untrackTouch(event);
    if (interaction.activeTouches.size < 2) {
      interaction.mode = null;
      interaction.gesture = null;
      scheduleSave();
      requestRender();
    }
    return;
  }

  if (event.pointerId === interaction.primaryPointerId) {
    if (interaction.mode === "draw") {
      finishDraft();
    } else if (interaction.mode === "pan") {
      finishPan();
    } else if (interaction.mode === "drag-card") {
      finishCardDrag(event);
    } else if (interaction.mode === "resize-card") {
      finishCardResize();
    } else if (interaction.mode === "scale-card") {
      finishCardScale();
    } else if (interaction.mode === "brush") {
      finishBrush(event);
    }
  }

  if (wasTouch) {
    untrackTouch(event);
  }
}

function handlePointerCancel(event) {
  if (interaction.mode === "gesture") {
    untrackTouch(event);
    if (interaction.activeTouches.size < 2) {
      interaction.mode = null;
      interaction.gesture = null;
      requestRender();
    }
    return;
  }

  if (event.pointerId === interaction.primaryPointerId) {
    cancelActiveInteraction();
  }

  untrackTouch(event);
}

function handleWheel(event) {
  event.preventDefault();
  if (event.ctrlKey || event.metaKey) {
    const factor = Math.exp(-event.deltaY * 0.0026);
    zoomAtPoint(factor, { x: event.clientX, y: event.clientY });
  } else {
    state.camera.x -= event.deltaX;
    state.camera.y -= event.deltaY;
  }
  scheduleSave();
  requestRender();
}

function handleKeydown(event) {
  if (!dom.titleModal.hidden && event.key === "Escape") {
    closeTitleModal();
    event.preventDefault();
    return;
  }

  if (!dom.infoModal.hidden && event.key === "Escape") {
    closeInfoModal();
    event.preventDefault();
    return;
  }

  if (!dom.resetModal.hidden && event.key === "Escape") {
    closeResetModal();
    event.preventDefault();
    return;
  }

  if (!dom.deleteModal.hidden && event.key === "Escape") {
    closeDeleteModal();
    event.preventDefault();
    return;
  }

  if (!dom.saveModal.hidden && event.key === "Escape") {
    closeSaveModal();
    event.preventDefault();
    return;
  }

  if (!dom.labelModal.hidden && event.key === "Escape") {
    closeLabelModal();
    event.preventDefault();
    return;
  }

  const editableBody = event.target.closest?.(".card-body");
  const editableCardId = editableBody?.closest(".note-card")?.dataset.id || null;
  if (
    event.key === "Enter" &&
    event.shiftKey &&
    editableBody &&
    editableCardId &&
    !state.cards[editableCardId]?.isLabel
  ) {
    event.preventDefault();
    finishEditingAndFitCard(editableCardId, editableBody);
    return;
  }

  if (isTextEntryTarget(event.target)) {
    return;
  }

  if (event.key === "Escape") {
    cancelActiveInteraction();
    isSpacePressed = false;
    setTool("default");
    return;
  }

  if (event.code === "Space") {
    isSpacePressed = true;
    event.preventDefault();
    applyToolState();
    return;
  }

  if (event.key === "1") {
    setTool("default");
  } else if (event.key === "2") {
    setTool("bucket");
  } else if (event.key === "3") {
    setTool("brush");
  } else if (event.key === "4") {
    setTool("size");
  }
}

function handleKeyup(event) {
  if (event.code !== "Space") {
    return;
  }
  isSpacePressed = false;
  applyToolState();
}

function handleWindowBlur() {
  if (!isSpacePressed) {
    return;
  }
  isSpacePressed = false;
  applyToolState();
}

function handleCardFocus(event) {
  const body = event.target.closest(".card-body");
  if (!body) {
    return;
  }
  setSelectedCard(body.closest(".note-card")?.dataset.id || null);
  requestRender();
}

function handleCardInput(event) {
  const body = event.target.closest(".card-body");
  if (!body) {
    return;
  }
  const id = body.closest(".note-card")?.dataset.id;
  const card = id ? state.cards[id] : null;
  if (!card) {
    return;
  }
  card.text = readCardBodyText(body);
  scheduleSave();
}

function handleCardPaste(event) {
  const body = event.target.closest(".card-body");
  if (!body) {
    return;
  }
  event.preventDefault();
  const text = event.clipboardData?.getData("text/plain") || "";
  document.execCommand("insertText", false, text);
}

function handleCardDoubleClick(event) {
  const cardElement = event.target.closest(".note-card");
  if (!cardElement?.dataset.id) {
    return;
  }

  event.preventDefault();
  const rect = getSubtreeBounds(cardElement.dataset.id);
  const focus = getCanvasFocusPoint();
  const nextScale = clamp(Math.max(state.camera.scale, 1.18) * 1.22, ZOOM_LIMITS.min, ZOOM_LIMITS.max);
  state.camera.scale = nextScale;
  state.camera.x = focus.x - (rect.x + rect.w / 2) * nextScale;
  state.camera.y = focus.y - (rect.y + rect.h / 2) * nextScale;
  scheduleSave();
  requestRender();
}

function isCollapsibleLabel(cardId) {
  const card = state.cards[cardId];
  return !!card?.isLabel && !!card.labelRootId && getLabelMemberRootIds(cardId).length > 0;
}

function openDeleteModal(cardId) {
  if (!cardId || !state.cards[cardId]) {
    return;
  }

  closeResetModal();
  closeSaveModal();
  closeLabelModal();
  uiState.pendingDeleteCardId = cardId;
  setSelectedCard(cardId);
  applyPopupTheme(dom.deleteModal);
  dom.deleteModal.hidden = false;
  dom.deleteConfirmButton.focus();
  requestRender();
}

function closeDeleteModal(options = {}) {
  const wasOpen = !dom.deleteModal.hidden;
  uiState.pendingDeleteCardId = null;
  dom.deleteModal.hidden = true;
  if (wasOpen) {
    dom.viewport.focus({ preventScroll: true });
  }
  if (!options.skipRender) {
    requestRender();
  }
}

function handleDeleteModalClick(event) {
  if (event.target === dom.deleteModal) {
    closeDeleteModal();
  }
}

function confirmDeletePendingCard() {
  const cardId = uiState.pendingDeleteCardId;
  closeDeleteModal({ skipRender: true });
  if (!cardId || !state.cards[cardId]) {
    requestRender();
    return;
  }

  const snapshot = serializeStateSnapshot();
  cancelActiveInteraction();
  deleteCardAndRelated(cardId);
  scheduleSave();
  requestRender();
  showToast("Deleted from board", { snapshot, actionLabel: "Undo" });
}

function deleteCardAndRelated(cardId) {
  const card = state.cards[cardId];
  if (!card) {
    return;
  }

  const labelSnapshots = Object.values(state.cards)
    .filter((candidate) => candidate.isLabel)
    .map((label) => ({
      id: label.id,
      memberRootIds: getLabelMemberRootIds(label.id)
    }));
  const removedCardIds = uniqueExistingCardIds(
    card.isLabel ? [cardId] : [cardId, ...getDescendants(cardId)]
  );
  const removedCardIdSet = new Set(removedCardIds);
  const removedRootIds = new Set(
    removedCardIds.filter((id) => {
      const candidate = state.cards[id];
      return !!candidate && !candidate.isLabel && !candidate.parentId;
    })
  );

  removedCardIds.forEach((id) => {
    delete state.cards[id];
  });

  state.connections = state.connections.filter((connection) => {
    return (
      !!state.cards[connection.fromId] &&
      !!state.cards[connection.toId] &&
      !removedRootIds.has(connection.fromId) &&
      !removedRootIds.has(connection.toId)
    );
  });

  labelSnapshots.forEach((snapshot) => {
    const label = state.cards[snapshot.id];
    if (!label?.isLabel) {
      return;
    }

    const survivingMemberRootIds = snapshot.memberRootIds.filter((rootId) => {
      return !!state.cards[rootId] && !state.cards[rootId].isLabel;
    });
    if (survivingMemberRootIds.length === 0) {
      delete state.cards[snapshot.id];
      removedCardIdSet.add(snapshot.id);
      return;
    }

    if (
      !label.labelRootId ||
      !state.cards[label.labelRootId] ||
      !survivingMemberRootIds.includes(label.labelRootId)
    ) {
      label.labelRootId = survivingMemberRootIds[0];
    }
    label.text = normalizeLabelText(label.text);
  });

  if (uiState.selectedCardId && removedCardIdSet.has(uiState.selectedCardId)) {
    uiState.selectedCardId = null;
  }
  if (uiState.pendingFocusCardId && removedCardIdSet.has(uiState.pendingFocusCardId)) {
    uiState.pendingFocusCardId = null;
  }
  if (uiState.pendingLabelRootId && removedRootIds.has(uiState.pendingLabelRootId)) {
    uiState.pendingLabelRootId = null;
  }
  if (uiState.pendingDeleteCardId && removedCardIdSet.has(uiState.pendingDeleteCardId)) {
    uiState.pendingDeleteCardId = null;
  }
}

function getCardAtPoint(clientX, clientY, excludedId = null) {
  const match = document
    .elementsFromPoint(clientX, clientY)
    .map((element) => element.closest?.(".note-card"))
    .find((element) => element?.dataset.id && element.dataset.id !== excludedId);

  return match?.dataset.id || null;
}

function getLabelMemberRootIds(labelId) {
  const label = state.cards[labelId];
  if (!label?.isLabel || !label.labelRootId || !state.cards[label.labelRootId]) {
    return [];
  }

  return collectConnectedRootIds(label.labelRootId).filter((rootId) => {
    const card = state.cards[rootId];
    return !!card && !card.isLabel;
  });
}

function getLabelIdsForRoot(rootId) {
  if (!rootId || !state.cards[rootId] || state.cards[rootId].isLabel) {
    return [];
  }

  return Object.values(state.cards)
    .filter((card) => card.isLabel && getLabelMemberRootIds(card.id).includes(rootId))
    .map((card) => card.id);
}

function uniqueExistingCardIds(cardIds) {
  return Array.from(
    new Set(cardIds.filter((cardId) => !!cardId && !!state.cards[cardId]))
  );
}

function getDragTargetCardIds(cardId) {
  const card = state.cards[cardId];
  if (!card) {
    return [];
  }

  if (card.isLabel) {
    return uniqueExistingCardIds([cardId, ...getLabelMemberRootIds(cardId)]);
  }

  const rootId = getRootId(cardId);
  const labelIds = getLabelIdsForRoot(rootId);
  if (labelIds.length === 0) {
    return [cardId];
  }

  const memberRootIds = new Set();
  labelIds.forEach((labelId) => {
    getLabelMemberRootIds(labelId).forEach((memberRootId) => {
      memberRootIds.add(memberRootId);
    });
  });

  if (!memberRootIds.has(rootId)) {
    return [cardId];
  }

  return uniqueExistingCardIds([...labelIds, ...memberRootIds]);
}

function moveCardSetBy(cardIds, deltaX, deltaY) {
  uniqueExistingCardIds(cardIds).forEach((cardId) => {
    moveCardBy(cardId, deltaX, deltaY);
  });
  shiftConnectionPathsForMovedRoots(cardIds, deltaX, deltaY);
}

function resolveCardSetPlacement(cardIds, motion = { x: 0, y: 0 }) {
  uniqueExistingCardIds(cardIds).forEach((cardId) => {
    resolveCardPlacement(cardId, motion);
  });
}

function bringCardsForward(cardIds) {
  uniqueExistingCardIds(cardIds)
    .sort((leftId, rightId) => state.cards[leftId].order - state.cards[rightId].order)
    .forEach((cardId) => {
      bringCardForward(cardId);
    });
}

function collectConnectedRootIds(seedRootId) {
  if (!seedRootId || !state.cards[seedRootId] || state.cards[seedRootId]?.isLabel) {
    return [];
  }

  const adjacency = new Map();
  Object.values(state.cards).forEach((card) => {
    if (!card.parentId && !card.isLabel) {
      adjacency.set(card.id, new Set());
    }
  });

  state.connections.forEach((connection) => {
    const fromId = state.cards[connection.fromId] ? getRootId(connection.fromId) : null;
    const toId = state.cards[connection.toId] ? getRootId(connection.toId) : null;
    if (
      !fromId ||
      !toId ||
      fromId === toId ||
      state.cards[fromId]?.isLabel ||
      state.cards[toId]?.isLabel
    ) {
      return;
    }
    if (!adjacency.has(fromId)) {
      adjacency.set(fromId, new Set());
    }
    if (!adjacency.has(toId)) {
      adjacency.set(toId, new Set());
    }
    adjacency.get(fromId).add(toId);
    adjacency.get(toId).add(fromId);
  });

  const visited = new Set([seedRootId]);
  const queue = [seedRootId];
  while (queue.length > 0) {
    const currentId = queue.shift();
    const neighbors = adjacency.get(currentId) || new Set();
    neighbors.forEach((neighborId) => {
      if (visited.has(neighborId)) {
        return;
      }
      visited.add(neighborId);
      queue.push(neighborId);
    });
  }

  return Array.from(visited);
}

function openLabelModal(cardId) {
  const rootId = getRootId(cardId);
  if (!state.cards[rootId] || state.cards[rootId].isLabel) {
    return;
  }

  closeDeleteModal({ skipRender: true });
  uiState.pendingLabelRootId = rootId;
  uiState.labelModalPrimed = true;
  applyLabelModalTheme(rootId);
  dom.labelInput.value = "";
  dom.labelModal.hidden = false;
  window.requestAnimationFrame(() => {
    uiState.labelModalPrimed = false;
    dom.labelInput.focus();
    dom.labelInput.select();
  });
}

function closeLabelModal() {
  uiState.pendingLabelRootId = null;
  uiState.labelModalPrimed = false;
  dom.labelModal.hidden = true;
  dom.labelInput.value = "";
  clearLabelModalTheme();
  requestRender();
}

function handleLabelModalClick(event) {
  if (event.target === dom.labelModal) {
    if (uiState.labelModalPrimed) {
      return;
    }
    closeLabelModal();
  }
}

function handleLabelInputKeydown(event) {
  if (event.key !== "Enter") {
    return;
  }
  event.preventDefault();
  dom.labelForm.requestSubmit();
}

function handleLabelSubmit(event) {
  event.preventDefault();
  const rootId = uiState.pendingLabelRootId;
  if (!rootId || !state.cards[rootId]) {
    closeLabelModal();
    return;
  }

  const title = normalizeLabelText(dom.labelInput.value.trim() || "Untitled group");
  const labelId = createLabelCard(title, rootId);
  closeLabelModal();
  if (!labelId) {
    return;
  }

  setSelectedCard(labelId);
  bringCardForward(labelId);
  setTool("default");
  scheduleSave();
  requestRender();
}

function createLabelCard(title, seedRootId) {
  const memberRootIds = collectConnectedRootIds(seedRootId);
  if (memberRootIds.length === 0) {
    return null;
  }

  const bounds = getBoundsForCardIds(memberRootIds);
  const width = LABEL_CARD_MIN_WIDTH;
  const height = LABEL_CARD_MIN_HEIGHT;
  const id = `card-${state.nextId++}`;

  state.cards[id] = {
    id,
    parentId: null,
    x: bounds.x + bounds.w / 2 - width / 2,
    y: bounds.y - height - CARD_GAP * 2,
    w: width,
    h: height,
    color: state.cards[seedRootId]?.color || LABEL_CARD_FILL,
    isLabel: true,
    labelRootId: seedRootId,
    collapsed: false,
    widthCap: MAX_LABEL_CARD_WIDTH,
    fontScale: 1,
    fontWeight: "700",
    fontStyle: "italic",
    textDecoration: "none",
    textAlign: "left",
    fitMinWidth: LABEL_CARD_MIN_WIDTH,
    fitMinHeight: LABEL_CARD_MIN_HEIGHT,
    text: normalizeLabelText(title),
    createdAt: new Date().toISOString(),
    order: state.nextOrder++
  };

  resolveCardPlacement(id, { x: 0, y: -1 });
  return id;
}

function toggleLabelCollapse(cardId) {
  const card = state.cards[cardId];
  if (!card || !isCollapsibleLabel(cardId)) {
    return;
  }
  card.collapsed = !card.collapsed;
  setSelectedCard(cardId);
  scheduleSave();
  requestRender();
}

function getCollapsedLabelOwnerId(cardId) {
  const card = state.cards[cardId];
  if (!card || card.isLabel) {
    return null;
  }

  const rootId = getRootId(cardId);
  const labelCards = Object.values(state.cards)
    .filter((candidate) => candidate.isLabel && candidate.collapsed && candidate.id !== cardId)
    .sort((left, right) => right.order - left.order);

  for (const label of labelCards) {
    if (getLabelMemberRootIds(label.id).includes(rootId)) {
      return label.id;
    }
  }

  return null;
}

function isHiddenByCollapsedLabel(cardId) {
  return !!getCollapsedLabelOwnerId(cardId);
}

function getBoundsForCardIds(cardIds) {
  const rects = cardIds
    .map((id) => getWorldRect(id))
    .filter((rect) => rect.w > 0 && rect.h > 0);

  if (rects.length === 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.w));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

function isTextEntryTarget(target) {
  if (!target) {
    return false;
  }

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return true;
  }

  if (target.closest?.(".card-body")) {
    return true;
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }

  return false;
}

function normalizeCardText(text) {
  return text.replace(/\u00a0/g, " ").replace(/\r/g, "").replace(/\n+$/, "");
}

function normalizeStoredCardText(text, version) {
  const normalized = normalizeCardText(text);
  if (toNumber(version, 1) >= 3) {
    return normalized;
  }
  return normalized.replace(/\n{3,}/g, (lineBreaks) => lineBreaks.slice(1));
}

function readCardBodyText(body) {
  const text = normalizeCardText(body?.innerText || "");
  if (!body?.children.length) {
    return text;
  }

  // contenteditable represents a blank line with an empty block between two
  // blocks. innerText inserts an extra newline at that boundary, which made
  // the text measurer reserve a phantom line at the bottom of fitted cards.
  return text.replace(/\n{2,}/g, (lineBreaks) => lineBreaks.slice(1));
}

function normalizeLabelText(text) {
  return normalizeCardText(text).toUpperCase();
}

function normalizeBoardTitle(text) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 120);
}

function getCardFontScale(card) {
  if (!card || card.isLabel) {
    return 1;
  }
  return clamp(toNumber(card.fontScale, 1), MIN_NOTE_FONT_SCALE, MAX_NOTE_FONT_SCALE);
}

function getSelectedEditableCard() {
  const card = uiState.selectedCardId ? state.cards[uiState.selectedCardId] : null;
  return card && !card.isLabel ? card : null;
}

function syncTextToolbar() {
  if (!dom.textToolbar) {
    return;
  }
  const visible = uiState.currentTool === "size";
  dom.textToolbar.hidden = !visible;
  if (!visible) {
    return;
  }
  const card = getSelectedEditableCard();
  const disabled = !card;
  dom.textToolbarHint.hidden = !disabled;
  [
    dom.editTextButton,
    dom.decreaseTextButton,
    dom.increaseTextButton,
    dom.boldTextButton,
    dom.italicTextButton,
    dom.underlineTextButton,
    dom.alignLeftButton,
    dom.alignCenterButton,
    dom.alignRightButton,
    dom.resetTextButton
  ]
    .forEach((button) => {
      button.disabled = disabled;
    });
  dom.boldTextButton.setAttribute("aria-pressed", card?.fontWeight === "700" ? "true" : "false");
  dom.italicTextButton.setAttribute("aria-pressed", card?.fontStyle === "italic" ? "true" : "false");
  dom.underlineTextButton.setAttribute("aria-pressed", card?.textDecoration === "underline" ? "true" : "false");
  dom.alignLeftButton.setAttribute("aria-pressed", card && (card.textAlign || "left") === "left" ? "true" : "false");
  dom.alignCenterButton.setAttribute("aria-pressed", card?.textAlign === "center" ? "true" : "false");
  dom.alignRightButton.setAttribute("aria-pressed", card?.textAlign === "right" ? "true" : "false");
}

function editSelectedCardText() {
  const card = getSelectedEditableCard();
  const body = card ? cardElements.get(card.id)?.querySelector(".card-body") : null;
  if (!body) {
    return;
  }
  setTool("default");
  body.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(body);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function adjustSelectedTextScale(factor) {
  const card = getSelectedEditableCard();
  const body = card ? cardElements.get(card.id)?.querySelector(".card-body") : null;
  if (!card || !body) {
    return;
  }
  const previousScale = getCardFontScale(card);
  const nextScale = clamp(previousScale * factor, MIN_NOTE_FONT_SCALE, MAX_NOTE_FONT_SCALE);
  card.fontScale = nextScale;
  card.widthCap = clamp(getNoteWidthCap(card) * (nextScale / previousScale), MAX_NOTE_CARD_WIDTH, MAX_RESIZED_NOTE_WIDTH);
  body.style.setProperty("--card-font-scale", String(nextScale));
  fitCardToText(card.id, body, { preserveCenter: true });
  scheduleSave();
  requestRender();
}

function resetSelectedTextScale() {
  const card = getSelectedEditableCard();
  const body = card ? cardElements.get(card.id)?.querySelector(".card-body") : null;
  if (!card || !body) {
    return;
  }
  card.fontScale = 1;
  card.widthCap = MAX_NOTE_CARD_WIDTH;
  card.fontWeight = "400";
  card.fontStyle = "normal";
  card.textDecoration = "none";
  card.textAlign = "left";
  body.style.setProperty("--card-font-scale", "1");
  applyCardTextFormatting(body, card);
  fitCardToText(card.id, body, { preserveCenter: true });
  scheduleSave();
  requestRender();
}

function toggleSelectedTextFormat(property, activeValue, defaultValue) {
  const card = getSelectedEditableCard();
  const body = card ? cardElements.get(card.id)?.querySelector(".card-body") : null;
  if (!card || !body) {
    return;
  }
  card[property] = card[property] === activeValue ? defaultValue : activeValue;
  applyCardTextFormatting(body, card);
  fitCardToText(card.id, body, { preserveCenter: true });
  scheduleSave();
  requestRender();
}

function setSelectedTextAlignment(alignment) {
  const card = getSelectedEditableCard();
  const body = card ? cardElements.get(card.id)?.querySelector(".card-body") : null;
  if (!card || !body || !["left", "center", "right"].includes(alignment)) {
    return;
  }
  card.textAlign = alignment;
  applyCardTextFormatting(body, card);
  scheduleSave();
  requestRender();
}

function applyCardTextFormatting(body, card) {
  body.style.fontWeight = card.fontWeight || "400";
  body.style.fontStyle = card.fontStyle || "normal";
  body.style.textDecoration = card.textDecoration || "none";
  body.style.textAlign = card.textAlign || "left";
}

function getNoteWidthCap(card) {
  if (!card || card.isLabel) {
    return MAX_LABEL_CARD_WIDTH;
  }
  return clamp(toNumber(card.widthCap, MAX_NOTE_CARD_WIDTH), MAX_NOTE_CARD_WIDTH, MAX_RESIZED_NOTE_WIDTH);
}

function getCardFitMinWidth(card) {
  if (!card || card.isLabel) {
    return LABEL_CARD_MIN_WIDTH;
  }
  return FIT_CARD_MIN_WIDTH;
}

function getCardFitMinHeight(card) {
  if (!card || card.isLabel) {
    return LABEL_CARD_MIN_HEIGHT;
  }
  return FIT_CARD_MIN_HEIGHT;
}

function finishEditingAndFitCard(cardId, body) {
  const card = state.cards[cardId];
  if (!card || card.isLabel) {
    return;
  }

  card.text = readCardBodyText(body);
  fitCardToText(cardId, body);
  setSelectedCard(null, { skipAutoFit: true });
  if (uiState.pendingFocusCardId === cardId) {
    uiState.pendingFocusCardId = null;
  }
  body.blur();
  window.getSelection()?.removeAllRanges();
  scheduleSave();
  requestRender();
}

function fitCardToText(cardId, body, options = {}) {
  const card = state.cards[cardId];
  if (!card) {
    return;
  }

  const previousRect = options.preserveCenter ? getWorldRect(cardId) : null;
  const content = normalizeCardText(card.text);
  const { width, height } = measureCardTextBlock(
    body,
    content,
    getNoteWidthCap(card) - CARD_TEXT_INSET_X * 2
  );
  card.w = clamp(width + CARD_TEXT_INSET_X * 2, getCardFitMinWidth(card), getNoteWidthCap(card));
  card.h = Math.max(getCardFitMinHeight(card), height + CARD_TEXT_INSET_Y * 2);
  if (previousRect) {
    setCardWorldPosition(
      cardId,
      previousRect.x + previousRect.w / 2 - card.w / 2,
      previousRect.y + previousRect.h / 2 - card.h / 2
    );
  }
  resolveCardPlacement(cardId, { x: 0, y: 0 });
}

function fitLabelCardToText(cardId, body) {
  const card = state.cards[cardId];
  if (!card?.isLabel || !body) {
    return false;
  }

  const content = normalizeCardText(card.text);
  const { width, height } = measureCardTextBlock(
    body,
    content,
    MAX_LABEL_CARD_WIDTH - CARD_TEXT_INSET_X * 2
  );
  const nextWidth = clamp(width + CARD_TEXT_INSET_X * 2, LABEL_CARD_MIN_WIDTH, MAX_LABEL_CARD_WIDTH);
  const nextHeight = Math.max(LABEL_CARD_MIN_HEIGHT, height + CARD_TEXT_INSET_Y * 2);

  if (card.w === nextWidth && card.h === nextHeight) {
    return false;
  }

  const centerX = card.x + card.w / 2;
  const centerY = card.y + card.h / 2;
  card.w = nextWidth;
  card.h = nextHeight;
  card.x = centerX - nextWidth / 2;
  card.y = centerY - nextHeight / 2;
  resolveCardPlacement(cardId, { x: 0, y: 0 });
  return true;
}

function measureCardTextBlock(body, content, maxWidth) {
  if (!content) {
    return { width: 0, height: 0 };
  }

  const computed = window.getComputedStyle(body);
  const measurer = document.createElement("div");
  measurer.textContent = content;
  measurer.style.position = "fixed";
  measurer.style.left = "-99999px";
  measurer.style.top = "0";
  measurer.style.visibility = "hidden";
  measurer.style.pointerEvents = "none";
  measurer.style.whiteSpace = computed.whiteSpace;
  measurer.style.wordBreak = computed.wordBreak;
  measurer.style.overflowWrap = computed.overflowWrap || "break-word";
  measurer.style.fontFamily = computed.fontFamily;
  measurer.style.fontSize = computed.fontSize;
  measurer.style.fontWeight = computed.fontWeight;
  measurer.style.fontStyle = computed.fontStyle;
  measurer.style.letterSpacing = computed.letterSpacing;
  measurer.style.lineHeight = computed.lineHeight;
  measurer.style.textTransform = computed.textTransform;
  measurer.style.textIndent = computed.textIndent;
  measurer.style.padding = "0";
  measurer.style.margin = "0";
  measurer.style.border = "0";
  measurer.style.width = "max-content";
  measurer.style.maxWidth = `${Math.max(0, maxWidth)}px`;
  measurer.style.boxSizing = "border-box";
  document.body.appendChild(measurer);

  const rect = measurer.getBoundingClientRect();
  const width = Math.ceil(Math.max(rect.width, measurer.scrollWidth) + 2);
  const height = Math.ceil(Math.max(rect.height, measurer.scrollHeight) + 2);
  measurer.remove();
  return { width, height };
}

function applyLabelModalTheme(cardId) {
  applyPopupTheme(dom.labelModal);
}

function clearLabelModalTheme() {
  clearPopupTheme(dom.labelModal);
}

function getMostRecentNoteColor() {
  const latestNote = Object.values(state.cards)
    .filter((card) => !card.isLabel)
    .sort((left, right) => right.order - left.order)[0];
  return isHex(latestNote?.color) ? latestNote.color : uiState.activeColor;
}

function applyPopupTheme(modal) {
  if (!modal) {
    return;
  }
  const fill = getMostRecentNoteColor();
  const ink = hasReadableBlackText(fill) ? NOTE_CARD_INK : getReadableInk(fill);
  modal.style.setProperty("--modal-fill", fill);
  modal.style.setProperty("--modal-ink", ink);
  modal.style.setProperty("--modal-ink-soft", hexToRgba(ink, 0.72));
  modal.style.setProperty("--modal-border", hexToRgba(ink, 0.2));
}

function clearPopupTheme(modal) {
  if (!modal) {
    return;
  }
  modal.style.removeProperty("--modal-fill");
  modal.style.removeProperty("--modal-ink");
  modal.style.removeProperty("--modal-ink-soft");
  modal.style.removeProperty("--modal-border");
}

function isHiddenByCollapsedAncestor(cardId) {
  let currentId = state.cards[cardId]?.parentId || null;
  while (currentId) {
    if (state.cards[currentId]?.collapsed) {
      return true;
    }
    currentId = state.cards[currentId]?.parentId || null;
  }
  return isHiddenByCollapsedLabel(cardId);
}

function getCardCollapseTransform(cardId) {
  const labelId = getCollapsedLabelOwnerId(cardId);
  if (!labelId) {
    return "";
  }

  const cardRect = getWorldRect(cardId);
  const labelRect = getWorldRect(labelId);
  const cardMid = cardCenter(cardRect);
  const labelMid = cardCenter(labelRect);
  const dx = labelMid.x - cardMid.x;
  const dy = labelMid.y - cardMid.y;
  return `translate(${dx}px, ${dy}px) scale(0.14)`;
}

function getVisibleCardIds() {
  return Object.values(state.cards)
    .filter((card) => !isHiddenByCollapsedAncestor(card.id))
    .map((card) => card.id);
}

function getSubtreeBounds(cardId) {
  const card = state.cards[cardId];
  if (!card) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  if (card.isLabel) {
    if (card.collapsed) {
      return getWorldRect(cardId);
    }
    const memberRootIds = getLabelMemberRootIds(cardId);
    return getBoundsForCardIds([cardId, ...memberRootIds]);
  }

  const ids = card.collapsed ? [cardId] : [cardId, ...getDescendants(cardId)];
  return getBoundsForCardIds(ids);
}

function getLayoutBounds(cardId) {
  const card = state.cards[cardId];
  if (!card) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  if (card.isLabel) {
    return getWorldRect(cardId);
  }

  const ids = card.collapsed ? [cardId] : [cardId, ...getDescendants(cardId)];
  return getBoundsForCardIds(ids);
}

function getCollisionShift(currentRect, siblingRect, motion) {
  const currentCenter = cardCenter(currentRect);
  const siblingCenter = cardCenter(siblingRect);
  const preferHorizontal =
    Math.abs(motion.x) > Math.abs(motion.y)
      ? true
      : Math.abs(motion.x) < Math.abs(motion.y)
        ? false
        : null;

  const pushHorizontal = (direction) => ({
    x:
      direction > 0
        ? currentRect.x + currentRect.w + CARD_GAP - siblingRect.x
        : currentRect.x - CARD_GAP - (siblingRect.x + siblingRect.w),
    y: 0
  });
  const pushVertical = (direction) => ({
    x: 0,
    y:
      direction > 0
        ? currentRect.y + currentRect.h + CARD_GAP - siblingRect.y
        : currentRect.y - CARD_GAP - (siblingRect.y + siblingRect.h)
  });

  if (preferHorizontal === true) {
    return pushHorizontal(motion.x >= 0 ? 1 : -1);
  }
  if (preferHorizontal === false) {
    return pushVertical(motion.y >= 0 ? 1 : -1);
  }

  const overlapX =
    Math.min(currentRect.x + currentRect.w, siblingRect.x + siblingRect.w) -
    Math.max(currentRect.x, siblingRect.x) +
    CARD_GAP;
  const overlapY =
    Math.min(currentRect.y + currentRect.h, siblingRect.y + siblingRect.h) -
    Math.max(currentRect.y, siblingRect.y) +
    CARD_GAP;

  if (overlapX <= overlapY) {
    return pushHorizontal(siblingCenter.x >= currentCenter.x ? 1 : -1);
  }
  return pushVertical(siblingCenter.y >= currentCenter.y ? 1 : -1);
}

function startDraft(event) {
  interaction.mode = "draw";
  interaction.primaryPointerId = event.pointerId;
  capturePointer(event.pointerId);
  const startScreen = { x: event.clientX, y: event.clientY };
  const startWorld = screenToWorld(startScreen);
  interaction.draft = {
    startScreen,
    currentScreen: startScreen,
    startWorld,
    currentWorld: startWorld
  };
  updateDraftRect();
}

function updateDraft(event) {
  if (!interaction.draft) {
    return;
  }
  interaction.draft.currentScreen = { x: event.clientX, y: event.clientY };
  interaction.draft.currentWorld = screenToWorld(interaction.draft.currentScreen);
  updateDraftRect();
}

function finishDraft() {
  const draft = interaction.draft;
  interaction.mode = null;
  interaction.primaryPointerId = null;
  interaction.draft = null;
  dom.draftRect.hidden = true;

  if (!draft) {
    return;
  }

  const rect = normalizeRect(draft.startWorld, draft.currentWorld);
  if (rect.w < MIN_CARD_WIDTH || rect.h < MIN_CARD_HEIGHT) {
    requestRender();
    return;
  }

  const cardId = createCard(rect);
  resolveCardPlacement(cardId, { x: 1, y: 1 });
  setSelectedCard(cardId);
  uiState.pendingFocusCardId = cardId;
  scheduleSave();
  requestRender();
}

function updateDraftRect() {
  const draft = interaction.draft;
  if (!draft) {
    dom.draftRect.hidden = true;
    return;
  }
  const rect = normalizeRect(draft.startScreen, draft.currentScreen);
  dom.draftRect.hidden = false;
  dom.draftRect.style.left = `${rect.x}px`;
  dom.draftRect.style.top = `${rect.y}px`;
  dom.draftRect.style.width = `${Math.max(rect.w, 1)}px`;
  dom.draftRect.style.height = `${Math.max(rect.h, 1)}px`;
}

function startPan(event) {
  interaction.mode = "pan";
  interaction.primaryPointerId = event.pointerId;
  capturePointer(event.pointerId);
  interaction.pan = {
    startScreen: { x: event.clientX, y: event.clientY },
    startCamera: { ...state.camera }
  };
}

function updatePan(event) {
  if (!interaction.pan) {
    return;
  }
  state.camera.x = interaction.pan.startCamera.x + (event.clientX - interaction.pan.startScreen.x);
  state.camera.y = interaction.pan.startCamera.y + (event.clientY - interaction.pan.startScreen.y);
  scheduleSave();
  requestRender();
}

function finishPan() {
  interaction.mode = null;
  interaction.primaryPointerId = null;
  interaction.pan = null;
  scheduleSave();
  requestRender();
}

function startCardDrag(event, cardId, kind = "move") {
  const card = state.cards[cardId];
  if (!card) {
    return;
  }
  interaction.mode = "drag-card";
  interaction.primaryPointerId = event.pointerId;
  capturePointer(event.pointerId);
  const worldPoint = screenToWorld({ x: event.clientX, y: event.clientY });
  const rect = getWorldRect(cardId);
  const targetCardIds = kind === "move" ? getDragTargetCardIds(cardId) : [cardId];
  interaction.drag = {
    cardId,
    kind,
    targetCardIds,
    originalParentId: card.parentId,
    offsetX: worldPoint.x - rect.x,
    offsetY: worldPoint.y - rect.y,
    pointer: { x: event.clientX, y: event.clientY }
  };
  bringCardsForward(targetCardIds);
  requestRender();
}

function updateCardDrag(event) {
  if (!interaction.drag) {
    return;
  }
  const currentRect = getWorldRect(interaction.drag.cardId);
  const worldPoint = screenToWorld({ x: event.clientX, y: event.clientY });
  const nextWorldX = worldPoint.x - interaction.drag.offsetX;
  const nextWorldY = worldPoint.y - interaction.drag.offsetY;
  const deltaX = nextWorldX - currentRect.x;
  const deltaY = nextWorldY - currentRect.y;
  moveCardSetBy(interaction.drag.targetCardIds, deltaX, deltaY);
  interaction.drag.pointer = { x: event.clientX, y: event.clientY };
  if (interaction.drag.kind === "move") {
    resolveCardSetPlacement(interaction.drag.targetCardIds, {
      x: deltaX,
      y: deltaY
    });
  }
  requestRender();
}

function finishCardDrag() {
  const drag = interaction.drag;
  interaction.mode = null;
  interaction.primaryPointerId = null;
  interaction.drag = null;

  if (!drag || !state.cards[drag.cardId]) {
    requestRender();
    return;
  }

  resolveCardSetPlacement(drag.targetCardIds, { x: 0, y: 0 });
  bringCardsForward(drag.targetCardIds);
  scheduleSave();
  requestRender();
}

function startCardResize(event, cardId, corner) {
  const card = state.cards[cardId];
  if (!card) {
    return;
  }

  interaction.mode = "resize-card";
  interaction.primaryPointerId = event.pointerId;
  capturePointer(event.pointerId);

  interaction.resize = {
    cardId,
    corner,
    lastWorld: screenToWorld({ x: event.clientX, y: event.clientY }),
    originalRect: getWorldRect(cardId)
  };

  bringCardForward(cardId);
  requestRender();
}

function updateCardResize(event) {
  const resize = interaction.resize;
  if (!resize) {
    return;
  }

  const pointer = screenToWorld({ x: event.clientX, y: event.clientY });
  const { originalRect, corner } = resize;
  const motion = {
    x: pointer.x - resize.lastWorld.x,
    y: pointer.y - resize.lastWorld.y
  };
  resize.lastWorld = pointer;
  const fixedLeft = originalRect.x;
  const fixedTop = originalRect.y;
  const fixedRight = originalRect.x + originalRect.w;
  const fixedBottom = originalRect.y + originalRect.h;

  let nextRect = { ...originalRect };

  if (corner === "top-left") {
    nextRect.x = Math.min(pointer.x, fixedRight - MIN_CARD_WIDTH);
    nextRect.y = Math.min(pointer.y, fixedBottom - MIN_CARD_HEIGHT);
    nextRect.w = fixedRight - nextRect.x;
    nextRect.h = fixedBottom - nextRect.y;
  } else if (corner === "top-right") {
    nextRect.y = Math.min(pointer.y, fixedBottom - MIN_CARD_HEIGHT);
    nextRect.w = Math.max(MIN_CARD_WIDTH, pointer.x - fixedLeft);
    nextRect.h = fixedBottom - nextRect.y;
  } else if (corner === "bottom-right") {
    nextRect.w = Math.max(MIN_CARD_WIDTH, pointer.x - fixedLeft);
    nextRect.h = Math.max(MIN_CARD_HEIGHT, pointer.y - fixedTop);
  } else if (corner === "bottom-left") {
    nextRect.x = Math.min(pointer.x, fixedRight - MIN_CARD_WIDTH);
    nextRect.w = fixedRight - nextRect.x;
    nextRect.h = Math.max(MIN_CARD_HEIGHT, pointer.y - fixedTop);
  }

  setCardWorldRect(resize.cardId, nextRect);
  resolveCardPlacement(resize.cardId, motion);
  requestRender();
}

function finishCardResize() {
  const resize = interaction.resize;
  interaction.mode = null;
  interaction.primaryPointerId = null;
  interaction.resize = null;

  if (!resize || !state.cards[resize.cardId]) {
    requestRender();
    return;
  }

  resolveCardPlacement(resize.cardId, { x: 0, y: 0 });
  scheduleSave();
  requestRender();
}

function startCardScale(event, cardId) {
  const card = state.cards[cardId];
  const cardElement = cardElements.get(cardId);
  const body = cardElement?.querySelector(".card-body");
  if (!card || card.isLabel || !body) {
    return;
  }

  const rect = getWorldRect(cardId);
  interaction.mode = "scale-card";
  interaction.primaryPointerId = event.pointerId;
  capturePointer(event.pointerId);
  interaction.scale = {
    cardId,
    startScreen: { x: event.clientX, y: event.clientY },
    startFontScale: getCardFontScale(card),
    startWidthCap: Math.max(getNoteWidthCap(card), rect.w)
  };

  setSelectedCard(cardId);
  if (document.activeElement === body) {
    body.blur();
    window.getSelection()?.removeAllRanges();
  }
  bringCardForward(cardId);
  requestRender();
}

function updateCardScale(event) {
  const scale = interaction.scale;
  if (!scale) {
    return;
  }

  const card = state.cards[scale.cardId];
  const body = cardElements.get(scale.cardId)?.querySelector(".card-body");
  if (!card || card.isLabel || !body) {
    return;
  }

  const delta =
    event.clientX -
    scale.startScreen.x +
    (event.clientY - scale.startScreen.y);
  const scaleFactor = clamp(
    Math.exp(delta * SIZE_TOOL_SENSITIVITY),
    MIN_NOTE_FONT_SCALE / scale.startFontScale,
    MAX_NOTE_FONT_SCALE / scale.startFontScale
  );

  card.fontScale = clamp(scale.startFontScale * scaleFactor, MIN_NOTE_FONT_SCALE, MAX_NOTE_FONT_SCALE);
  card.widthCap = clamp(
    scale.startWidthCap * scaleFactor,
    MAX_NOTE_CARD_WIDTH,
    MAX_RESIZED_NOTE_WIDTH
  );
  card.fitMinWidth = FIT_CARD_MIN_WIDTH;
  card.fitMinHeight = FIT_CARD_MIN_HEIGHT;

  body.style.setProperty("--card-font-scale", String(getCardFontScale(card)));
  fitCardToText(scale.cardId, body, { preserveCenter: true });
  requestRender();
}

function finishCardScale() {
  const scale = interaction.scale;
  interaction.mode = null;
  interaction.primaryPointerId = null;
  interaction.scale = null;

  if (!scale || !state.cards[scale.cardId]) {
    requestRender();
    return;
  }

  resolveCardPlacement(scale.cardId, { x: 0, y: 0 });
  scheduleSave();
  requestRender();
}

function startBrush(event, cardId) {
  interaction.mode = "brush";
  interaction.primaryPointerId = event.pointerId;
  capturePointer(event.pointerId);
  const start = screenToWorld({ x: event.clientX, y: event.clientY });
  interaction.brush = {
    sourceId: getRootId(cardId),
    points: [start],
    currentPoint: start
  };
  setSelectedCard(cardId);
  requestRender();
}

function updateBrush(event) {
  if (!interaction.brush) {
    return;
  }
  const point = screenToWorld({ x: event.clientX, y: event.clientY });
  interaction.brush.currentPoint = point;
  const last = interaction.brush.points[interaction.brush.points.length - 1];
  if (!last || distanceBetween(last, point) > 24 / state.camera.scale) {
    interaction.brush.points.push(point);
  } else if (interaction.brush.points.length === 1) {
    interaction.brush.points.push(point);
  } else {
    interaction.brush.points[interaction.brush.points.length - 1] = point;
  }
  requestRender();
}

function finishBrush(event) {
  const brush = interaction.brush;
  interaction.mode = null;
  interaction.primaryPointerId = null;
  interaction.brush = null;

  if (!brush) {
    requestRender();
    return;
  }

  const targetElement = document.elementFromPoint(event.clientX, event.clientY)?.closest(".note-card");
  const targetId = targetElement?.dataset.id ? getRootId(targetElement.dataset.id) : null;
  if (
    !targetId ||
    targetId === brush.sourceId ||
    state.cards[targetId]?.isLabel
  ) {
    requestRender();
    return;
  }

  const sharedColor = state.cards[brush.sourceId]?.color || uiState.activeColor;
  applyColorToSubtree(brush.sourceId, sharedColor);
  applyColorToSubtree(targetId, sharedColor);
  upsertConnection(brush.sourceId, targetId, simplifyPathPoints(brush.points), sharedColor);
  pullRootsTogether(brush.sourceId, targetId);
  scheduleSave();
  requestRender();
}

function upsertConnection(fromId, toId, points, color) {
  const pairKey = [fromId, toId].sort().join("::");
  const via = points.slice(1, -1);
  const existing = state.connections.find((connection) => {
    const currentKey = [connection.fromId, connection.toId].sort().join("::");
    return currentKey === pairKey;
  });

  if (existing) {
    existing.fromId = fromId;
    existing.toId = toId;
    existing.color = color;
    existing.via = via;
    return;
  }

  state.connections.push({
    id: `connection-${Date.now()}-${state.connections.length + 1}`,
    fromId,
    toId,
    color,
    via
  });
}

function beginGestureIfNeeded() {
  if (interaction.activeTouches.size < 2) {
    return false;
  }

  const points = Array.from(interaction.activeTouches.values()).slice(0, 2);
  const center = midpoint(points[0], points[1]);
  const distance = Math.max(distanceBetween(points[0], points[1]), 12);
  const anchorWorld = screenToWorld(center);

  interaction.mode = "gesture";
  interaction.primaryPointerId = null;
  interaction.draft = null;
  interaction.pan = null;
  interaction.drag = null;
  interaction.resize = null;
  interaction.scale = null;
  interaction.brush = null;
  dom.draftRect.hidden = true;
  interaction.gesture = {
    startDistance: distance,
    startScale: state.camera.scale,
    anchorWorld
  };
  requestRender();
  return true;
}

function updateGesture() {
  if (!interaction.gesture || interaction.activeTouches.size < 2) {
    return;
  }
  const points = Array.from(interaction.activeTouches.values()).slice(0, 2);
  const center = midpoint(points[0], points[1]);
  const distance = Math.max(distanceBetween(points[0], points[1]), 12);
  const nextScale = clamp(
    interaction.gesture.startScale * (distance / interaction.gesture.startDistance),
    ZOOM_LIMITS.min,
    ZOOM_LIMITS.max
  );
  state.camera.scale = nextScale;
  state.camera.x = center.x - interaction.gesture.anchorWorld.x * nextScale;
  state.camera.y = center.y - interaction.gesture.anchorWorld.y * nextScale;
  scheduleSave();
  requestRender();
}

function trackTouch(event) {
  if (event.pointerType !== "touch") {
    return;
  }
  interaction.activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
}

function untrackTouch(event) {
  if (event.pointerType !== "touch") {
    return;
  }
  interaction.activeTouches.delete(event.pointerId);
}

function capturePointer(pointerId) {
  try {
    dom.viewport.setPointerCapture(pointerId);
  } catch (error) {
    // Pointer capture can fail when the browser has already ended the stream.
  }
}

function cancelActiveInteraction() {
  interaction.mode = null;
  interaction.primaryPointerId = null;
  interaction.draft = null;
  interaction.pan = null;
  interaction.drag = null;
  interaction.resize = null;
  interaction.scale = null;
  interaction.brush = null;
  interaction.gesture = null;
  dom.draftRect.hidden = true;
  requestRender();
}

function createCard(rect) {
  const id = `card-${state.nextId++}`;
  const color = nextCardColor();
  uiState.activeColor = color;

  state.cards[id] = {
    id,
    parentId: null,
    x: rect.x,
    y: rect.y,
    w: clamp(rect.w, MIN_CARD_WIDTH, MAX_NOTE_CARD_WIDTH),
    h: rect.h,
    color,
    isLabel: false,
    labelRootId: null,
    collapsed: false,
    widthCap: MAX_NOTE_CARD_WIDTH,
    fontScale: 1,
    fontWeight: "400",
    fontStyle: "normal",
    textDecoration: "none",
    textAlign: "left",
    fitMinWidth: FIT_CARD_MIN_WIDTH,
    fitMinHeight: FIT_CARD_MIN_HEIGHT,
    text: "",
    createdAt: new Date().toISOString(),
    order: state.nextOrder++
  };

  return id;
}

function nextCardColor() {
  if (!Array.isArray(state.colorDeck) || state.colorDeck.length === 0) {
    state.colorDeck = createColorDeck();
    state.nextColorIndex = 0;
  }
  if (state.nextColorIndex >= state.colorDeck.length) {
    state.colorDeck = createColorDeck();
    state.nextColorIndex = 0;
  }
  const swatch = state.colorDeck[state.nextColorIndex];
  state.nextColorIndex += 1;
  return swatch;
}

function bringCardForward(cardId) {
  const card = state.cards[cardId];
  if (!card) {
    return;
  }
  card.order = state.nextOrder++;
}

function setCardWorldPosition(cardId, worldX, worldY) {
  const card = state.cards[cardId];
  if (!card) {
    return;
  }
  const parentRect = card.parentId ? getWorldRect(card.parentId) : { x: 0, y: 0 };
  card.x = worldX - parentRect.x;
  card.y = worldY - parentRect.y;
}

function moveCardBy(cardId, deltaX, deltaY) {
  const rect = getWorldRect(cardId);
  setCardWorldPosition(cardId, rect.x + deltaX, rect.y + deltaY);
}

function setCardWorldRect(cardId, rect) {
  const card = state.cards[cardId];
  if (!card) {
    return;
  }
  const parentRect = card.parentId ? getWorldRect(card.parentId) : { x: 0, y: 0 };
  card.x = rect.x - parentRect.x;
  card.y = rect.y - parentRect.y;
  card.w = clamp(
    rect.w,
    MIN_CARD_WIDTH,
    card.isLabel ? MAX_LABEL_CARD_WIDTH : getNoteWidthCap(card)
  );
  card.h = Math.max(MIN_CARD_HEIGHT, rect.h);
}

function reparentCard(cardId, newParentId) {
  const card = state.cards[cardId];
  if (!card) {
    return;
  }

  if (newParentId && (newParentId === cardId || isDescendant(newParentId, cardId))) {
    return;
  }

  const rect = getWorldRect(cardId);
  const parentRect = newParentId ? getWorldRect(newParentId) : { x: 0, y: 0 };
  card.parentId = newParentId;
  card.x = rect.x - parentRect.x;
  card.y = rect.y - parentRect.y;
}

function rectsOverlapWithGap(leftRect, rightRect, gap = 0) {
  return !(
    leftRect.x + leftRect.w + gap <= rightRect.x ||
    rightRect.x + rightRect.w + gap <= leftRect.x ||
    leftRect.y + leftRect.h + gap <= rightRect.y ||
    rightRect.y + rightRect.h + gap <= leftRect.y
  );
}

function resolveSiblingCollisions(anchorId, motion = { x: 0, y: 0 }, parentId = state.cards[anchorId]?.parentId || null) {
  if (!state.cards[anchorId]) {
    return;
  }

  const queue = [anchorId];
  let safety = 0;
  while (queue.length > 0 && safety < 240) {
    safety += 1;
    const currentId = queue.shift();
    if (!state.cards[currentId]) {
      continue;
    }

    const siblings = Object.values(state.cards).filter((card) => {
      if (card.id === currentId || card.parentId !== parentId) {
        return false;
      }
      if (isDescendant(card.id, currentId) || isDescendant(currentId, card.id)) {
        return false;
      }
      return true;
    });

    let movedCurrent = false;
    for (const sibling of siblings) {
      const currentBounds = getLayoutBounds(currentId);
      const siblingBounds = getLayoutBounds(sibling.id);
      if (!rectsOverlapWithGap(currentBounds, siblingBounds, CARD_GAP)) {
        continue;
      }

      const shift = getCollisionShift(currentBounds, siblingBounds, motion);
      moveCardBy(sibling.id, shift.x, shift.y);
      queue.push(sibling.id);
    }

    if (movedCurrent) {
      queue.push(currentId);
    }
  }
}

function resolveCardPlacement(cardId, motion = { x: 0, y: 0 }) {
  if (!state.cards[cardId]) {
    return;
  }

  resolveSiblingCollisions(cardId, motion);

  const rootId = getRootId(cardId);
  if (rootId !== cardId) {
    resolveSiblingCollisions(rootId, motion, null);
  }
}

function pullRootsTogether(sourceId, targetId) {
  if (sourceId === targetId || !state.cards[sourceId] || !state.cards[targetId]) {
    return;
  }
  const anchorId = sourceId;
  const moveId = targetId;

  const gap = 28;
  const anchorRect = getSubtreeBounds(anchorId);
  const movingRect = getSubtreeBounds(moveId);
  const sourceCenter = cardCenter(anchorRect);
  const targetCenter = cardCenter(movingRect);
  const deltaX = targetCenter.x - sourceCenter.x;
  const deltaY = targetCenter.y - sourceCenter.y;

  let nextX = movingRect.x;
  let nextY = movingRect.y;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    nextX = deltaX >= 0 ? anchorRect.x + anchorRect.w + gap : anchorRect.x - movingRect.w - gap;
    nextY = anchorRect.y + (anchorRect.h - movingRect.h) / 2;
  } else {
    nextY = deltaY >= 0 ? anchorRect.y + anchorRect.h + gap : anchorRect.y - movingRect.h - gap;
    nextX = anchorRect.x + (anchorRect.w - movingRect.w) / 2;
  }

  setCardWorldPosition(moveId, nextX, nextY);
  shiftConnectionPathsForMovedRoots([moveId], nextX - movingRect.x, nextY - movingRect.y);
  resolveCardPlacement(moveId, {
    x: nextX - movingRect.x,
    y: nextY - movingRect.y
  });
}

function shiftConnectionPathsForMovedRoots(cardIds, deltaX, deltaY) {
  if ((!deltaX && !deltaY) || !Array.isArray(cardIds) || cardIds.length === 0) {
    return;
  }

  const movedRootIds = new Set(
    cardIds.filter((cardId) => {
      const card = state.cards[cardId];
      return !!card && !card.isLabel && !card.parentId;
    })
  );
  if (movedRootIds.size === 0) {
    return;
  }

  state.connections.forEach((connection) => {
    if (!movedRootIds.has(connection.fromId) && !movedRootIds.has(connection.toId)) {
      return;
    }
    connection.via = connection.via.map((point) => ({
      x: point.x + deltaX,
      y: point.y + deltaY
    }));
  });
}

function applyColorToSubtree(cardId, color) {
  const ids = [cardId, ...getDescendants(cardId)];
  ids.forEach((id) => {
    const card = state.cards[id];
    if (card) {
      card.color = color;
    }
  });
}

function setBoardBackgroundColor(color) {
  if (!isHex(color)) {
    return;
  }
  state.backgroundColor = color;
}

function getDescendants(cardId) {
  const results = [];
  const stack = [cardId];
  while (stack.length > 0) {
    const current = stack.pop();
    Object.values(state.cards).forEach((card) => {
      if (card.parentId === current) {
        results.push(card.id);
        stack.push(card.id);
      }
    });
  }
  return results;
}

function isDescendant(cardId, possibleAncestorId) {
  let currentId = state.cards[cardId]?.parentId || null;
  while (currentId) {
    if (currentId === possibleAncestorId) {
      return true;
    }
    currentId = state.cards[currentId]?.parentId || null;
  }
  return false;
}

function getRootId(cardId) {
  let currentId = cardId;
  while (state.cards[currentId]?.parentId) {
    currentId = state.cards[currentId].parentId;
  }
  return currentId;
}

function getDepth(cardId) {
  let depth = 0;
  let current = state.cards[cardId];
  while (current?.parentId) {
    depth += 1;
    current = state.cards[current.parentId];
  }
  return depth;
}

function getWorldRect(cardId) {
  const card = state.cards[cardId];
  if (!card) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  let x = card.x;
  let y = card.y;
  let currentParentId = card.parentId;
  while (currentParentId) {
    const parent = state.cards[currentParentId];
    if (!parent) {
      break;
    }
    x += parent.x;
    y += parent.y;
    currentParentId = parent.parentId;
  }

  return { x, y, w: card.w, h: card.h };
}

function centerBoardView() {
  const bounds = getCenterViewBounds();
  const focusRect = getCanvasFocusRect();
  if (!bounds || bounds.w <= 0 || bounds.h <= 0 || focusRect.width <= 0 || focusRect.height <= 0) {
    Object.assign(state.camera, defaultCamera());
    scheduleSave();
    requestRender();
    return;
  }

  const framingPadding = 40;
  const availableWidth = Math.max(120, focusRect.width - framingPadding * 2);
  const availableHeight = Math.max(120, focusRect.height - framingPadding * 2);
  const fitScale = Math.min(availableWidth / bounds.w, availableHeight / bounds.h);
  const nextScale = clamp(Math.min(fitScale, 1.35), ZOOM_LIMITS.min, ZOOM_LIMITS.max);
  const focusX = focusRect.left + focusRect.width / 2;
  const focusY = focusRect.top + focusRect.height / 2;

  state.camera.scale = nextScale;
  state.camera.x = focusX - (bounds.x + bounds.w / 2) * nextScale;
  state.camera.y = focusY - (bounds.y + bounds.h / 2) * nextScale;
  scheduleSave();
  requestRender();
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    } else {
      showToast("Fullscreen is not available in this browser");
    }
  } catch (error) {
    console.warn("Could not change fullscreen mode.", error);
    showToast("Fullscreen could not be opened");
  }
}

function syncFullscreenButton() {
  const active = !!document.fullscreenElement;
  dom.fullscreenButton.textContent = active ? "Exit full screen" : "Fullscreen";
  dom.fullscreenButton.setAttribute("aria-pressed", active ? "true" : "false");
  requestRender();
}

function openResetModal() {
  closeDeleteModal({ skipRender: true });
  closeSaveModal();
  closeLabelModal();
  applyPopupTheme(dom.resetModal);
  dom.resetModal.hidden = false;
  dom.resetConfirmButton.focus();
}

function openInfoModal() {
  closeDeleteModal({ skipRender: true });
  closeResetModal();
  closeSaveModal();
  closeLabelModal();
  applyPopupTheme(dom.infoModal);
  dom.infoModal.hidden = false;
  dom.infoCloseButton.focus();
}

function openTitleModal() {
  closeDeleteModal({ skipRender: true });
  closeResetModal();
  closeSaveModal();
  closeLabelModal();
  closeInfoModal();
  applyPopupTheme(dom.titleModal);
  dom.titleInput.value = state.title || "";
  dom.titleModal.hidden = false;
  dom.titleInput.focus();
  dom.titleInput.select();
}

function closeTitleModal() {
  const wasOpen = !dom.titleModal.hidden;
  dom.titleModal.hidden = true;
  if (wasOpen) {
    dom.titleButton.focus({ preventScroll: true });
  }
}

function handleTitleModalClick(event) {
  if (event.target === dom.titleModal) {
    closeTitleModal();
  }
}

function handleTitleSubmit(event) {
  event.preventDefault();
  state.title = normalizeBoardTitle(dom.titleInput.value);
  dom.boardTitleInput.value = state.title;
  syncPageTitle();
  saveNow();
  closeTitleModal();
  requestRender();
  showToast(state.title ? "Page title updated" : "Page title cleared");
}

function closeInfoModal() {
  const wasOpen = !dom.infoModal.hidden;
  dom.infoModal.hidden = true;
  if (wasOpen) {
    dom.infoButton.focus({ preventScroll: true });
  }
}

function handleInfoModalClick(event) {
  if (event.target === dom.infoModal) {
    closeInfoModal();
  }
}

function closeResetModal() {
  const wasOpen = !dom.resetModal.hidden;
  dom.resetModal.hidden = true;
  if (wasOpen) {
    dom.resetView.focus({ preventScroll: true });
  }
}

function handleResetModalClick(event) {
  if (event.target === dom.resetModal) {
    closeResetModal();
  }
}

function openSaveModal() {
  closeDeleteModal({ skipRender: true });
  closeResetModal();
  closeLabelModal();
  applyPopupTheme(dom.saveModal);
  dom.boardTitleInput.value = state.title || "";
  dom.saveModal.hidden = false;
  dom.boardTitleInput.focus();
  dom.boardTitleInput.select();
}

function handleBoardTitleInput() {
  state.title = normalizeBoardTitle(dom.boardTitleInput.value);
  syncPageTitle();
  scheduleSave();
}

function closeSaveModal() {
  const wasOpen = !dom.saveModal.hidden;
  dom.saveModal.hidden = true;
  if (wasOpen) {
    dom.saveBoard.focus({ preventScroll: true });
  }
}

function handleSaveModalClick(event) {
  if (event.target === dom.saveModal) {
    closeSaveModal();
  }
}

function wipeBoard() {
  const snapshot = serializeStateSnapshot();
  closeResetModal();
  closeDeleteModal({ skipRender: true });
  closeSaveModal();
  closeLabelModal();
  state = createEmptyState();
  uiState.selectedCardId = null;
  uiState.pendingLabelRootId = null;
  uiState.pendingDeleteCardId = null;
  uiState.pendingFocusCardId = null;
  pendingGlobalCardRefit = false;
  cancelActiveInteraction();
  localStorage.removeItem(STORAGE_KEY);
  requestRender();
  showToast("Board reset", { snapshot, actionLabel: "Undo" });
}

function buildExportStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function getBoardTitle() {
  return normalizeBoardTitle(state.title) || "Untitled board";
}

function getExportBaseName() {
  const slug = getBoardTitle()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "brainstorm-board";
}

function serializeStateSnapshot() {
  return JSON.parse(JSON.stringify(state));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function exportBoardAsCode() {
  closeSaveModal();
  const blob = new Blob([JSON.stringify(serializeStateSnapshot(), null, 2)], {
    type: "application/json"
  });
  downloadBlob(blob, `${getExportBaseName()}-${buildExportStamp()}.json`);
  showToast("Code backup downloaded");
}

function exportBoardAsText() {
  closeSaveModal();
  const sections = buildTextExportSections();
  const content = [getBoardTitle(), ...sections].join("\n\n\n").trim();
  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8"
  });
  downloadBlob(blob, `${getExportBaseName()}-${buildExportStamp()}.txt`);
  showToast("Text file downloaded");
}

async function exportBoardAsImage() {
  closeSaveModal();
  const scene = getExportSceneData();
  const canvas = renderBoardExportCanvas(scene);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) {
    window.alert("The board image could not be saved.");
    return;
  }
  downloadBlob(blob, `${getExportBaseName()}-${buildExportStamp()}.png`);
  showToast("Image downloaded");
}

function handleImportButtonClick() {
  closeResetModal();
  closeDeleteModal({ skipRender: true });
  closeSaveModal();
  closeLabelModal();
  dom.importFileInput.value = "";
  dom.importFileInput.click();
}

async function handleImportFileChange(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) {
    return;
  }

  try {
    const parsed = JSON.parse(await file.text());
    state = normalizeStateSnapshot(parsed);
    uiState.selectedCardId = null;
    uiState.pendingLabelRootId = null;
    uiState.pendingDeleteCardId = null;
    uiState.pendingFocusCardId = null;
    pendingGlobalCardRefit = true;
    cancelActiveInteraction();
    saveNow();
    requestRender();
    showToast("Board restored from backup");
  } catch (error) {
    console.warn("Could not import board file.", error);
    window.alert("That file could not be imported.");
  }
}

function shouldPanFromEvent(event) {
  return isSpacePressed || event.button === 1;
}

function zoomAtPoint(factor, screenPoint) {
  const before = screenToWorld(screenPoint);
  const nextScale = clamp(state.camera.scale * factor, ZOOM_LIMITS.min, ZOOM_LIMITS.max);
  state.camera.scale = nextScale;
  state.camera.x = screenPoint.x - before.x * nextScale;
  state.camera.y = screenPoint.y - before.y * nextScale;
}

function requestRender() {
  if (renderQueued) {
    return;
  }
  renderQueued = true;
  window.requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function render() {
  syncPageTitle();
  syncBoardTheme();
  applyToolState();
  syncPalette();
  syncPaletteSizing();
  syncPaletteVisibility();
  dom.scene.style.transform = `translate(${state.camera.x}px, ${state.camera.y}px) scale(${state.camera.scale})`;
  syncCards();
  renderConnections();
  renderBrushPreview();
  focusPendingCard();
}

function syncPageTitle() {
  document.title = state.title ? `${state.title} — Brainstorm Canvas` : "Brainstorm Canvas";
  dom.titleButton.textContent = state.title || "Title";
  dom.titleButton.title = state.title ? `Edit title: ${state.title}` : "Add page title";
}

function syncCards() {
  const orderedCards = Object.values(state.cards)
    .filter((card) => !isHiddenByCollapsedAncestor(card.id) || isHiddenByCollapsedLabel(card.id))
    .sort((left, right) => {
    const depthDiff = getDepth(left.id) - getDepth(right.id);
    if (depthDiff !== 0) {
      return depthDiff;
    }
    return left.order - right.order;
    });

  const existingIds = new Set(orderedCards.map((card) => card.id));
  cardElements.forEach((element, id) => {
    if (!existingIds.has(id)) {
      element.remove();
      cardElements.delete(id);
    }
  });

  let resizedLabelCard = false;
  let refitPendingNotes = false;
  orderedCards.forEach((card) => {
    const displayFill = isHex(card.color)
      ? card.color
      : card.isLabel
        ? LABEL_CARD_FILL
        : PALETTE[0].fill;
    const hiddenByLabel = isHiddenByCollapsedLabel(card.id);
    let element = cardElements.get(card.id);
    if (!element) {
      element = createCardElement(card.id);
      cardElements.set(card.id, element);
      dom.cardsLayer.appendChild(element);
    }

    const selected = card.id === uiState.selectedCardId;
    element.classList.toggle("is-selected", selected);
    element.classList.toggle("is-label", !!card.isLabel);
    element.classList.toggle("is-collapsed", !!card.collapsed);
    element.style.zIndex = String(100 + getDepth(card.id) * 1000 + card.order);
    element.style.opacity = hiddenByLabel ? "0" : "1";
    element.style.pointerEvents = hiddenByLabel ? "none" : "";
    element.style.transform = hiddenByLabel ? getCardCollapseTransform(card.id) : "";
    element.style.setProperty("--card-fill", displayFill);
    element.style.setProperty("--card-border", hexToRgba(displayFill, 0.18));
    const displayInk = hasReadableBlackText(displayFill) ? NOTE_CARD_INK : getReadableInk(displayFill);
    element.style.setProperty("--card-ink", displayInk);
    element.style.setProperty("--card-placeholder", hexToRgba(displayInk, 0.48));
    element.style.setProperty("--card-rule", hexToRgba(displayInk, 0.22));

    const body = element.querySelector(".card-body");
    const displayText = card.isLabel ? normalizeLabelText(card.text) : card.text;
    if (document.activeElement !== body && body.innerText !== displayText) {
      body.innerText = displayText;
    }
    body.style.setProperty("--card-font-scale", String(getCardFontScale(card)));
    applyCardTextFormatting(body, card);
    body.dataset.placeholder = card.isLabel ? "Group title" : "Type an idea…";
    body.contentEditable = card.isLabel ? "false" : "true";
    body.setAttribute("role", card.isLabel ? "button" : "textbox");
    body.setAttribute("aria-multiline", card.isLabel ? "false" : "true");
    body.setAttribute("aria-label", card.isLabel ? `${displayText || "Untitled"} group` : "Note text");
    if (pendingGlobalCardRefit && !card.isLabel && document.activeElement !== body) {
      const previousRect = getWorldRect(card.id);
      fitCardToText(card.id, body);
      const nextRect = getWorldRect(card.id);
      if (
        previousRect.x !== nextRect.x ||
        previousRect.y !== nextRect.y ||
        previousRect.w !== nextRect.w ||
        previousRect.h !== nextRect.h
      ) {
        refitPendingNotes = true;
      }
    }
    if (card.isLabel && fitLabelCardToText(card.id, body)) {
      resizedLabelCard = true;
    }

    const rect = getWorldRect(card.id);
    element.style.left = `${rect.x}px`;
    element.style.top = `${rect.y}px`;
    element.style.width = `${card.w}px`;
    element.style.height = `${card.h}px`;
  });

  if (pendingGlobalCardRefit) {
    pendingGlobalCardRefit = false;
  }

  if (resizedLabelCard || refitPendingNotes) {
    scheduleSave();
    requestRender();
  }
}

function createCardElement(cardId) {
  const element = document.createElement("article");
  element.className = "note-card";
  element.dataset.id = cardId;

  ["top", "right", "bottom", "left"].forEach((edge) => {
    const grip = document.createElement("button");
    grip.type = "button";
    grip.className = `card-grip card-grip--${edge}`;
    grip.setAttribute("aria-label", "Move note");
    element.appendChild(grip);
  });

  ["top-left", "top-right", "bottom-right", "bottom-left"].forEach((corner) => {
    const grip = document.createElement("button");
    grip.type = "button";
    grip.className = `card-grip card-grip--corner card-grip--${corner}`;
    grip.dataset.corner = corner;
    grip.setAttribute("aria-label", "Resize note");
    element.appendChild(grip);
  });

  const body = document.createElement("div");
  body.className = "card-body";
  body.contentEditable = "true";
  body.spellcheck = true;
  body.dataset.placeholder = "";
  body.setAttribute("role", "textbox");
  body.setAttribute("aria-multiline", "true");

  element.appendChild(body);
  return element;
}

function showToast(message, options = {}) {
  window.clearTimeout(toastTimer);
  undoSnapshot = options.snapshot || null;
  dom.toastMessage.textContent = message;
  dom.toastAction.textContent = options.actionLabel || "Undo";
  dom.toastAction.hidden = !undoSnapshot;
  dom.toast.hidden = false;
  toastTimer = window.setTimeout(hideToast, undoSnapshot ? 10000 : 4200);
}

function hideToast() {
  window.clearTimeout(toastTimer);
  toastTimer = 0;
  undoSnapshot = null;
  dom.toast.hidden = true;
  dom.toastAction.hidden = true;
}

function restoreUndoSnapshot() {
  if (!undoSnapshot) {
    hideToast();
    return;
  }
  const snapshot = undoSnapshot;
  hideToast();
  dom.viewport.focus({ preventScroll: true });
  state = normalizeStateSnapshot(snapshot);
  uiState.selectedCardId = null;
  uiState.pendingLabelRootId = null;
  uiState.pendingDeleteCardId = null;
  uiState.pendingFocusCardId = null;
  pendingGlobalCardRefit = true;
  cancelActiveInteraction();
  saveNow();
  requestRender();
  showToast("Restored");
}

function renderConnections() {
  const width = dom.viewport.clientWidth;
  const height = dom.viewport.clientHeight;
  dom.connectionsLayer.setAttribute("viewBox", `0 0 ${width} ${height}`);
  dom.connectionsLayer.setAttribute("width", `${width}`);
  dom.connectionsLayer.setAttribute("height", `${height}`);

  const fragments = state.connections
    .map((connection) => {
      const fromId = state.cards[connection.fromId] ? getRootId(connection.fromId) : null;
      const toId = state.cards[connection.toId] ? getRootId(connection.toId) : null;
      if (
        !fromId ||
        !toId ||
        fromId === toId ||
        state.cards[fromId]?.isLabel ||
        state.cards[toId]?.isLabel ||
        isHiddenByCollapsedAncestor(fromId) ||
        isHiddenByCollapsedAncestor(toId)
      ) {
        return "";
      }

      const fromRect = getWorldRect(fromId);
      const toRect = getWorldRect(toId);
      const points = [
        worldToScreen(cardCenter(fromRect)),
        ...connection.via.map(worldToScreen),
        worldToScreen(cardCenter(toRect))
      ];
      const path = buildSmoothPath(points);
      const stroke = hexToRgba(getPaletteSwatch(connection.color).ink, 0.5);
      return `<path class="connection-path" d="${path}" stroke="${stroke}"></path>`;
    })
    .join("");

  dom.connectionsLayer.innerHTML = fragments;
}

function renderBrushPreview() {
  const width = dom.viewport.clientWidth;
  const height = dom.viewport.clientHeight;
  dom.overlayLayer.setAttribute("viewBox", `0 0 ${width} ${height}`);
  dom.overlayLayer.setAttribute("width", `${width}`);
  dom.overlayLayer.setAttribute("height", `${height}`);

  if (!interaction.brush) {
    dom.overlayLayer.innerHTML = "";
    return;
  }

  const previewPoints = interaction.brush.points.slice();
  const currentPoint = interaction.brush.currentPoint;
  if (currentPoint && previewPoints.length < 2) {
    previewPoints.push(currentPoint);
  } else if (
    currentPoint &&
    previewPoints.length > 0 &&
    distanceBetween(previewPoints[previewPoints.length - 1], currentPoint) > 1 / state.camera.scale
  ) {
    previewPoints.push(currentPoint);
  }

  if (previewPoints.length < 2) {
    dom.overlayLayer.innerHTML = "";
    return;
  }

  const path = buildSmoothPath(previewPoints.map(worldToScreen));
  dom.overlayLayer.innerHTML = `<path class="connection-preview" d="${path}"></path>`;
}

function getOrderedExportCards() {
  return Object.values(state.cards).sort((left, right) => {
    const depthDiff = getDepth(left.id) - getDepth(right.id);
    if (depthDiff !== 0) {
      return depthDiff;
    }
    return left.order - right.order;
  });
}

function getCardExportText(card) {
  if (!card) {
    return "";
  }
  const rawText = card.isLabel ? normalizeLabelText(card.text) : card.text;
  return rawText.replace(/\u00a0/g, " ").trim();
}

function getLabelExportNoteIds(labelId) {
  const memberRootIds = getLabelMemberRootIds(labelId);
  if (memberRootIds.length === 0) {
    return [];
  }

  return uniqueExistingCardIds(
    memberRootIds.flatMap((rootId) => [rootId, ...getDescendants(rootId)])
  ).filter((cardId) => !state.cards[cardId]?.isLabel);
}

function buildTextExportSections() {
  const orderedCards = getOrderedExportCards();
  const orderedNotes = orderedCards.filter((card) => !card.isLabel);
  const orderedNoteIds = orderedNotes.map((card) => card.id);
  const groupedNoteIds = new Set();
  const sections = [];

  orderedCards
    .filter((card) => card.isLabel)
    .forEach((labelCard) => {
      const labelText = getCardExportText(labelCard);
      const memberIdSet = new Set(getLabelExportNoteIds(labelCard.id));
      if (!labelText && memberIdSet.size === 0) {
        return;
      }

      const paragraphs = orderedNoteIds
        .filter((cardId) => memberIdSet.has(cardId))
        .map((cardId) => getCardExportText(state.cards[cardId]))
        .filter(Boolean);

      orderedNoteIds.forEach((cardId) => {
        if (memberIdSet.has(cardId)) {
          groupedNoteIds.add(cardId);
        }
      });

      const sectionParts = [labelText, ...paragraphs].filter(Boolean);
      if (sectionParts.length > 0) {
        sections.push(sectionParts.join("\n\n"));
      }
    });

  const ungroupedParagraphs = orderedNotes
    .filter((card) => !groupedNoteIds.has(card.id))
    .map((card) => getCardExportText(card))
    .filter(Boolean);

  if (ungroupedParagraphs.length > 0) {
    sections.push(ungroupedParagraphs.join("\n\n"));
  }

  return sections;
}

function getExportSceneData() {
  const { orderedCards, visibleConnections, bounds } = getVisibleSceneData();
  return { orderedCards, visibleConnections, bounds };
}

function getVisibleSceneData() {
  const orderedCards = getOrderedExportCards()
    .filter((card) => !isHiddenByCollapsedAncestor(card.id))
    .map((card) => ({ card, rect: getWorldRect(card.id) }));

  const visibleConnections = state.connections
    .map((connection) => {
      const fromId = state.cards[connection.fromId] ? getRootId(connection.fromId) : null;
      const toId = state.cards[connection.toId] ? getRootId(connection.toId) : null;
      if (
        !fromId ||
        !toId ||
        fromId === toId ||
        state.cards[fromId]?.isLabel ||
        state.cards[toId]?.isLabel ||
        isHiddenByCollapsedAncestor(fromId) ||
        isHiddenByCollapsedAncestor(toId)
      ) {
        return null;
      }

      return {
        color: connection.color,
        points: [
          cardCenter(getWorldRect(fromId)),
          ...connection.via.map((point) => ({ x: point.x, y: point.y })),
          cardCenter(getWorldRect(toId))
        ]
      };
    })
    .filter(Boolean);

  const xs = [];
  const ys = [];
  orderedCards.forEach(({ rect }) => {
    xs.push(rect.x, rect.x + rect.w);
    ys.push(rect.y, rect.y + rect.h);
  });
  visibleConnections.forEach((connection) => {
    connection.points.forEach((point) => {
      xs.push(point.x);
      ys.push(point.y);
    });
  });

  const bounds =
    xs.length > 0 && ys.length > 0
      ? {
          x: Math.min(...xs),
          y: Math.min(...ys),
          w: Math.max(...xs) - Math.min(...xs),
          h: Math.max(...ys) - Math.min(...ys)
        }
      : {
          x: -320,
          y: -220,
          w: 640,
          h: 440
        };

  return { orderedCards, visibleConnections, bounds };
}

function getCenterViewBounds() {
  const visibleCards = Object.values(state.cards).filter((card) => !isHiddenByCollapsedAncestor(card.id));
  if (visibleCards.length === 0) {
    return null;
  }

  return getVisibleSceneData().bounds;
}

function renderBoardExportCanvas(scene) {
  const sceneWidth = Math.max(scene.bounds.w + EXPORT_PADDING * 2, 720);
  const sceneHeight = Math.max(scene.bounds.h + EXPORT_PADDING * 2, 460);
  const maxDimension = 7200;
  const renderScale = clamp(maxDimension / Math.max(sceneWidth, sceneHeight), 0.35, 2);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(sceneWidth * renderScale);
  canvas.height = Math.ceil(sceneHeight * renderScale);

  const ctx = canvas.getContext("2d");
  const pageFill = getComputedStyle(document.body).backgroundColor || "#fbfaf6";
  ctx.scale(renderScale, renderScale);
  ctx.fillStyle = pageFill;
  ctx.fillRect(0, 0, sceneWidth, sceneHeight);
  ctx.translate(EXPORT_PADDING - scene.bounds.x, EXPORT_PADDING - scene.bounds.y);

  scene.visibleConnections.forEach((connection) => {
    ctx.save();
    ctx.beginPath();
    traceSmoothCanvasPath(ctx, connection.points);
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = hexToRgba(getPaletteSwatch(connection.color).ink, 0.5);
    ctx.stroke();
    ctx.restore();
  });

  scene.orderedCards.forEach(({ card, rect }) => {
    drawExportCard(ctx, card, rect);
  });

  return canvas;
}

function traceSmoothCanvasPath(ctx, points) {
  if (points.length === 0) {
    return;
  }

  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 1) {
    return;
  }
  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }

  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    ctx.quadraticCurveTo(current.x, current.y, midX, midY);
  }

  const last = points[points.length - 1];
  ctx.quadraticCurveTo(last.x, last.y, last.x, last.y);
}

function drawExportCard(ctx, card, rect) {
  const displayFill = isHex(card.color)
    ? card.color
    : card.isLabel
      ? LABEL_CARD_FILL
      : PALETTE[0].fill;
  const ink = hasReadableBlackText(displayFill) ? NOTE_CARD_INK : getReadableInk(displayFill);
  const displayText = card.isLabel ? normalizeLabelText(card.text) : card.text;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.03)";
  ctx.shadowBlur = 1;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = displayFill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = displayFill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = ink;
  const exportFontSize = card.isLabel ? 28 : 20 * getCardFontScale(card);
  ctx.font = card.isLabel
    ? `italic 650 28px Georgia, "Times New Roman", serif`
    : `400 ${exportFontSize}px Georgia, "Times New Roman", serif`;
  ctx.textBaseline = "top";
  drawExportCardText(
    ctx,
    displayText,
    rect.x + CARD_TEXT_INSET_X,
    rect.y + CARD_TEXT_INSET_Y,
    rect.w - CARD_TEXT_INSET_X * 2,
    rect.h - CARD_TEXT_INSET_Y * 2,
    card.isLabel,
    exportFontSize
  );
  ctx.restore();
}

function drawExportCardText(ctx, text, x, y, maxWidth, maxHeight, singleLine = false, fontSize = 18) {
  const lineHeight = singleLine ? 34 : fontSize * 1.24;
  const maxLines = singleLine ? 1 : Math.max(1, Math.floor(maxHeight / lineHeight));
  const lines = wrapTextLinesForCanvas(ctx, text, maxWidth, maxLines);

  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight, maxWidth);
  });
}

function wrapTextLinesForCanvas(ctx, text, maxWidth, maxLines) {
  const source = text.replace(/\u00a0/g, " ").replace(/\r/g, "").trim();
  if (!source) {
    return [];
  }

  const rawLines = source.split("\n");
  const lines = [];
  let truncated = false;

  for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex += 1) {
    const rawLine = rawLines[lineIndex].trim();
    if (!rawLine) {
      continue;
    }

    const words = rawLine.split(/\s+/).map((word) => fitTextWithEllipsis(ctx, word, maxWidth));
    let current = "";
    for (let index = 0; index < words.length; index += 1) {
      const word = words[index];
      const candidate = current ? `${current} ${word}` : word;
      if (!current || ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
        continue;
      }

      lines.push(current);
      if (lines.length >= maxLines) {
        truncated = true;
        break;
      }
      current = word;
    }

    if (truncated) {
      break;
    }

    if (current) {
      lines.push(current);
      if (lines.length >= maxLines && lineIndex < rawLines.length - 1) {
        truncated = true;
        break;
      }
    }

    if (lines.length >= maxLines && lineIndex < rawLines.length - 1) {
      truncated = true;
      break;
    }
  }

  const trimmed = lines.slice(0, maxLines);
  if (truncated && trimmed.length > 0) {
    trimmed[trimmed.length - 1] = fitTextWithEllipsis(
      ctx,
      `${trimmed[trimmed.length - 1]}…`,
      maxWidth
    );
  }
  return trimmed;
}

function fitTextWithEllipsis(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed.trimEnd()}…`;
}

function focusPendingCard() {
  if (!uiState.pendingFocusCardId) {
    return;
  }
  const element = cardElements.get(uiState.pendingFocusCardId);
  const body = element?.querySelector(".card-body");
  if (!body) {
    return;
  }
  uiState.pendingFocusCardId = null;
  body.focus();
}

function cardCenter(rect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

function buildSmoothPath(points) {
  if (points.length === 0) {
    return "";
  }
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  path += ` T ${last.x} ${last.y}`;
  return path;
}

function simplifyPathPoints(points) {
  if (points.length <= 3) {
    return points.slice();
  }

  const simplified = [points[0]];
  const stride = Math.max(1, Math.floor(points.length / 12));
  for (let index = stride; index < points.length - 1; index += stride) {
    simplified.push(points[index]);
  }
  simplified.push(points[points.length - 1]);
  return simplified;
}

function screenToWorld(point) {
  return {
    x: (point.x - state.camera.x) / state.camera.scale,
    y: (point.y - state.camera.y) / state.camera.scale
  };
}

function worldToScreen(point) {
  return {
    x: point.x * state.camera.scale + state.camera.x,
    y: point.y * state.camera.scale + state.camera.y
  };
}

function normalizeRect(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    w: Math.abs(end.x - start.x),
    h: Math.abs(end.y - start.y)
  };
}

function distanceBetween(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function midpoint(left, right) {
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback) {
  return isFiniteNumber(value) ? Number(value) : fallback;
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function isHex(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function getPaletteSwatch(fill) {
  const match = PALETTE.find((swatch) => swatch.fill.toLowerCase() === fill.toLowerCase());
  return match || {
    name: "Custom",
    fill,
    ink: getReadableInk(fill)
  };
}

function getReadableInk(fill) {
  if (!isHex(fill)) {
    return DEFAULT_DARK_INK;
  }

  const { r, g, b } = hexToRgb(fill);
  const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  return luminance > 0.62 ? DEFAULT_DARK_INK : DEFAULT_LIGHT_INK;
}

function contrastRatioWithBlack(fill) {
  if (!isHex(fill)) {
    return Infinity;
  }

  const { r, g, b } = hexToRgb(fill);
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  return (luminance + 0.05) / 0.05;
}

function hasReadableBlackText(fill) {
  return contrastRatioWithBlack(fill) >= MIN_BLACK_TEXT_CONTRAST;
}

function isDarkColor(fill) {
  return getReadableInk(fill) === DEFAULT_LIGHT_INK;
}

function syncBoardTheme() {
  const paper = isHex(state.backgroundColor) ? state.backgroundColor : DEFAULT_BACKGROUND_COLOR;
  const ink = getReadableInk(paper);
  const paperBright = adjustColor(paper, isDarkColor(paper) ? 0.18 : 0.42);
  const root = document.documentElement;

  root.style.setProperty("--paper", paper);
  root.style.setProperty("--paper-bright", paperBright);
  root.style.setProperty("--ink", ink);
  root.style.setProperty("--ink-soft", hexToRgba(ink, 0.72));
  root.style.setProperty("--rule", hexToRgba(ink, 0.18));
  root.style.setProperty("--rule-strong", hexToRgba(ink, 0.72));
  root.style.setProperty("--rule-dashed", hexToRgba(ink, 0.24));

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", paper);
  }
}

function defaultCamera() {
  const focus = getCanvasFocusPoint();
  return {
    x: focus.x,
    y: focus.y,
    scale: 1
  };
}

function getCanvasFocusPoint() {
  const rect = getCanvasFocusRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function getCanvasFocusRect() {
  const chromeBottom = dom.chrome?.getBoundingClientRect().bottom || 0;
  const paletteRight =
    uiState.paletteVisible && !dom.palette.hidden
      ? dom.palette.getBoundingClientRect().right + 18
      : 0;
  const left = Math.max(0, paletteRight);
  const top = chromeBottom;
  const right = window.innerWidth;
  const bottom = window.innerHeight;
  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top)
  };
}

function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function adjustColor(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const target = amount < 0 ? 0 : 255;
  const mix = Math.abs(amount);
  return rgbToHex(
    Math.round(r + (target - r) * mix),
    Math.round(g + (target - g) * mix),
    Math.round(b + (target - b) * mix)
  );
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function createColorDeck() {
  return shuffleArray(PALETTE.map((swatch) => swatch.fill));
}

function normalizeColorDeck(colorDeck) {
  const normalized = Array.isArray(colorDeck)
    ? colorDeck.filter((color) => isHex(color) && PALETTE.some((swatch) => swatch.fill === color))
    : [];

  return normalized.length > 0 ? normalized : createColorDeck();
}
