# Installation sur son propre hébergement

Ce guide convient à un site Apache/PHP disposant de MariaDB, notamment un hébergement compatible Infomaniak. Les intitulés du gestionnaire peuvent varier.

## 1. Préparer un espace distinct

Créer un site ou sous-domaine dédié en HTTPS, avec PHP 8.5 et les extensions PDO MySQL, JSON et sessions. Désactiver l’affichage public des erreurs PHP. Prévoir l’accès SSH/terminal de l’hébergement pour l’assistant de configuration.

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

## 4. Premier usage

Ouvrir l’URL du site. Déplier « Connexion à l’application hébergée » et utiliser le compte applicatif. Ouvrir l’exemple fictif ou créer un projet vide, puis cliquer sur « Enregistrer ».

Pour reprendre un projet exporté, choisir « Importer un JSON », vérifier son contenu puis l’enregistrer. La démonstration sans connexion ne sauvegarde rien en base.

## 5. Vérifier avant de partager son installation

- Enregistrer un projet fictif et vérifier qu’il réapparaît après reconnexion.
- Vérifier les exports JSON et CSV et l’impression PDF.
- Ouvrir le même projet dans deux fenêtres : après un premier enregistrement, l’ancienne version doit être refusée à l’enregistrement.
- Vérifier que `/config/config.local.php`, `/sql/001_schema.sql` et `/var/` sont inaccessibles depuis l’URL publique. Un fichier privé ne doit jamais être téléchargé.
- Vérifier qu’un appel à `api.php?action=projects` sans connexion est refusé.
- Tester une sauvegarde et sa restauration sur un environnement distinct.

Les sessions expirent après 30 minutes d’inactivité. Les tentatives de connexion sont limitées par IP ; un proxy commun peut partager cette limite. Les comptes sont administrés dans le fichier privé de configuration : rôle `editor` pour modifier, `reader` pour consulter.

## Mettre à jour

Sauvegarder les fichiers privés et la base avant une mise à jour. Préserver `config/config.local.php` et `var/`, comparer les évolutions SQL puis appliquer seulement les migrations nécessaires. Ne jamais importer une sauvegarde ou une configuration privée dans GitHub.
