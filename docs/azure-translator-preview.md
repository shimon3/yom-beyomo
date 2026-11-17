# Azure Translator: démonstration

Cette branche remplace l’appel direct au service MyMemory par une fonction Cloudflare Pages (/api/translate). Le navigateur ne reçoit jamais la clé Azure.

## Configuration de l’aperçu

Dans Cloudflare Dashboard → Workers & Pages → yom-beyomo → Settings → Variables and Secrets, ajoute pour l’environnement Preview :

- Secret AZURE_TRANSLATOR_KEY : clé de la ressource Azure Translator.
- Variable AZURE_TRANSLATOR_REGION : région Azure de la ressource, si l’authentification Azure la demande.
- Variable facultative AZURE_TRANSLATOR_ENDPOINT : endpoint fourni par Azure ; par défaut le code utilise https://api.cognitive.microsofttranslator.com.

Redéploie l’aperçu après avoir ajouté ces valeurs. Ne place jamais la clé dans index.html ou dans GitHub. Pour cette branche de démonstration, configure les valeurs dans Preview uniquement ; ne les ajoute pas à Production.

Les traductions réussies sont mises en cache dans le navigateur. Le site appelle l’API seulement quand la traduction est demandée et lorsqu’aucune traduction n’est déjà en cache.
