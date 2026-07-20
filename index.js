/* index.js — page d'accueil : grille minimale, recherche, filtres, export/import. */
(function () {
  "use strict";

  var T = window.Tubbz;

  var state = T.loadState();
  var catalog = { meta: {}, figurines: [] };

  // Éléments du DOM
  var elGrid = document.getElementById("grid");
  var elCount = document.getElementById("result-count");
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

  function statusBadge(owned) {
    return owned
      ? '<span class="badge badge-owned">✔ Owned</span>'
      : '<span class="badge badge-none">Not owned</span>';
  }

  function cardHTML(fig) {
    var owned = T.ownedCountOf(state, fig).owned > 0;
    var wished = T.isWished(state, fig.id);
    var img = fig.image || T.PLACEHOLDER;
    var url = "duck.html?id=" + encodeURIComponent(fig.id);

    return (
      '<a class="card" href="' + url + '" data-owned="' + (owned ? "1" : "0") + '">' +
        '<div class="card-media">' +
          '<img loading="lazy" src="' + T.esc(img) + '" alt="' + T.esc(fig.name) + '" ' +
            'onerror="this.onerror=null;this.src=\'' + T.PLACEHOLDER + '\'" />' +
          (fig.number ? '<span class="num-badge">#' + T.esc(fig.number) + '</span>' : '') +
          (wished ? '<span class="heart" title="In your wishlist" aria-label="Wishlist">❤</span>' : '') +
        '</div>' +
        '<div class="card-body">' +
          '<h3 class="card-name">' + T.esc(fig.name) + '</h3>' +
          '<p class="card-franchise">' + T.esc(fig.franchise) + '</p>' +
          '<div class="card-status">' + statusBadge(owned) + '</div>' +
        '</div>' +
      '</a>'
    );
  }

  function render() {
    var list = catalog.figurines.filter(matches);

    var ownedTotal = catalog.figurines.reduce(function (n, fig) {
      return n + (T.ownedCountOf(state, fig).owned > 0 ? 1 : 0);
    }, 0);
    elCount.textContent =
      list.length + (list.length === 1 ? " figurine" : " figurines") +
      " · " + ownedTotal + " owned";

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
  /* Événements                                                       */
  /* ---------------------------------------------------------------- */

  function bindEvents() {
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
