# Installation sur son propre hébergement

Ce guide convient à un site Apache/PHP disposant de MariaDB, notamment un hébergement compatible Infomaniak. Les intitulés du gestionnaire peuvent varier.

## 1. Préparer un espace distinct

Créer un site ou sous-domaine dédié en HTTPS, avec PHP 8.5 et les extensions PDO MySQL, JSON, sessions, mbstring, cURL, DOM/XML et ZIP. Désactiver l’affichage public des erreurs PHP. Prévoir l’accès SSH/terminal de l’hébergement pour l’assistant de configuration.

Le téléchargement est gratuit et ne demande aucun compte GitHub : **Code → Download ZIP**. Chacun doit disposer de son propre hébergement et de sa propre base MariaDB.

Télécharger et décompresser le ZIP depuis GitHub, puis transférer **tout le dossier**, y compris les fichiers `.htaccess`, par SFTP. Configurer la racine HTTP du site sur le sous-dossier **`public/`**. Les dossiers `config/`, `src/`, `bin/`, `sql/` et `var/` doivent rester hors de la racine HTTP. Ne pas déplacer leur contenu dans `public/`.

Exemple de disposition :

```
portefeuille-ia/
  public/       ← seule racine HTTP du site
  config/
  src/
  bin/
  sql/
  var/
```

Le déploiement dans un sous-chemin d’un autre site n’est pas pris en charge par ce guide. Utiliser une origine dédiée, par exemple `https://projets.exemple.ch`.

## 2. Créer la base

Créer une **nouvelle base dédiée**, puis importer `sql/001_schema.sql` dans phpMyAdmin ou avec le compte de migration. Le script crée `bf_projects` et `bf_events` ; ne pas l’importer dans la base d’une autre application.

Créer un utilisateur MariaDB limité à cette base. L’application a besoin de SELECT, INSERT et UPDATE sur `bf_projects`, ainsi que SELECT et INSERT sur `bf_events` (SELECT est utilisé par l’assistant pour contrôler le schéma). Elle n’a pas besoin de supprimer des tables, de créer des utilisateurs ou d’accéder aux autres bases.

Noter dans son gestionnaire de mots de passe le serveur, le nom de base, l’utilisateur et son mot de passe. Ne pas les envoyer à l’auteur ni les publier sur GitHub.

## 3. Configurer l’application

Depuis un terminal SSH, se placer dans le dossier du projet puis lancer :

```sh
php bin/configure.php
```

L’assistant demande l’origine HTTPS exacte, sans slash final, les accès MariaDB et le compte applicatif à créer. Ce dernier est distinct du compte MariaDB. Choisir un mot de passe applicatif d’au moins 14 caractères. La saisie des mots de passe est masquée ; aucun mot de passe n’est passé dans la commande.

L’assistant vérifie la connexion et les deux tables, puis crée `config/config.local.php`. Il ne crée pas les tables, n’importe aucun projet et refuse d’écraser une configuration existante. Un terminal Unix avec `stty` et les fonctions PHP `exec` et `stream_isatty` est requis. Si le masquage n’est pas disponible, le script s’arrête.

Donner au processus PHP le droit de lire la configuration privée et d’écrire dans `var/`. Préférer les permissions 0600 pour la configuration et 0700 pour `var/` lorsque le propriétaire et le fonctionnement de l’hébergement le permettent. Ne pas appliquer 0777.

### Configuration manuelle si l’assistant est indisponible

Copier `config/config.example.php` vers `config/config.local.php` **hors du web**. Renseigner l’origine HTTPS, le DSN, l’utilisateur et le mot de passe MariaDB, puis un identifiant applicatif et son hash de mot de passe. Le modèle ne contient aucun compte actif par défaut.

`php bin/password.php` produit un hash à coller dans le champ `hash`. La saisie est masquée et requiert le même terminal interactif que l’assistant. Si ces fonctions ne sont pas disponibles sur votre hébergement, faire produire le hash dans un terminal PHP de confiance par votre administrateur. Un hash ne remplace pas le mot de passe MariaDB. Ne pas coller de mot de passe en clair dans `hash`.

Pour une personne sans accès terminal, demander à l’administrateur de son hébergement de préparer la configuration privée. Aucun formulaire public d’installation n’est fourni.

