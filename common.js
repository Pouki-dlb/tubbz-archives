/* common.js — code partagé entre index.html et duck.html
 * - Chargement du catalogue (data.json, servi statiquement).
 * - Gestion de la collection du visiteur dans localStorage (coches, wishlist, notes).
 *   IMPORTANT : le localStorage ne contient QUE les données personnelles du visiteur,
 *   jamais le catalogue.
 */

// Expose un espace de noms global simple (pas de framework, pas de modules).
window.Tubbz = (function () {
  "use strict";

  var STORAGE_KEY = "tubbz-collection";
  var STATE_VERSION = 1;
  var PLACEHOLDER = "images/placeholder.svg";

  // Convention de nommage des images (convention pure : calculée depuis l'id, jamais stockée).
  // Image par taille    : images/<id>-<taille>.webp             (ex. -c, -m, -x) → figurine « nue »
  // Image de variante   : images/<id>-<taille><emballage>.webp  (ex. -cf, -cb, -mf, -xb) → dans son packaging
  // Image principale    : images/<id>.webp (legacy — plus utilisée par le site, cf. admin/index.html)
  var SIZE_INITIAL = { classic: "c", mini: "m", xl: "x" };
  var PACK_INITIAL = { "first-edition": "f", boxed: "b" };
  var SIZE_ORDER = ["classic", "mini", "xl"];

  function imageFor(id) {
    return "images/" + id + ".webp";
  }

  // Image « nue » d'une taille donnée (hero de duck.html + image par défaut des cards).
  function sizeImageFor(id, size) {
    return "images/" + id + "-" + (SIZE_INITIAL[size] || "") + ".webp";
  }

  // Tailles distinctes présentes dans les variantes, ordonnées classic → mini → xl.
  function sizesOf(fig) {
    var present = {};
    (fig.variants || []).forEach(function (v) { if (v && v.size) present[v.size] = true; });
    return SIZE_ORDER.filter(function (s) { return present[s]; });
  }

  function variantImageFor(id, size, packaging) {
    var s = SIZE_INITIAL[size] || "";
    var p = PACK_INITIAL[packaging] || "";
    return "images/" + id + "-" + s + p + ".webp";
  }

  /* ------------------------------------------------------------------ */
  /* Catalogue                                                          */
  /* ------------------------------------------------------------------ */

  // Lit le catalogue depuis window.TUBBZ_DATA (défini par data.js, chargé via <script>).
  // Ce choix rend le site 100 % statique : il fonctionne par simple double-clic sur
  // index.html (file://), sans serveur ni fetch. Renvoie une promesse résolue avec
  // { meta, figurines }, triée par licence puis nom.
  function loadCatalog() {
    return new Promise(function (resolve, reject) {
      var data = window.TUBBZ_DATA;
      if (!data || typeof data !== "object") {
        reject(new Error("Catalogue introuvable : le fichier data.js n'est pas chargé."));
        return;
      }
      var meta = data.meta || {};
      var figurines = Array.isArray(data.figurines) ? data.figurines.slice() : [];
      // Numéro → nombre (parseFloat pour gérer les « 3.1 » qui suivent le « 3 ») ;
      // absent ou invalide = Infinity (rejeté en fin de franchise).
      function numOf(v) { var n = parseFloat(v); return isNaN(n) ? Infinity : n; }
      // Tri par défaut : franchise (alpha), puis numéro croissant (sans-numéro à la fin),
      // puis nom (départage à numéro égal ou entre sans-numéro).
      figurines.sort(function (a, b) {
        var byFranchise = String(a.franchise || "").localeCompare(String(b.franchise || ""), "fr");
        if (byFranchise !== 0) return byFranchise;
        var na = numOf(a.number), nb = numOf(b.number);
        if (na !== nb) return na - nb;
        return String(a.name || "").localeCompare(String(b.name || ""), "fr");
      });
      resolve({ meta: meta, figurines: figurines });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Libellés (avec repli si meta.labels absent)                        */
  /* ------------------------------------------------------------------ */

  var DEFAULT_LABELS = {
    sizes: { classic: "Classic", mini: "Mini", xl: "XL" },
    packaging: { "first-edition": "First Edition", boxed: "Boxed" }
  };

  function sizeLabel(meta, size) {
    var l = (meta && meta.labels && meta.labels.sizes) || DEFAULT_LABELS.sizes;
    return l[size] || DEFAULT_LABELS.sizes[size] || size;
  }

  function packagingLabel(meta, packaging) {
    var l = (meta && meta.labels && meta.labels.packaging) || DEFAULT_LABELS.packaging;
    return l[packaging] || DEFAULT_LABELS.packaging[packaging] || packaging;
  }

  // Emoji représentant l'emballage : baignoire (First Edition) / boîte (Boxed).
  var PACK_EMOJI = { "first-edition": "🛁", boxed: "📦" };
  function packagingEmoji(packaging) {
    return PACK_EMOJI[packaging] || "";
  }

  // Classe CSS de couleur associée à l'emballage.
  function packagingClass(packaging) {
    return packaging === "first-edition" ? "pack-fe" : "pack-box";
  }

  // Libellé condensé d'une variante : « Classic 📦 ».
  function variantChipLabel(meta, size, packaging) {
    return sizeLabel(meta, size) + " " + packagingEmoji(packaging);
  }

  /* ------------------------------------------------------------------ */
  /* État visiteur (localStorage)                                       */
  /* ------------------------------------------------------------------ */

  function emptyState() {
    return { version: STATE_VERSION, owned: {}, wishlist: {}, notes: {} };
  }

  // Lecture tolérante : jamais d'exception qui casse la page.
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      var parsed = JSON.parse(raw);
      return normalizeState(parsed);
    } catch (e) {
      console.warn("localStorage illisible, réinitialisation en mémoire :", e);
      return emptyState();
    }
  }

  function normalizeState(obj) {
    var s = emptyState();
    if (obj && typeof obj === "object") {
      if (obj.owned && typeof obj.owned === "object") s.owned = obj.owned;
      if (obj.wishlist && typeof obj.wishlist === "object") s.wishlist = obj.wishlist;
      if (obj.notes && typeof obj.notes === "object") s.notes = obj.notes;
    }
    s.version = STATE_VERSION;
    return s;
  }

  // Teste si l'écriture localStorage est réellement possible (certains navigateurs
  // la bloquent en mode fichier local file://, ou en navigation privée).
  function storageAvailable() {
    try {
      var k = "__tubbz_test__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error("Impossible d'écrire dans localStorage :", e);
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Mutations de l'état                                                */
  /* ------------------------------------------------------------------ */

  function variantKey(size, packaging) {
    return size + "|" + packaging;
  }

  function isOwned(state, id, key) {
    return !!(state.owned[id] && state.owned[id][key]);
  }

  // Bascule la possession d'une variante. Renvoie le nouvel état booléen.
  function toggleOwned(state, id, key) {
    if (!state.owned[id]) state.owned[id] = {};
    if (state.owned[id][key]) {
      delete state.owned[id][key];
      if (Object.keys(state.owned[id]).length === 0) delete state.owned[id];
    } else {
      state.owned[id][key] = true;
    }
    saveState(state);
    return isOwned(state, id, key);
  }

  function isWished(state, id) {
    return !!state.wishlist[id];
  }

  function toggleWishlist(state, id) {
    if (state.wishlist[id]) delete state.wishlist[id];
    else state.wishlist[id] = true;
    saveState(state);
    return isWished(state, id);
  }

  function getNote(state, id) {
    return state.notes[id] || "";
  }

  function setNote(state, id, text) {
    text = (text || "").trim();
    if (text) state.notes[id] = text;
    else delete state.notes[id];
    saveState(state);
  }

  /* ------------------------------------------------------------------ */
  /* Nombre de variantes possédées d'une figurine                       */
  /* ------------------------------------------------------------------ */

  function ownedCountOf(state, figurine) {
    var variants = figurine.variants || [];
    var owned = 0;
    for (var i = 0; i < variants.length; i++) {
      var key = variantKey(variants[i].size, variants[i].packaging);
      if (isOwned(state, figurine.id, key)) owned++;
    }
    return { owned: owned, total: variants.length };
  }

  /* ------------------------------------------------------------------ */
  /* Petits utilitaires                                                 */
  /* ------------------------------------------------------------------ */

  // Échappe le texte destiné à être injecté en HTML.
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  return {
    PLACEHOLDER: PLACEHOLDER,
    loadCatalog: loadCatalog,
    loadState: loadState,
    saveState: saveState,
    storageAvailable: storageAvailable,
    normalizeState: normalizeState,
    emptyState: emptyState,
    variantKey: variantKey,
    isOwned: isOwned,
    toggleOwned: toggleOwned,
    isWished: isWished,
    toggleWishlist: toggleWishlist,
    getNote: getNote,
    setNote: setNote,
    ownedCountOf: ownedCountOf,
    sizeLabel: sizeLabel,
    packagingLabel: packagingLabel,
    packagingEmoji: packagingEmoji,
    packagingClass: packagingClass,
    variantChipLabel: variantChipLabel,
    imageFor: imageFor,
    sizeImageFor: sizeImageFor,
    sizesOf: sizesOf,
    variantImageFor: variantImageFor,
    esc: esc
  };
})();
