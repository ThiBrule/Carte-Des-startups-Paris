/**
 * Carte des startups — pont entre le site web et le Google Sheet.
 *
 * À COLLER dans : ton Google Sheet → menu Extensions → Apps Script
 * (remplace tout le code par défaut), puis Déployer en « Application Web ».
 *
 * Ce script fait 2 choses :
 *   • doPost  : le formulaire « Ajouter mon entreprise » ajoute une ligne dans le Sheet.
 *   • doGet   : le site lit les entreprises dont la case « validation » est cochée,
 *               géocode l'adresse (une seule fois, puis met en cache dans Lat/Lng)
 *               et les renvoie à la carte.
 *
 * Les colonnes sont trouvées par leur EN-TÊTE (ligne 1), peu importe leur ordre :
 *   Nom · Prénom · Nom de l'entreprise · E-mail · site web ·
 *   Adresse de l'entreprise · Secteur d'activité · lien du logo · validation
 * (les colonnes Lat / Lng sont créées automatiquement si absentes)
 */

var SHEET_NAME = ''; // '' = première feuille de l'onglet ; sinon mets le nom exact de l'onglet

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
}

function norm_(s) {
  return String(s == null ? '' : s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function ensureCoordCols_(sheet) {
  var last = Math.max(1, sheet.getLastColumn());
  var headers = sheet.getRange(1, 1, 1, last).getValues()[0].map(norm_);
  if (headers.indexOf('lat') < 0) { last++; sheet.getRange(1, last).setValue('Lat'); }
  if (headers.indexOf('lng') < 0) { last++; sheet.getRange(1, last).setValue('Lng'); }
}

function cols_(sheet) {
  ensureCoordCols_(sheet);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(norm_);
  var exact = function (v) { return headers.indexOf(v) + 1; };            // 0 si absent
  var has   = function (v) { return headers.findIndex(function (h) { return h.indexOf(v) > -1; }) + 1; };
  return {
    nom:        exact('nom'),          // "Nom" (personne) — exact pour ne pas confondre avec "Nom de l'entreprise"
    prenom:     has('prenom'),
    entreprise: has('entreprise'),
    email:      has('mail'),
    site:       has('site'),
    adresse:    has('adresse'),
    secteur:    has('secteur'),
    logo:       has('logo'),
    validation: has('validat'),
    fill:       has('plein'),   // colonne "Logo plein" (case à cocher)
    lat:        exact('lat'),
    lng:        exact('lng')
  };
}

function geocode_(addr) {
  if (!addr) return null;
  try {
    var res = Maps.newGeocoder().setRegion('fr').geocode(String(addr) + ', France');
    if (res.status === 'OK' && res.results[0]) {
      var l = res.results[0].geometry.location;
      return { lat: l.lat, lng: l.lng };
    }
  } catch (err) {}
  return null;
}

function reply_(e, obj) {
  var body = JSON.stringify(obj);
  var cb = e && e.parameter && e.parameter.callback;
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + body + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

function isTrue_(v) { // accepte la case cochée (booléen) OU le texte "TRUE"/"VRAI"
  if (v === true) return true;
  var s = String(v).trim().toUpperCase();
  return s === 'TRUE' || s === 'VRAI' || s === 'OUI' || s === '1';
}

function num_(v) { // gère les nombres et le format français "48,86"
  if (typeof v === 'number') return v;
  if (v === '' || v == null) return NaN;
  return parseFloat(String(v).replace(',', '.'));
}

/** Le site récupère ici les entreprises validées. */
function doGet(e) {
  var sheet = getSheet_();
  var c = cols_(sheet);
  var out = [];
  var geocodedThisCall = 0;
  var CAP = 10; // au plus 10 géocodages par chargement (évite les dépassements de temps)
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    for (var i = 0; i < values.length; i++) {
      var r = values[i];
      var validated = c.validation > 0 && isTrue_(r[c.validation - 1]);
      if (!validated) continue;
      var name = c.entreprise > 0 ? r[c.entreprise - 1] : '';
      if (!name) continue;

      var lat = num_(c.lat > 0 ? r[c.lat - 1] : '');
      var lng = num_(c.lng > 0 ? r[c.lng - 1] : '');
      if ((isNaN(lat) || isNaN(lng)) && c.adresse > 0 && geocodedThisCall < CAP) {
        var g = geocode_(r[c.adresse - 1]);
        geocodedThisCall++;
        if (g) {
          lat = g.lat; lng = g.lng;
          if (c.lat > 0) sheet.getRange(i + 2, c.lat).setValue(lat); // cache
          if (c.lng > 0) sheet.getRange(i + 2, c.lng).setValue(lng);
        }
      }
      if (isNaN(lat) || isNaN(lng)) continue; // pas encore de coordonnées -> on saute

      out.push({
        name:   name,
        sector: c.secteur > 0 ? r[c.secteur - 1] : '',
        url:    c.site    > 0 ? r[c.site - 1]    : '',
        logo:   c.logo    > 0 ? r[c.logo - 1]    : '',
        fill:   c.fill    > 0 ? isTrue_(r[c.fill - 1]) : false,
        lat:    lat,
        lng:    lng
      });
    }
  }
  return reply_(e, out);
}

/**
 * À LANCER UNE FOIS depuis l'éditeur Apps Script (menu ▷ Exécuter) après un gros
 * import : géocode toutes les lignes validées qui n'ont pas encore de Lat/Lng.
 * S'arrête avant la limite de temps ; relance-la si besoin jusqu'à ce que tout soit rempli.
 */
function geocodeAll() {
  var sheet = getSheet_();
  var c = cols_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var start = new Date().getTime();
  var done = 0, skipped = 0;
  for (var i = 0; i < values.length; i++) {
    if (new Date().getTime() - start > 280000) break; // ~4 min 40, marge sous la limite de 6 min
    var r = values[i];
    var validated = c.validation > 0 && isTrue_(r[c.validation - 1]);
    if (!validated) continue;
    if (c.entreprise > 0 && !r[c.entreprise - 1]) continue;
    var hasLat = !isNaN(num_(c.lat > 0 ? r[c.lat - 1] : ''));
    var hasLng = !isNaN(num_(c.lng > 0 ? r[c.lng - 1] : ''));
    if (hasLat && hasLng) { skipped++; continue; }
    if (c.adresse <= 0) continue;
    var g = geocode_(r[c.adresse - 1]);
    if (g) {
      if (c.lat > 0) sheet.getRange(i + 2, c.lat).setValue(g.lat);
      if (c.lng > 0) sheet.getRange(i + 2, c.lng).setValue(g.lng);
      done++;
    }
  }
  Logger.log('Géocodage : ' + done + ' ajoutées, ' + skipped + ' déjà présentes.');
}

/** Le formulaire du site ajoute une entreprise (validation décochée par défaut). */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(5000);
  try {
    var sheet = getSheet_();
    var c = cols_(sheet);
    var p = (e && e.parameter) || {};
    var row = [];
    for (var i = 0; i < sheet.getLastColumn(); i++) row.push('');
    function put(col, val) { if (col > 0) row[col - 1] = val || ''; }
    put(c.nom, p.nom);
    put(c.prenom, p.prenom);
    put(c.entreprise, p.entreprise);
    put(c.email, p.email);
    put(c.site, p.site);
    put(c.adresse, p.adresse);
    put(c.secteur, p.secteur);
    put(c.logo, p.logo);
    sheet.appendRow(row);
    return reply_(e, { ok: true });
  } catch (err) {
    return reply_(e, { ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