## 4. Installer les lecteurs de documents et l’OCR

Depuis le terminal SSH, dans le dossier contenant ce guide :

```sh
python3 bin/install-ocr-assets.py
```

Python 3 sert uniquement à l’installation. Le script télécharge les versions épinglées depuis le registre officiel npm, vérifie leur intégrité SHA-512 et prépare environ 74 Mo dans `public/assets/vendor-ocr-v1/`, avec les licences et un manifeste SHA-256. Le traitement OCR lui-même s’exécute dans le navigateur. Aucun compte npm, Node.js, clé IA ni abonnement OCR n’est nécessaire. Autoriser la sortie HTTPS vers registry.npmjs.org pendant l’installation. Attendre le bilan final indiquant les fichiers et octets installés.

Si Python n’est pas disponible sur l’hébergement, exécuter la même commande dans le dossier de l’application sur un ordinateur équipé de Python 3, puis transférer tout `public/assets/vendor-ocr-v1/` par SFTP. Ce dossier n’est **pas inclus** dans le téléchargement GitHub. Conserver `public/.htaccess` : il déclare le type MIME WebAssembly. Ne pas désactiver la politique de sécurité pour faire fonctionner l’OCR.

Pour lire aussi les PDF contenant du texte, installer Composer 2 depuis son site officiel si nécessaire, puis lancer :

```sh
composer install --working-dir=pdf-dependencies --no-dev --no-plugins --no-scripts
```

Cela prépare `vendor-pdf/` **hors de `public/`**. Sans Composer sur le serveur, effectuer cette installation sur une machine PHP de confiance, puis transférer `vendor-pdf/`. Les versions de pdfparser et de son polyfill sont épinglées dans `pdf-dependencies/composer.json`. Sans ce lecteur PHP, le bouton OCR reste disponible pour les PDF, mais leur extraction de texte native n’est pas annoncée, sauf si `pdftotext` est déjà disponible sur l’hébergement. DOCX et PPTX nécessitent ZIP et DOM/XML ; TXT nécessite mbstring.

Sur l’hébergement, vérifier aussi les limites PHP : `upload_max_filesize` au moins 8M, `post_max_size` au moins 10M, mémoire au moins 192M pour la lecture PDF texte. La limite applicative reste 8 Mo. Ne pas publier de page phpinfo.

Utiliser un navigateur récent (Chrome, Edge, Firefox ou Safari). Le premier chargement du lecteur peut être plus long. La lecture OCR est bornée à 10 pages et 180 secondes par lancement ; sélectionner une autre plage pour continuer. Pour un PDF mixte (texte et pages scannées), ouvrir explicitement le bouton OCR pour lire les pages scannées. Les pages non sélectionnées ou non lisibles restent signalées.

## 5. Activer son propre service IA (facultatif)

L’application et l’OCR fonctionnent sans clé IA. Pour obtenir les frictions directement dans l’application, chaque installation utilise **son propre compte Infomaniak AI Services**, son propre produit, sa clé et un modèle accessible à ce produit. Les appels sont facturés selon les conditions du fournisseur ; la gratuité de l’application ne les inclut pas.

Dans `config/config.local.php`, ajouter le bloc `friction_ai` du modèle `config/config.example.php` :

```php
'friction_ai' => [
    'enabled' => true,
    'endpoint' => 'https://api.infomaniak.com/2/ai/VOTRE_ID_NUMERIQUE/openai/v1/chat/completions',
    'api_key' => 'VOTRE_CLE_PRIVEE',
    'model' => 'IDENTIFIANT_EXACT_DU_MODELE',
],
```

Remplacer les trois valeurs avec celles de son espace Infomaniak. Ne pas copier la configuration d’un autre collègue. L’identifiant du produit dans l’URL doit être numérique ; l’application limite les appels à cet endpoint HTTPS Infomaniak. PHP cURL doit pouvoir joindre api.infomaniak.com avec la validation TLS active et les autorités de certification du serveur à jour. Ne jamais placer la clé dans le JavaScript, une capture d’écran, une URL publique ou un dépôt GitHub. Le fichier local reste privé. Pour désactiver l’IA, mettre `enabled` à `false`.

