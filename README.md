# The TUBBZ Archive

Application web **statique** (HTML/CSS/JS purs — aucun framework, aucun backend, aucune base de
données) pour **archiver les figurines Tubbz** et **suivre sa collection**. Le suivi est enregistré
uniquement dans le navigateur du visiteur (`localStorage`) — **pas de compte**.

## Lancer le site

Aucun serveur, aucun outil : **il suffit de double-cliquer sur `index.html`** (ou de le déposer
dans un navigateur). Le catalogue est chargé via une balise `<script src="data.js">`, ce qui
fonctionne directement depuis `file://`.

Pour l'héberger en ligne (gratuitement) : GitHub Pages, Netlify ou Cloudflare Pages — déposer le
dossier tel quel, aucune étape de build.

## Structure

| Fichier            | Rôle                                                                  |
|--------------------|-----------------------------------------------------------------------|
| `index.html` / `index.js` | Grille minimale des canards : recherche, filtres, stats, export/import. |
| `duck.html` / `duck.js`   | Fiche d'un canard (`duck.html?id=<id>`) : photos par variante, coches, wishlist, note. |
| `common.js`        | Code partagé : chargement catalogue, `localStorage`, helpers.         |
| `styles.css`       | Style, responsive, thème clair/sombre automatique.                    |
| `data.js`          | **Le catalogue** (voir schéma ci-dessous). À alimenter par vos soins. |
| `images/`          | Images des figurines (+ `placeholder.svg` par défaut).                |

## Schéma de `data.js`

C'est le seul fichier à alimenter (par exemple avec la sortie de votre scraping). Le contenu est du
JSON normal, simplement enveloppé dans `window.TUBBZ_DATA = { … };` :

```js
window.TUBBZ_DATA = {
  "meta": {
    "sizes": ["classic", "mini", "xl"],
    "packaging": ["first-edition", "boxed"],
    "labels": {
      "sizes": { "classic": "Classic", "mini": "Mini", "xl": "XL" },
      "packaging": { "first-edition": "First Edition", "boxed": "Boxed" }
    }
  },
  "figurines": [
    {
      "id": "fallout-vault-boy",
      "name": "Vault Boy",
      "franchise": "Fallout",
      "number": "42",
      "releaseYear": "2020",
      "description": "Le mascotte souriant des abris Vault-Tec.",
      "variants": [
        { "size": "classic", "packaging": "first-edition", "limitedTo": 5000 },
        { "size": "classic", "packaging": "boxed" },
        { "size": "mini",    "packaging": "boxed" }
      ]
    }
  ]
};
```

> Concrètement : générez votre JSON, puis ajoutez `window.TUBBZ_DATA = ` devant et `;` à la fin.
> **Aucun chemin d'image** à indiquer : ils sont déduits de l'`id` (voir « Images » plus bas).

### Champs d'une figurine

| Champ         | Obligatoire | Description                                                              |
|---------------|-------------|-------------------------------------------------------------------------|
| `id`          | ✅          | Identifiant **unique et stable**. Sert de clé pour les coches du visiteur — **ne jamais le modifier** ensuite, sinon les collections se décalent. |
| `name`        | ✅          | Nom du personnage.                                                       |
| `franchise`   | ✅          | Licence (sert au regroupement et aux filtres).                          |
| `number`      | ⬜          | Numéro de la figurine dans la collection (ex. `"42"`). Affiché `#42` ; si absent (hors-série), affiché `—`. |
| `releaseYear` | ⬜          | Année de sortie (ex. `"2026"`). Si absent, affiché `Unknown`.           |
| `description` | ⬜          | Court texte descriptif. Affiché sur la fiche (en italique). Les retours à la ligne (`\n`) sont conservés. |
| `variants`    | ✅          | Liste des combinaisons **réellement existantes** (voir ci-dessous).     |

### Champs d'une variante

| Champ       | Obligatoire | Valeurs                                            |
|-------------|-------------|----------------------------------------------------|
| `size`      | ✅          | `classic` \| `mini` \| `xl`                         |
| `packaging` | ✅          | `first-edition` (baignoire) \| `boxed` (boîte)     |
| `limitedTo` | ⬜          | Tirage limité connu (nombre d'exemplaires, ex. `3000`). Affiché « Limited to 3,000 units ». Souvent pour les XL et certaines First Edition. |

> N'ajoutez que les variantes qui existent vraiment. La clé interne d'une variante est
> `"<size>|<packaging>"` (ex. `classic|first-edition`).

### Images (déduites de l'`id`, aucun chemin à saisir)

Les images ne sont **pas** listées dans `data.js` : l'application calcule leur chemin à partir de
l'`id`. Placez simplement vos fichiers `.webp` dans `images/` en respectant cette nomenclature :

| Image | Chemin attendu | Exemple |
|-------|----------------|---------|
| Principale (grille + haut de fiche) | `images/<id>.webp` | `images/fallout-vault-boy.webp` |
| Variante (fiche) | `images/<id>-<taille><emballage>.webp` | `images/fallout-vault-boy-cf.webp` |

- Initiales de **taille** : `classic` → `c`, `mini` → `m`, `xl` → `x`.
- Initiales d'**emballage** : `first-edition` → `f`, `boxed` → `b`.
- Combinaisons : `-cf`, `-cb`, `-mf`, `-mb`, `-xf`, `-xb`.
- Extension **toujours `.webp`**. Si un fichier est **absent**, le **placeholder** s'affiche
  automatiquement (aucune erreur visible).

## Données personnelles du visiteur (`localStorage`)

Stockées sous la clé `tubbz-collection`, **uniquement** côté navigateur :

```json
{
  "version": 1,
  "owned":    { "fallout-vault-boy": { "classic|first-edition": true } },
  "wishlist": { "fallout-vault-boy": true },
  "notes":    { "fallout-vault-boy": "payé 15€" }
}
```

Le bouton **Exporter** télécharge exactement cet objet en `.json` ; **Importer** le restaure
(remplacement, après confirmation). C'est le seul moyen de sauvegarder / transférer une collection
(pas de compte, pas de serveur).

## Note

Tubbz™ est une marque de Numskull Designs. Ce projet est un outil de collection non officiel ; les
images ajoutées dans `images/` sont sous la responsabilité de la personne qui les fournit.
