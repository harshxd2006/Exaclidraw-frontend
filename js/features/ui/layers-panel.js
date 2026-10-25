// ============================================================================
// Layers Panel — Stage 20
// Collapsible panel that lists all scene elements in reverse z-order (top first).
// Per-row: visibility toggle (isHidden), lock toggle (isLocked), click-to-select.
// ============================================================================

import { getState, subscribe, setSelectedElementIds, updateElement, toggleLockElement } from '../../core/state.js';

let panelEl = null;
let listEl = null;
let countBadge = null;
let isOpen = false;
let isInitialized = false;

// SVG icon map by element type
const TYPE_ICONS = {
  rectangle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
  ellipse:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`,
  diamond:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l10 10-10 10L2 12z"/></svg>`,
  arrow:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="12 5 19 5 19 12"/></svg>`,
  line:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="19" x2="19" y2="5"/></svg>`,
  freedraw:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`,
  text:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
};

const EYE_OPEN   = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_CLOSED = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
const LOCK_ICON  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
const UNLOCK_ICON= `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`;

/** Returns a readable label for a layer row */
function getLayerLabel(el) {
  if (el.type === 'text' && el.text) {
    return el.text.replace(/\n/g, ' ').substring(0, 24) + (el.text.length > 24 ? '…' : '');
  }
  if ((el.type === 'arrow' || el.type === 'line') && el.label) {
    return `${el.type}: ${el.label.substring(0, 18)}`;
  }
  const idx = getState().elements.filter(e => !e.isDeleted && e.type === el.type).indexOf(el);
  const typeName = el.type.charAt(0).toUpperCase() + el.type.slice(1);
  return `${typeName} ${idx + 1}`;
}

/** Rebuilds the layers list from current state */
function renderLayersList(state) {
  if (!listEl) return;

  const visibleElements = state.elements.filter(e => !e.isDeleted);
  const count = visibleElements.length;

  if (countBadge) countBadge.textContent = count;

  if (count === 0) {
    listEl.innerHTML = `<div class="layers-empty">No elements on canvas</div>`;
    return;
  }

  // Render in reverse order: top of stack first
  const rows = [];
  for (let i = visibleElements.length - 1; i >= 0; i--) {
    const el = visibleElements[i];
    const isSelected = !!state.selectedElementIds[el.id];
    const isHidden = !!el.isHidden;
    const isLocked = !!el.isLocked;

    const typeIcon = TYPE_ICONS[el.type] || TYPE_ICONS.rectangle;
    const label = getLayerLabel(el);

    rows.push(`
      <div class="layer-row${isSelected ? ' is-selected' : ''}${isLocked ? ' is-locked' : ''}"
           data-id="${el.id}" title="${label}">
        <button class="layer-vis-btn${isHidden ? ' hidden' : ''}"
                data-id="${el.id}" data-action="visibility"
                title="${isHidden ? 'Show element' : 'Hide element'}"
                aria-label="${isHidden ? 'Show' : 'Hide'}">
          ${isHidden ? EYE_CLOSED : EYE_OPEN}
        </button>
        <span class="layer-type-icon">${typeIcon}</span>
        <span class="layer-name">${label}</span>
        <button class="layer-lock-btn${isLocked ? ' locked' : ''}"
                data-id="${el.id}" data-action="lock"
                title="${isLocked ? 'Unlock element' : 'Lock element'}"
                aria-label="${isLocked ? 'Unlock' : 'Lock'}">
          ${isLocked ? LOCK_ICON : UNLOCK_ICON}
        </button>
      </div>
    `);
  }

  listEl.innerHTML = rows.join('');

  // Bind row click — select element
  listEl.querySelectorAll('.layer-row').forEach(row => {
    row.addEventListener('click', e => {
      // Don't select if clicking a button inside the row
      if (e.target.closest('button')) return;
      const id = row.dataset.id;
      const el = getState().elements.find(el => el.id === id);
      if (el && !el.isLocked) {
        setSelectedElementIds([id]);
      }
    });
  });

  // Bind visibility buttons
  listEl.querySelectorAll('[data-action="visibility"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const el = getState().elements.find(el => el.id === id);
      if (el) {
        updateElement(id, { isHidden: !el.isHidden });
      }
    });
  });

  // Bind lock buttons
  listEl.querySelectorAll('[data-action="lock"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleLockElement(btn.dataset.id);
    });
  });
}

/** Opens or closes the layers panel */
function togglePanel() {
  isOpen = !isOpen;
  if (panelEl) {
    panelEl.style.display = isOpen ? 'flex' : 'none';
    if (isOpen) {
      panelEl.style.animation = 'none';
      panelEl.offsetHeight; // reflow
      panelEl.style.animation = '';
      renderLayersList(getState());
    }
  }
  const btn = document.getElementById('btn-toggle-layers');
  if (btn) btn.classList.toggle('active', isOpen);
}

/** Initializes the layers panel — call once after DOM is ready */
export function initLayersPanel() {
  if (isInitialized) return;
  isInitialized = true;

  // Create toggle button and inject into topbar-right
  const topbarRight = document.querySelector('.topbar-right');
  if (topbarRight) {
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.id = 'btn-toggle-layers';
    toggleBtn.title = 'Layers panel (Ctrl+Shift+H)';
    toggleBtn.setAttribute('aria-label', 'Toggle layers panel');
    toggleBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>`;
    toggleBtn.addEventListener('click', togglePanel);
    topbarRight.insertBefore(toggleBtn, topbarRight.firstChild);
  }

  // Create the panel DOM
  panelEl = document.createElement('div');
  panelEl.id = 'layers-panel';
  panelEl.style.display = 'none';
  panelEl.setAttribute('role', 'region');
  panelEl.setAttribute('aria-label', 'Layers');
  panelEl.innerHTML = `
    <div class="layers-panel-header">
      <span class="layers-panel-title">Layers</span>
      <span class="layers-count-badge" id="layers-count-badge">0</span>
    </div>
    <div class="layers-list" id="layers-list-body"></div>
  `;

  // Append to #app so it overlays the canvas
  document.getElementById('app')?.appendChild(panelEl);

  listEl = document.getElementById('layers-list-body');
  countBadge = document.getElementById('layers-count-badge');

  // Update whenever state changes
  subscribe(state => {
    if (isOpen) renderLayersList(state);
    else if (countBadge) {
      countBadge.textContent = state.elements.filter(e => !e.isDeleted).length;
    }
  });

  // Keyboard shortcut Ctrl+Shift+H
  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'h' || e.key === 'H')) {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      togglePanel();
    }
  });

  console.log('[LayersPanel] Initialized. Toggle with Ctrl+Shift+H or the layers button.');
}
