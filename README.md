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
