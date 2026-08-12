# Carte des startups — Paris

Page web autonome : une **carte interactive de Paris** qui localise des startups,
avec **barre de recherche** et **panneau de détails** (logo, nom, secteur, lien).

- Carte : [Leaflet](https://leafletjs.com/) + fond [CARTO](https://carto.com/) / OpenStreetMap — **gratuit, sans clé API**.
- Un seul fichier : `index.html` (aucune installation, aucun build).

## Ajouter / modifier les startups

Tout se passe dans le bloc `STARTUPS` en haut du `<script>` de `index.html` :

```js
const STARTUPS = [
  { name:"Nom",            // nom affiché
    sector:"Fintech",      // secteur d'activité (badge)
    url:"https://…",       // lien du site (avec https://)
    logo:"https://…",      // URL du logo (png/svg). "" -> initiales
    lat:48.8566, lng:2.3522 // coordonnées GPS
  },
  // …
];
```

**Coordonnées GPS** : sur Google Maps, clic droit sur l'emplacement → les deux
nombres affichés en haut du menu sont `lat, lng`.

**Logo** : n'importe quelle URL d'image publique. Si le logo ne charge pas,
les initiales de la startup s'affichent automatiquement.

## Aperçu / déploiement

Ouvrez simplement `index.html` dans un navigateur, ou déployez le dépôt sur
n'importe quel hébergement statique (Vercel, GitHub Pages, Netlify…).