Le corpus `config/methode-m3.json` contient uniquement des repères génériques de fonctionnement. L’analyse n’effectue aucune recherche web : les sources d’un benchmark restent à vérifier par l’utilisateur. Les appels sont réservés au rôle `editor`, avec aperçu du contexte, confirmation par clic, protection session/origine/CSRF et limite de 20 tentatives par compte et par jour UTC. Un appel échoué peut compter dans cette limite et la facturation dépend du fournisseur.

## 6. Premier usage

Ouvrir l’URL du site. Déplier « Connexion à l’application hébergée » et utiliser le compte applicatif. Ouvrir l’exemple fictif ou créer un projet vide, puis cliquer sur « Enregistrer ».

Pour reprendre un projet exporté, choisir « Importer un JSON », vérifier son contenu puis l’enregistrer. La démonstration sans connexion ne sauvegarde rien en base.

## 7. Vérifier avant de partager son installation

- Enregistrer un projet fictif et vérifier qu’il réapparaît après reconnexion.
- Vérifier les exports JSON et CSV et l’impression PDF.
- Ouvrir le même projet dans deux fenêtres : après un premier enregistrement, l’ancienne version doit être refusée à l’enregistrement.
- Vérifier que `/config/config.local.php`, `/sql/001_schema.sql` et `/var/` sont inaccessibles depuis l’URL publique. Un fichier privé ne doit jamais être téléchargé.
- Vérifier qu’un appel à `api.php?action=projects` sans connexion est refusé.
- Avec un compte rédacteur, importer un TXT fictif puis un PNG net ou un PDF scanné fictif via le bouton OCR ; corriger le texte et vérifier sa référence. Le texte retenu ne doit pas écraser la source existante sans choix explicite.
- Si le lecteur PDF PHP est installé, vérifier un PDF texte et le signalement des pages sans texte.
- Sans clé IA, vérifier que les fonctions d’import/OCR et les consignes restent accessibles après connexion. Avec sa propre clé IA, effectuer un test fictif via l’aperçu ; un appel réel peut être facturé.
- Tester une sauvegarde et sa restauration sur un environnement distinct.

Les sessions expirent après 30 minutes d’inactivité. Les tentatives de connexion sont limitées par IP ; un proxy commun peut partager cette limite. Les comptes sont administrés dans le fichier privé de configuration : rôle `editor` pour modifier, `reader` pour consulter.

## Mettre à jour

Sauvegarder les fichiers privés et la base avant une mise à jour. Préserver `config/config.local.php` et `var/`, comparer les évolutions SQL puis appliquer seulement les migrations nécessaires. Ne jamais importer une sauvegarde ou une configuration privée dans GitHub.


### Mettre à jour depuis V1/V2

1. Exporter les projets et sauvegarder la base, `config/config.local.php` et `var/`. Terminer ou exporter le travail non enregistré avant de recharger les onglets.
2. Télécharger la nouvelle version et remplacer ensemble les fichiers publics, `src/` et les outils `bin/`, tout en préservant la configuration privée, `var/` et les données. Ajouter le fichier générique `config/methode-m3.json` ; ne pas remplacer la configuration locale par le modèle. Aucun changement SQL n’est nécessaire pour cette V3 : les sources et analyses sont des champs optionnels du document JSON existant.
3. Installer les lecteurs comme indiqué à la section 4. Préserver `vendor-pdf/` et `public/assets/vendor-ocr-v1/` s’ils existent déjà ; relancer les commandes lors d’une mise à jour de leurs versions.
4. Ajouter seulement si souhaité le bloc IA à la configuration privée, sans changer les comptes ni les accès MariaDB existants.
5. Recharger le site, se reconnecter, ouvrir un projet et refaire les vérifications avec un exemple fictif. Les nouveaux fichiers portent des versions de cache ; ne pas supprimer les données pour résoudre un ancien onglet.

Le mode démonstration conserve les exports JSON/CSV/PDF. L’import de sources et l’OCR sont proposés dans la session d’un rédacteur d’une installation configurée. L’enregistrement reste explicite : cliquer sur **Enregistrer** après avoir retenu la source ou conservé une analyse.
