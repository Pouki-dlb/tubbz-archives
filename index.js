/* index.js — page d'accueil : grille minimale, recherche, filtres, export/import. */
(function () {
  "use strict";

  var T = window.Tubbz;

  var state = T.loadState();
  var catalog = { meta: {}, figurines: [] };

  // Éléments du DOM
  var elGrid = document.getElementById("grid");
  var elWarning = document.getElementById("storage-warning");
  var elSearch = document.getElementById("search");
  var elFranchise = document.getElementById("filter-franchise");
  var elSize = document.getElementById("filter-size");
  var elPackaging = document.getElementById("filter-packaging");
  var elStatus = document.getElementById("filter-status");

  /* ---------------------------------------------------------------- */
  /* Filtrage                                                         */
  /* ---------------------------------------------------------------- */

  function matches(fig) {
    var q = elSearch.value.trim().toLowerCase();
    if (q) {
      var hay = (fig.name + " " + fig.franchise).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (elFranchise.value && fig.franchise !== elFranchise.value) return false;

    var variants = fig.variants || [];
    if (elSize.value && !variants.some(function (v) { return v.size === elSize.value; })) return false;
    if (elPackaging.value && !variants.some(function (v) { return v.packaging === elPackaging.value; })) return false;

    if (elStatus.value) {
      var owned = T.ownedCountOf(state, fig).owned > 0;
      if (elStatus.value === "wishlist") {
        if (!T.isWished(state, fig.id)) return false;
      } else if (elStatus.value === "owned") {
        if (!owned) return false;
      } else if (elStatus.value === "not-owned") {
        if (owned) return false;
      }
    }
    return true;
  }

  /* ---------------------------------------------------------------- */
  /* Rendu de la grille                                               */
  /* ---------------------------------------------------------------- */

  // Une chip par variante existante : couleur d'emballage + ✓ si possédée, grisée sinon.
  // data-img porte l'image de la variante (utilisée au survol pour changer l'image de la card).
  function variantChips(fig) {
    return (fig.variants || []).map(function (v) {
      var key = T.variantKey(v.size, v.packaging);
      var owned = T.isOwned(state, fig.id, key);
      var cls = "card-chip " + T.packagingClass(v.packaging) + (owned ? " is-owned" : " is-missing");
      var vimg = T.variantImageFor(fig.id, v.size, v.packaging);
      return '<span class="' + cls + '" data-img="' + T.esc(vimg) + '">' +
        (owned ? "✓ " : "") + T.esc(T.variantChipLabel(catalog.meta, v.size, v.packaging)) +
        '</span>';
    }).join("");
  }

  function cardHTML(fig) {
    var wished = T.isWished(state, fig.id);
    var img = T.imageFor(fig.id);
    var url = "duck.html?id=" + encodeURIComponent(fig.id);

    return (
      '<a class="card" href="' + url + '">' +
        '<div class="card-media">' +
          '<img loading="lazy" src="' + T.esc(img) + '" data-default="' + T.esc(img) + '" ' +
            'alt="' + T.esc(fig.name) + '" ' +
            'onerror="this.onerror=null;this.src=\'' + T.PLACEHOLDER + '\'" />' +
          (fig.number ? '<span class="num-badge">#' + T.esc(fig.number) + '</span>' : '') +
          (wished ? '<span class="heart" title="In your wishlist" aria-label="Wishlist">❤</span>' : '') +
        '</div>' +
        '<div class="card-body">' +
          '<h3 class="card-name">' + T.esc(fig.name) + '</h3>' +
          '<p class="card-franchise">' + T.esc(fig.franchise) + '</p>' +
          '<div class="card-chips">' + variantChips(fig) + '</div>' +
        '</div>' +
      '</a>'
    );
  }

  function render() {
    var list = catalog.figurines.filter(matches);

    if (list.length === 0) {
      elGrid.innerHTML = '<p class="empty">No figurine matches your search.</p>';
    } else {
      elGrid.innerHTML = list.map(cardHTML).join("");
    }
    elGrid.setAttribute("aria-busy", "false");
  }

  /* ---------------------------------------------------------------- */
  /* Filtres : peupler la liste des licences                          */
  /* ---------------------------------------------------------------- */

  function populateFranchises() {
    var names = {};
    catalog.figurines.forEach(function (f) { names[f.franchise] = true; });
    Object.keys(names).sort(function (a, b) { return a.localeCompare(b, "fr"); })
      .forEach(function (name) {
        var opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        elFranchise.appendChild(opt);
      });
  }

  /* ---------------------------------------------------------------- */
  /* Export / Import de sauvegarde                                    */
  /* ---------------------------------------------------------------- */

  function exportBackup() {
    var payload = JSON.stringify(state, null, 2);
    var blob = new Blob([payload], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    var stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = "tubbz-collection-" + stamp + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        var incoming = T.normalizeState(parsed);
        var ok = window.confirm(
          "Import this backup?\n\n" +
          "It will REPLACE your current collection in this browser."
        );
        if (!ok) return;
        state = incoming;
        T.saveState(state);
        render();
        alert("Backup imported successfully.");
      } catch (e) {
        alert("Invalid file: this backup could not be read.");
      }
    };
    reader.onerror = function () { alert("Could not read the file."); };
    reader.readAsText(file);
  }

  /* ---------------------------------------------------------------- */
  /* Help modal                                                       */
  /* ---------------------------------------------------------------- */

  function bindHelpModal() {
    var modal = document.getElementById("help-modal");
    var openBtn = document.getElementById("btn-help");

    function open() { modal.hidden = false; }
    function close() { modal.hidden = true; }

    openBtn.addEventListener("click", open);
    modal.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-close")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) close();
    });
  }

  /* ---------------------------------------------------------------- */
  /* Survol d'une chip → change l'image de la card (délégation)        */
  /* ---------------------------------------------------------------- */

  function setImg(im, src) {
    im.onerror = function () { this.onerror = null; this.src = T.PLACEHOLDER; };
    im.src = src;
  }

  function bindChipHover() {
    elGrid.addEventListener("mouseover", function (e) {
      var chip = e.target.closest(".card-chip");
      if (!chip || !elGrid.contains(chip)) return;
      var card = chip.closest(".card");
      var im = card && card.querySelector(".card-media img");
      var v = chip.getAttribute("data-img");
      if (im && v) setImg(im, v);
    });
    elGrid.addEventListener("mouseout", function (e) {
      var chip = e.target.closest(".card-chip");
      if (!chip || !elGrid.contains(chip)) return;
      var card = chip.closest(".card");
      var im = card && card.querySelector(".card-media img");
      if (im) setImg(im, im.getAttribute("data-default"));
    });
  }

  /* ---------------------------------------------------------------- */
  /* Événements                                                       */
  /* ---------------------------------------------------------------- */

  function bindEvents() {
    bindChipHover();

    [elSearch, elFranchise, elSize, elPackaging, elStatus].forEach(function (el) {
      el.addEventListener("input", render);
      el.addEventListener("change", render);
    });

    document.getElementById("btn-reset").addEventListener("click", function () {
      elSearch.value = "";
      elFranchise.value = "";
      elSize.value = "";
      elPackaging.value = "";
      elStatus.value = "";
      render();
    });

    document.getElementById("btn-export").addEventListener("click", exportBackup);

    var fileInput = document.getElementById("import-file");
    document.getElementById("btn-import").addEventListener("click", function () {
      fileInput.click();
    });
    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files[0]) importBackup(fileInput.files[0]);
      fileInput.value = ""; // permet de réimporter le même fichier
    });

    bindHelpModal();

    // Refresh state when the user comes back from duck.html (checkboxes changed).
    window.addEventListener("pageshow", function () {
      state = T.loadState();
      render();
    });
  }

  /* ---------------------------------------------------------------- */
  /* Démarrage                                                        */
  /* ---------------------------------------------------------------- */

  function checkStorage() {
    if (T.storageAvailable()) return;
    elWarning.hidden = false;
    elWarning.innerHTML =
      '⚠ Your browser is blocking local storage on this page, so your check marks ' +
      'will not be saved. Open the site from a host (http://) rather than a local file, ' +
      'or allow site data for this file.';
  }

  T.loadCatalog()
    .then(function (data) {
      catalog = data;
      checkStorage();
      populateFranchises();
      bindEvents();
      render();
    })
    .catch(function (err) {
      elGrid.setAttribute("aria-busy", "false");
      elGrid.innerHTML =
        '<div class="error">' +
          '<p><strong>Could not load the catalog.</strong></p>' +
          '<p class="muted">' + T.esc(err.message) + '</p>' +
          '<p class="muted">Make sure the <code>data.js</code> file is present next to ' +
          '<code>index.html</code>.</p>' +
        '</div>';
      console.error(err);
    });
})();
