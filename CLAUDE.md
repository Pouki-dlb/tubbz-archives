# CLAUDE.md — contexte projet pour l'assistant

> Ce fichier est lu automatiquement par Claude Code. Il **n'est pas** servi aux visiteurs et n'a
> aucun effet sur le site. Il fige les règles à respecter d'une session à l'autre.

## Nature du projet

« Tubbz Archives » : une application web qui **archive les figurines Tubbz** (canards vinyle
cosplayés, marque Numskull) et permet à un visiteur de **suivre sa collection**. Deux buts :
1. cataloguer les figurines (photo, numéro, année de sortie, licence, variantes,
   tirage limité par variante) ;
2. suivre ce que le visiteur possède, avec wishlist et notes.

## Contraintes NON négociables

- **100 % statique** : HTML / CSS / JS purs.
- **Aucun framework**, **aucun backend**, **aucune base de données**, **aucune étape de build**.
- Doit rester **léger et hébergeable gratuitement** (GitHub Pages, Netlify, Cloudflare Pages).
- **Pas de compte** : le suivi vit dans le `localStorage` du visiteur.

## Séparation des données (important)

- **Le catalogue** (toutes les figurines) est dans `data.js` — un fichier JS chargé par
  `<script>` qui définit `window.TUBBZ_DATA = { … }`. Ce choix (plutôt qu'un `.json` chargé par
  `fetch`) rend le site ouvrable par **simple double-clic** sur `index.html` (`file://`), sans
  serveur. C'est l'utilisateur qui l'alimente (via son propre scraping). Jamais dans `localStorage`.
- **Le `localStorage`** (clé `tubbz-collection`) ne contient **QUE** les données personnelles du
  visiteur : coches possédées, wishlist, notes. Jamais le catalogue.
- Clé interne d'une variante : `"<size>|<packaging>"`.
- Les `id` de figurines sont **stables** : ne jamais les renommer (sinon les collections des
  visiteurs se décalent).

## Structure des fichiers

| Fichier                   | Rôle |
|---------------------------|------|
| `index.html` / `index.js` | Grille : recherche, filtres, cards (chips de variante), export/import. |
| `duck.html` / `duck.js`   | Fiche détail (`duck.html?id=<id>`) : photos par variante, coches, wishlist, note. |
| `common.js`               | Partagé : chargement catalogue, `localStorage`, helpers (`window.Tubbz`). |
| `styles.css`              | Style, responsive, thème clair/sombre. |
| `data.js`                 | Le catalogue (`window.TUBBZ_DATA`). Voir `README.md` pour le schéma. |
| `images/`                 | Images locales (+ `placeholder.svg`). |

## Conventions

- Interface du site **en anglais uniquement** ; noms de licences/personnages laissés tels quels.
  (Les commentaires de code peuvent rester en français.)
- Tailles : `classic`, `mini`, `xl`. Emballages : `first-edition` (baignoire 🛁),
  `boxed` (boîte 📦).
- Images **déduites de l'`id`** (aucun chemin dans `data.js`). Deux conventions :
  - **Par taille** (figurine « nue ») : `images/<id>-<c|m|x>.webp`. Sert au **hero de `duck.html`**
    et à l'**image par défaut des cards** de l'index. Helper `Tubbz.sizeImageFor(id, size)`.
    La **taille primaire** (classic si dispo, sinon la taille unique) = `Tubbz.sizesOf(fig)[0]`,
    c'est l'image affichée par défaut.
  - **Par variante** (figurine dans son packaging) : `images/<id>-<c|m|x><f|b>.webp` (ex. `-cf`).
    Sert à la **partie basse « Available versions »** et au **survol des chips** de l'index.
    Helper `Tubbz.variantImageFor(id, size, packaging)`.
  - Repli `placeholder.svg` via `onerror`. `Tubbz.imageFor` (`<id>.webp` nu) est **legacy** : plus
    utilisé par le site (reste pour `admin.html` en attendant sa mise à jour).
- **Hero de `duck.html` = image par taille + bouton flip.** Si le canard a plusieurs tailles, un
  bouton `.hero-flip` (`#hero-flip`, libellé « ⇄ <Taille> ») cycle l'image `#hero-img` sur les
  tailles disponibles (ordre classic→mini→xl). Un seul canard mono-taille → **pas** de bouton.
  La partie basse ne change pas. L'image `mini` (`<id>-m.webp`) doit être créée à la main ;
  tant qu'elle manque, le flip affiche le placeholder.
- **Chip de variante** = « taille + emoji d'emballage » (ex. « Classic 📦 »), helper
  `Tubbz.variantChipLabel` ; couleur d'emballage via `Tubbz.packagingClass` (`pack-fe`/`pack-box`,
  scopées `.chip` sur la fiche). Sur la fiche : une chip colorée par variante. Sur les cards de
  l'index : **une chip par variante** = indicateur de possession (colorée + ✓ si possédée, grisée
  sinon) ; **survol d'une chip → l'image de la card devient celle de la variante** (`data-img`).
  **Clic sur une chip → navigue vers la fiche** (même destination que l'image/le nom), mais
  **aucun effet de survol propre à la chip** (pas de halo). **Max 4 variantes/chips par figurine.**
- **Card de l'index = `<div>`, PAS un lien global.** Mènent à la fiche : **l'image**
  (`a.card-media`, en `tabindex=-1`), **le nom** (`a.card-name-link.text-link`) et **les chips**
  (navigation JS). Le nom de franchise (`.card-franchise-link.text-link`) filtre la franchise.
- Cards de l'index à **hauteur uniforme** (`.card-body` hauteur fixe) : nom+franchise en haut,
  badges ancrés en bas (`margin-top:auto`). Pas de compteur « total · possédés » pour l'instant
  (retiré, à réintroduire plus tard).
- Le site doit rester ouvrable par **double-clic** sur `index.html` (`file://`) : ne PAS
  réintroduire de `fetch` vers un fichier local (bloqué en `file://`). Le catalogue passe par
  `<script src="data.js">`.
- **Clic sur un nom de franchise → filtre cette franchise.** Sur une card de l'index
  (`.card-franchise-link`, à l'intérieur du lien de card) : le clic est intercepté, empêche
  d'ouvrir la fiche, applique le filtre franchise (vide les autres filtres) et remonte en haut.
  Sur la fiche `duck.html` (`.franchise-link`) : lien vers `index.html?franchise=<nom>` ;
  l'index lit ce paramètre au chargement, applique le filtre et nettoie l'URL (comme `?home`).
- **Liens textuels cliquables → classe `.text-link`** : effet **très subtil**, le texte vire
  simplement au jaune canard (`--accent`) au survol. **Aucun soulignement.** À mettre sur tout
  lien/texte cliquable en ligne, **existant et futur**. Seule exception : le logo « Tubbz
  Archives » (`.brand`).
- Toujours échapper le contenu injecté en HTML (`Tubbz.esc`).
- Nouvelle logique partagée → `common.js` ; logique spécifique à une page → `index.js` / `duck.js`.
