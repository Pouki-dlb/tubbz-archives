/* data.js — THE CATALOG of Tubbz figurines.
 *
 * This is the only file you need to fill in (e.g. with the output of your scraping).
 * We use a .js file (not .json) so the site works by simply double-clicking
 * index.html (file://), without any server.
 *
 * The content is plain JSON, just assigned to window.TUBBZ_DATA.
 * See README.md for the field details.
 */
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
      "image": "images/placeholder.svg",
      "variants": [
        { "size": "classic", "packaging": "first-edition", "image": "images/placeholder.svg" },
        { "size": "classic", "packaging": "boxed", "image": "images/placeholder.svg" },
        { "size": "mini", "packaging": "boxed", "image": "images/placeholder.svg" }
      ]
    },
    {
      "id": "darksouls-solaire",
      "name": "Solaire of Astora",
      "franchise": "Dark Souls",
      "number": "18",
      "releaseYear": "2021",
      "image": "images/placeholder.svg",
      "variants": [
        { "size": "classic", "packaging": "first-edition", "image": "images/placeholder.svg", "limitedTo": 3000 },
        { "size": "classic", "packaging": "boxed", "image": "images/placeholder.svg" }
      ]
    },
    {
      "id": "jaws-great-white-shark",
      "name": "Great White Shark",
      "franchise": "Jaws",
      "image": "images/placeholder.svg",
      "variants": [
        { "size": "classic", "packaging": "first-edition", "image": "images/placeholder.svg", "limitedTo": 5000 },
        { "size": "xl", "packaging": "boxed", "image": "images/placeholder.svg", "limitedTo": 3000 }
      ]
    },
    {
      "id": "harrypotter-gryffindor",
      "name": "Harry Potter (Gryffindor)",
      "franchise": "Harry Potter",
      "number": "55",
      "releaseYear": "2023",
      "image": "images/placeholder.svg",
      "variants": [
        { "size": "classic", "packaging": "first-edition", "image": "images/placeholder.svg" },
        { "size": "classic", "packaging": "boxed", "image": "images/placeholder.svg" },
        { "size": "mini", "packaging": "boxed", "image": "images/placeholder.svg" }
      ]
    },
    {
      "id": "tmnt-leonardo",
      "name": "Leonardo",
      "franchise": "Teenage Mutant Ninja Turtles",
      "number": "31",
      "releaseYear": "2022",
      "image": "images/placeholder.svg",
      "variants": [
        { "size": "classic", "packaging": "first-edition", "image": "images/placeholder.svg" },
        { "size": "classic", "packaging": "boxed", "image": "images/placeholder.svg" }
      ]
    }
  ]
};
