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

## Lecteur דבר מלכות (branche de préparation)

Le lien `דבר מלכות` ouvre une page interne `/dvar-malkhout.html` au lieu d'un site externe.
Le lecteur PDF est **désactivé par défaut** : le fournisseur indique que les téléchargements sont réservés à l'usage personnel (https://dvarmalchus.org/). Une autorisation explicite pour un affichage destiné aux visiteurs est à confirmer.
Aucun PDF n'est recopié, hébergé, téléchargé par le serveur ou mis en cache par cette fonctionnalité.

**Pour finir avant fusion :** obtenir l'autorisation de l'éditeur et une URL directe HTTPS officielle de PDF, vérifier sa compatibilité avec l'affichage en iframe (en-têtes CSP / X-Frame-Options), puis renseigner `dvar-malkhout-manifest.json`. Pour l'affichage automatique, il faudra une source officielle fournissant chaque semaine une correspondance vérifiable entre date, édition Israël/diaspora et PDF; ne pas deviner les URLs ou pages du jour. Tester mobile et desktop et respecter les conditions de diffusion. Sans ces points, la page affiche honnêtement « PDF non disponible ».

### Préparation de la sélection hebdomadaire

La page charge `/dvar-malkhout-manifest.json` avec refus par défaut : `publicDisplayAuthorized:false` et tableau `editions:[]`. Elle n'essaie **aucun téléchargement automatique** tant que l'autorisation et une source PDF officielle ne sont pas confirmées. Après autorisation documentée, une entrée peut être saisie manuellement dans le manifeste, par exemple avec `title`, `start`, `end` (dates ISO vérifiées), `region` (`israel`, `diaspora` ou `all`), `approved:true` et `pdfUrl` (URL HTTPS directe .pdf sur le domaine éditeur). La validation des droits et de la compatibilité iframe reste à faire. Le navigateur sélectionne une entrée en fonction du jour et de la région configurée ; aucune correspondance jour/page n'est supposée.

Ne changer `publicDisplayAuthorized` à `true` qu'après accord de l'éditeur, vérification du lien direct et des contraintes de redistribution. L'éditeur décrit les téléchargements comme réservés à l'usage personnel : https://dvarmalchus.org/ . Les options futures d'administration ou de synchronisation ne doivent pas publier ni stocker de PDF avant cet accord.

### Utilisation avant autorisation de diffusion

La branche `feature/dvar-malkhout-local-pdf-preview` permet de choisir manuellement un PDF sur l'appareil de l'utilisateur et de le lire localement dans son navigateur avec le lecteur PDF intégré. Le fichier n'est pas téléversé vers Cloudflare ni partagé avec les visiteurs ; le lecteur n'utilise que `URL.createObjectURL` puis libère l'URL avec `URL.revokeObjectURL`. Taille maximale 50 Mo. La lecture dépend du support PDF du navigateur. Aucun stockage R2, synchronisation ou récupération automatique n'est activé. Les brochures officielles ne sont pas hébergées publiquement en l'absence d'autorisation.

## Prototype privé Dvar Malkhout (branche isolée)

**État : en attente d'accord de l'éditeur.** Aucun PDF officiel n'est aspiré, stocké, diffusé ou chargé automatiquement. Le lecteur personnel accepte un fichier local dans le navigateur. Le code prépare un point d'entrée protégé `/dvar-malkhout`; il n'existe plus de copie HTML publique dans cette branche.

Le point d'entrée répond **503 par défaut**. Pour un test privé, installer préalablement une application Cloudflare Access Self-hosted ciblant le chemin `/dvar-malkhout` sur le *hostname de Preview concerné*, limitée à l'adresse de l'administrateur, puis configurer pour **Preview** :
- `ACCESS_TEAM_DOMAIN` : domaine d'équipe au format `https://<team>.cloudflareaccess.com`
- `DVAR_PRIVATE_ACCESS_AUD` : audience de **cette** application Access (ne pas réutiliser aveuglément celle des statistiques)
- `DVAR_PRIVATE_PREVIEW_ENABLED` : `true`, seulement après vérification des deux paramètres précédents.

Le serveur valide la signature et l'audience JWT via `functions/_access.js`. Tant que l'application Access n'est pas en place et que l'URL de Preview n'est pas protégée par sa politique, **ne pas considérer Preview comme privé**. Une branche GitHub d'un dépôt public n'est pas un dépôt privé. Les aperçus Cloudflare Pages sont susceptibles d'avoir des URLs publiques : il faut restreindre les aperçus dans Cloudflare Access / Pages et tester une session non autorisée. Aucun réglage Cloudflare n'a été effectué automatiquement.

**À développer après permission écrite :** connecteur de découverte de métadonnées de la nouvelle brochure sur la source officielle ; URL PDF canonique, comparaison de paracha/semaine, Israël/diaspora, journalisation, contrôles anti-SSRF et erreurs ; affichage intégré uniquement si le droit de diffusion et les en-têtes de framing le permettent. Aucun traitement automatique de brochures sous droits n'est activé.

### Détection hebdomadaire expérimentale (Preview privé)

`GET /api/dvar-weekly` exige le drapeau Preview et un JWT Cloudflare Access valide. Il consulte uniquement la page HTML publique `https://dvarmalchus.org/`, à destination fixe (pas d'URL fournie par l'utilisateur), et tente d'en extraire une plage de dates de publication. En cas d'ambiguïté ou d'échec, l'état est `not-confirmed` ou `source-unavailable`. Ce parseur dépend de la structure du site tiers : ses résultats doivent être vérifiés avant toute association automatique avec une édition du jour. Il ne télécharge ni n'héberge aucun PDF, ne fournit pas d'URL PDF, ne synchronise pas de brochure et n'active aucune republication. Test navigateur non effectué pour cette version.
