# Carte des startups — Paris

Page web autonome : une **carte Google Maps de Paris** qui localise des startups,
avec **barre de recherche** et **panneau de détails** (logo, nom, secteur, lien).

- Fond de carte : **Google Maps JavaScript API** (rendu Google natif).
- Marqueurs = **logos** dans des pastilles rondes ; clic → panneau à droite.
- Un seul fichier : `index.html` (aucune installation, aucun build).

## 1) Clé Google Maps (obligatoire)

Google Maps nécessite une clé API :

1. Va sur [console.cloud.google.com](https://console.cloud.google.com) → crée/choisis un projet.
2. Active l'API **« Maps JavaScript API »**.
3. **Identifiants → Créer des identifiants → Clé API**.
4. (recommandé) **Restreins la clé** à ton domaine (`*.tondomaine.fr/*`).
5. Colle-la dans `index.html`, constante `GOOGLE_MAPS_API_KEY`.

> Un compte de facturation (carte bancaire) est requis par Google pour activer
> l'API, mais l'usage reste **gratuit sous le quota mensuel** offert.

`MAP_ID` peut rester `"DEMO_MAP_ID"` pour tester. Pour la prod (et un style
personnalisé), crée un **ID de carte** gratuit dans la console Google Cloud.

## 2) Ajouter / modifier les startups

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

## 3) Aperçu / déploiement

Une fois la clé renseignée, ouvre `index.html` dans un navigateur, ou déploie le
dépôt sur n'importe quel hébergement statique (Vercel, GitHub Pages, Netlify…).
