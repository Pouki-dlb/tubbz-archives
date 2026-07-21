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
| `index.html` / `index.js` | Grille minimale : recherche, filtres, stats, export/import. |
| `duck.html` / `duck.js`   | Fiche détail (`duck.html?id=<id>`) : photos par variante, coches, wishlist, note. |
| `common.js`               | Partagé : chargement catalogue, `localStorage`, helpers (`window.Tubbz`). |
| `styles.css`              | Style, responsive, thème clair/sombre. |
| `data.js`                 | Le catalogue (`window.TUBBZ_DATA`). Voir `README.md` pour le schéma. |
| `images/`                 | Images locales (+ `placeholder.svg`). |

## Conventions

- Interface du site **en anglais uniquement** ; noms de licences/personnages laissés tels quels.
  (Les commentaires de code peuvent rester en français.)
- Tailles : `classic`, `mini`, `xl`. Emballages : `first-edition` (baignoire), `boxed` (boîte).
- Images **déduites de l'`id`** (aucun chemin dans `data.js`) : principale `images/<id>.webp`,
  variante `images/<id>-<taille><emballage>.webp` (c/m/x + f/b, ex. `-cf`). Repli `placeholder.svg`
  via `onerror`. Helpers `Tubbz.imageFor` / `Tubbz.variantImageFor`.
- Le site doit rester ouvrable par **double-clic** sur `index.html` (`file://`) : ne PAS
  réintroduire de `fetch` vers un fichier local (bloqué en `file://`). Le catalogue passe par
  `<script src="data.js">`.
- Toujours échapper le contenu injecté en HTML (`Tubbz.esc`).
- Nouvelle logique partagée → `common.js` ; logique spécifique à une page → `index.js` / `duck.js`.
