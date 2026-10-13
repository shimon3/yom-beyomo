# יום ביומו

Lecteur quotidien du 'Hitat et des études journalières (Houmach avec Rachi, Tehillim, Tanya, Rambam 1 et 3 chapitres, Michna, Daf Yomi).

Site 100 % statique : aucun serveur, aucune clé d'API. Les textes et le calendrier sont chargés en direct depuis :

- [Sefaria](https://developers.sefaria.org) — `api/calendars` (paracha et alyot, Tanya Yomi, Rambam, Michna, Daf) et `api/v3/texts` (textes)
- [Hebcal](https://www.hebcal.com/home/developer-apis) — date hébraïque et heure du coucher du soleil

## Fonctionnement

- **Houmach** : alya du jour selon le jour de la semaine (dimanche = 1re, Chabbat = 7e), Rachi verset par verset.
- **Tehillim** : cycle mensuel Habad (table de 30 jours), le 29 d'un mois de 29 jours donne 140–150.
- **Tanya** : portion « Tanya Yomi » du calendrier Sefaria, de la référence du jour jusqu'à celle du lendemain.
- **Coucher du soleil** : option pour passer automatiquement au lendemain après la chkia.
- **Israël / diaspora** : déduit de la ville choisie (paramètre `diaspora` de Sefaria).
- **Application installable (PWA)** et lecture hors ligne : bouton « שמירת 7 הימים הבאים » dans les réglages.
- **Mode « הכול בדף אחד »** : tout le programme du jour sur une seule page.
- **Sefer HaMitsvot** : programme du jour via Hebcal (`dsm=on`), textes Sefaria (domaine public).
- **Partager** : envoie le programme du jour avec un lien `?d=AAAA-MM-JJ` (WhatsApp ou partage du téléphone).
- **Interface en hébreu ou en français** (réglages), les textes restent en hébreu.
- **Alerte** quand Sefaria ou Hebcal ne répond pas, avec bouton « réessayer ».
- **Découpages Habad** : exceptions par rapport à Sefaria dans `CHABAD_ALIYOT` ; pendant une fête, la paracha suivante est étudiée.

## Licences des textes

| Texte | Version Sefaria | Licence |
|---|---|---|
| Tanakh | Tanach with Nikkud | Domaine public |
| Rachi | Rosenbaum & Silbermann | Domaine public |
| Rambam, Michna | Torat Emet | Domaine public |
| Tanya | Kehot Publication Society | CC-BY-NC |
| Talmud | William Davidson Edition | CC-BY-NC |

Les textes CC-BY-NC imposent un usage **non commercial** avec attribution.
Hayom Yom et la brochure « Dvar Malkhout » ne sont pas reproduits : le site renvoie vers leurs pages officielles.

## Déploiement (Cloudflare Pages)

Projet relié à ce dépôt GitHub. Réglages : *Framework preset* = None, *Build command* = vide, *Build output directory* = `/`.
Chaque `git push` sur `main` republie le site.

## Licence

Code sous licence MIT (voir `LICENSE`). Les textes chargés depuis Sefaria gardent leurs propres licences (tableau ci-dessus).

## Statistiques privées (`/stats`)

La page et l'API `/api/stats` sont protégées côté serveur par vérification de signature
JWT **Cloudflare Access** (RS256, JWKS, audience, émetteur et expiration).
**Fail-closed** : sans configuration Access valide, elles répondent 503/403 et aucune donnée n'est divulguée.
La page ne doit pas être mise en ligne avant configuration et test de l'application Access.

1. Dans **Cloudflare Zero Trust → Access → Applications**, créer une application **Self-hosted**
   couvrant **yom-beyomo.pages.dev/stats** et **yom-beyomo.pages.dev/api/stats**
   (ou deux applications partageant la même audience si Cloudflare le permet, sinon adapter la validation).
   Définir une policy **Allow** limitée à votre adresse email exacte, avec une méthode d'identification sécurisée.
   Ne pas utiliser une policy Allow Everyone.
2. Dans les **variables d'environnement Cloudflare Pages** du projet, définir :
   - `ACCESS_TEAM_DOMAIN` : URL complète `https://<team>.cloudflareaccess.com` sans slash final.
   - `ACCESS_AUD` : **Application AUD tag** de l'application Access protégeant les deux URLs.
   Ne jamais mettre ces valeurs dans l'HTML. Le JWT n'est pas conservé dans D1.
3. Dans **Workers & Pages → D1 → yom-beyomo → Console**, inspecter en lecture seule :
   `SELECT name FROM sqlite_master WHERE type='table'`,
   `PRAGMA table_info(visits)`, `PRAGMA table_info(feedback)`.
   Tables attendues par le code existant :
   `visits(day, uid, lang, city, standalone)` avec unicité `(day,uid)` ;
   `feedback(created, uid, rating, message, contact, lang, page)`.
   Cette modification ne crée aucune table, n'efface rien et n'ajoute aucune migration.
4. Tester sans authentification `/stats` et `/api/stats` : aucun chiffre ni message privé ne doit être rendu.
   Puis authentifié : consulter graphiques, langues, villes sélectionnées et avis ; tester une erreur D1.
   Vérifier l'absence de cache public pour les réponses et l'absence d'indexation.

**Portée des mesures :** le script de visite n'enregistre au maximum qu'une visite par appareil/jour
(si DNT désactivé et requête réussie). `COUNT(DISTINCT uid)` approxime des appareils,
pas des personnes. Le tableau affiche les 90 dernières journées présentes en base,
et les 100 derniers avis. Les coordonnées de contact des avis ne sont accessibles qu'aux administrateurs authentifiés.
