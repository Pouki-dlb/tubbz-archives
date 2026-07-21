/* duck.js — page détail « fiche canard ».
 * Lit ?id=... , affiche les photos par variante, gère coches / wishlist / note. */
(function () {
  "use strict";

  var T = window.Tubbz;
  var state = T.loadState();
  var root = document.getElementById("duck-root");

  function getId() {
    return new URLSearchParams(window.location.search).get("id");
  }

  function notFound(id) {
    root.setAttribute("aria-busy", "false");
    root.innerHTML =
      '<div class="error">' +
        '<p><strong>Figurine not found.</strong></p>' +
        (id ? '<p class="muted">No duck with the id "' + T.esc(id) + '".</p>' : '') +
        '<p><a class="btn" href="index.html">← Back to catalog</a></p>' +
      '</div>';
  }

  /* ---------------------------------------------------------------- */
  /* Rendu                                                            */
  /* ---------------------------------------------------------------- */

  function render(meta, fig) {
    root.setAttribute("aria-busy", "false");

    var wished = T.isWished(state, fig.id);
    var mainImg = T.imageFor(fig.id);

    var variantsHTML = (fig.variants || []).map(function (v) {
      var key = T.variantKey(v.size, v.packaging);
      var owned = T.isOwned(state, fig.id, key);
      var img = T.variantImageFor(fig.id, v.size, v.packaging);
      var sizeTxt = T.sizeLabel(meta, v.size);
      var packTxt = T.packagingLabel(meta, v.packaging);
      var packClass = v.packaging === "first-edition" ? "pack-fe" : "pack-box";
      var packIcon = v.packaging === "first-edition" ? "🛁" : "📦";

      return (
        '<div class="variant ' + (owned ? "is-owned " : "") + packClass + '">' +
          '<div class="variant-media">' +
            '<img loading="lazy" src="' + T.esc(img) + '" alt="' + T.esc(fig.name + " — " + sizeTxt + " " + packTxt) + '" ' +
              'onerror="this.onerror=null;this.src=\'' + T.PLACEHOLDER + '\'" />' +
          '</div>' +
          '<div class="variant-info">' +
            '<span class="chip chip-size">' + T.esc(sizeTxt) + '</span>' +
            '<span class="chip ' + packClass + '">' + packIcon + ' ' + T.esc(packTxt) + '</span>' +
          '</div>' +
          (v.limitedTo ? '<p class="variant-limited">🔒 Limited to ' +
            T.esc(Number(v.limitedTo).toLocaleString("en-US")) + ' units</p>' : '') +
          '<label class="variant-check">' +
            '<input type="checkbox" data-key="' + T.esc(key) + '"' + (owned ? " checked" : "") + ' />' +
            '<span>I own it</span>' +
          '</label>' +
        '</div>'
      );
    }).join("");

    root.innerHTML =
      '<article class="duck">' +
        '<div class="duck-hero">' +
          '<div class="duck-hero-media">' +
            '<img src="' + T.esc(mainImg) + '" alt="' + T.esc(fig.name) + '" ' +
              'onerror="this.onerror=null;this.src=\'' + T.PLACEHOLDER + '\'" />' +
          '</div>' +
          '<div class="duck-hero-info">' +
            '<p class="duck-franchise">' + T.esc(fig.franchise) + '</p>' +
            '<h1 class="duck-name">' + T.esc(fig.name) + '</h1>' +
            '<dl class="duck-meta">' +
              '<div><dt>Number</dt><dd>' + (fig.number ? '#' + T.esc(fig.number) : '—') + '</dd></div>' +
              '<div><dt>Release year</dt><dd>' + (fig.releaseYear ? T.esc(fig.releaseYear) : 'Unknown') + '</dd></div>' +
            '</dl>' +
            (fig.description ? '<p class="duck-description">' + T.esc(fig.description) + '</p>' : '') +
            '<button id="btn-wish" type="button" class="btn btn-wish' + (wished ? " is-active" : "") + '">' +
              (wished ? "❤ In wishlist" : "♡ Add to wishlist") +
            '</button>' +
          '</div>' +
        '</div>' +

        '<section class="duck-section">' +
          '<h2>Available versions</h2>' +
          '<div class="variants">' + (variantsHTML || '<p class="muted">No variant listed.</p>') + '</div>' +
        '</section>' +

        '<section class="duck-section">' +
          '<h2>My note</h2>' +
          '<textarea id="note" class="note" rows="3" placeholder="Write whatever you want here.">' + T.esc(T.getNote(state, fig.id)) + '</textarea>' +
        '</section>' +
      '</article>';

    bindEvents(fig);
  }

  /* ---------------------------------------------------------------- */
  /* Interactions                                                     */
  /* ---------------------------------------------------------------- */

  function bindEvents(fig) {
    // Coches de possession
    root.querySelectorAll('.variant-check input[type="checkbox"]').forEach(function (cb) {
      cb.addEventListener("change", function () {
        var key = cb.getAttribute("data-key");
        T.toggleOwned(state, fig.id, key);
        cb.closest(".variant").classList.toggle("is-owned", cb.checked);
      });
    });

    // Wishlist
    var btnWish = document.getElementById("btn-wish");
    btnWish.addEventListener("click", function () {
      var now = T.toggleWishlist(state, fig.id);
      btnWish.classList.toggle("is-active", now);
      btnWish.textContent = now ? "❤ In wishlist" : "♡ Add to wishlist";
    });

    // Note (sauvegarde à la volée, débounce léger)
    var note = document.getElementById("note");
    var timer = null;
    note.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { T.setNote(state, fig.id, note.value); }, 300);
    });
    note.addEventListener("blur", function () { T.setNote(state, fig.id, note.value); });
  }

  /* ---------------------------------------------------------------- */
  /* Démarrage                                                        */
  /* ---------------------------------------------------------------- */

  var id = getId();
  T.loadCatalog()
    .then(function (data) {
      var fig = data.figurines.filter(function (f) { return f.id === id; })[0];
      if (!fig) { notFound(id); return; }
      document.title = fig.name + " — Tubbz Archives";
      render(data.meta, fig);
    })
    .catch(function (err) {
      root.setAttribute("aria-busy", "false");
      root.innerHTML =
        '<div class="error"><p><strong>Could not load the catalog.</strong></p>' +
        '<p class="muted">' + T.esc(err.message) + '</p>' +
        '<p><a class="btn" href="index.html">← Back</a></p></div>';
      console.error(err);
    });
})();
