# Portefeuille IA — benchmark et finances

Application gratuite à installer sur son propre hébergement. Aucun compte GitHub n’est nécessaire pour télécharger le ZIP. L’hébergement, la base et les éventuels appels IA restent à la charge de chaque utilisateur.

Une application en français pour comparer des solutions et établir la rentabilité prévisionnelle de projets. Chaque installation utilise son propre serveur et sa propre base MariaDB.

## Ce que permet l’application

- Importer des documents (TXT, DOCX, PPTX, PDF) et lire les scans ou images par OCR français/anglais.
- Relire le texte puis extraire les frictions avec son propre service Infomaniak, si configuré.
- Cadrer le besoin, le statu quo et les variantes, avec ou sans IA.
- Comparer des critères pondérés, leurs preuves et les conditions bloquantes.
- Saisir les dépenses, le travail interne, la formation et les coûts mensuels.
- Calculer le coût total, le gain net, le ROI, la VAN et le délai de remboursement.
- Distinguer le temps de travail libéré des économies budgétaires effectivement réalisables.
- Exporter le projet en JSON, le tableau annuel en CSV et le dossier via l’impression PDF du navigateur.
- Enregistrer les projets avec des comptes lecteur ou rédacteur et une protection contre les modifications concurrentes.

L’exemple fourni est entièrement fictif. Les mesures et les notes restent à renseigner. Les profils A et B, initialisés à 120 et 80 CHF/h, sont modifiables : ils ne constituent pas des tarifs officiels. Les clés JSON `police` et `civil` sont conservées pour la compatibilité des exports.

## Commencer

1. Sur GitHub, choisir **Code → Download ZIP**, puis décompresser le fichier.
2. Suivre le [guide d’installation](INSTALLATION.md).
3. Importer un document d’initialisation ou créer un projet vierge.
4. Documenter les sources, mesurer les temps et exporter le travail.

Sans base configurée, la création d’un projet vierge et les exports fonctionnent si le dossier `public/` est servi en HTTP. L’enregistrement serveur nécessite l’installation complète. Aucune sauvegarde automatique n’a lieu en mode démonstration : exporter le JSON avant de fermer la page.

GitHub héberge les sources. Le site PHP doit être installé sur un hébergement compatible ; GitHub Pages n’exécute pas PHP.

## Technique

PHP 8.5, PDO MySQL/MariaDB, sessions, JSON ; MariaDB 10.11 ; serveur Apache avec HTTPS. HTML, CSS et JavaScript natifs, sans compilation. OCR local au navigateur avec composants statiques installés par Python 3. Lecture PDF texte avec Composer ; connexion Infomaniak facultative, désactivée par défaut. Installer à la racine d’un site ou sous-domaine dédié, avec `public/` comme racine HTTP.

Les fichiers de configuration privés, les données de travail et les journaux sont exclus du dépôt. Chaque utilisateur crée ses propres comptes et mots de passe. Ne jamais déposer de configuration réelle ni d’exports de projets dans un dépôt public.

## Méthode de calcul

Coût d’une ligne = dépense externe + heures internes × taux complet. Ne pas compter deux fois les charges déjà incluses dans ce taux, ni les heures déjà couvertes par une facture externe.

Coût total = investissement initial + nombre d’années × fonctionnement annuel. Le fonctionnement annuel correspond à 12 mois de charges, payé intégralement même lorsque l’adoption est progressive.

Heures réutilisables = volume annuel × (temps avant − temps avec la solution − temps de contrôle) / 60 × part réutilisable. Les pertes de temps restent négatives. Les gains annuels sont ajustés à l’usage effectif ; les autres dépenses supprimées sont comptées à 100 % dès la première année.

Le cumul déduit les coûts initiaux et annuels. ROI = cumul net / coût total. La VAN actualise les flux en fin d’année. Le remboursement est interpolé dans l’année du premier passage du cumul à zéro, sans extrapolation au-delà de l’horizon.

Seule la part explicitement justifiée du temps converti en économies salariales est comptée en trésorerie. Un gain de capacité ne réduit pas automatiquement les dépenses. Une mesure manquante laisse les gains indéterminés. TVA, inflation, renouvellement et réserves ne sont pas ajoutés automatiquement : les documenter dans les hypothèses.

Le score du benchmark est la moyenne pondérée des notes de 1 à 5. Une note manquante rend le score incomplet. Une condition bloquante reste bloquante quel que soit le score. Aucun classement ne vaut une autorisation de déploiement.

## Vérifications et limites

Exécuter `node tests/finance.test.mjs` pour contrôler le moteur de calcul ; Node.js n’est pas nécessaire sur l’hébergement. Les vérifications syntaxiques PHP : `find . -name '*.php' -exec php -l {} \;`.

La version dont ce projet est issu a été utilisée sur PHP 8.5 et MariaDB 10.11. Le script de configuration portable doit être vérifié sur chaque nouvel hébergement. Les tests financiers ne constituent pas une recette complète ni un audit de sécurité.

Pas de récupération de mot de passe, de gestion des comptes par interface, de restauration d’historique par interface ni de collecte automatique des consommations IA. Les versions sont conservées en base. Définir la conservation et tester une sauvegarde/restauration avant une utilisation durable. Utiliser des exemples sans données sensibles pour la formation.

## Contributions et partage

Pour signaler un problème, ouvrir une issue en décrivant les étapes de reproduction avec un exemple fictif. Ne jamais y joindre de mots de passe, de configuration privée ou de données personnelles.

Aucune licence de redistribution n’est encore définie. La rendre explicite avant de réutiliser ou redistribuer le code au-delà du partage convenu avec l’auteur.


## Version 2 — Explorer et transposer

Un nouvel onglet accompagne la recherche de cas dans d’autres secteurs : friction et lien stratégique, sources datées et niveau de preuve, mécanisme, domaines et cercle d’impact, quatre dépendances, test et cinq critères d’innovation. Les statuts sont argumentés et datés : brouillon, adopter au catalogue, surveiller ou écarter pour l’instant. Adopter au catalogue ne vaut pas autorisation de déploiement et ne déclenche aucune priorisation automatique.

Les fiches retenues et documentées peuvent préparer une variante de comparaison, avec des coûts à renseigner, des gains inconnus et des notes non attribuées. Le lien vers la fiche d’origine est conservé et les doublons sont refusés. Les déclarations de vérification et de validation sont renseignées par l’utilisateur, elles ne constituent pas une certification automatique.

La préparation de consignes reste facultative et sans appel réseau : trois consignes peuvent être préparées (exploration, transposition, préparation du benchmark), relues puis téléchargées en TXT pour utilisation dans un outil autorisé. Aucun fournisseur, compte, abonnement ou clé API n’est requis pour cette préparation de consignes. La V3 ajoute une connexion Infomaniak facultative, à configurer séparément. Les réponses se reprennent manuellement dans les champs ; les notes issues de l’IA restent identifiées comme brouillons. Retirer les données sensibles avant tout envoi à un outil externe. Aucun résultat trouvé ailleurs n’est automatiquement converti en gain local.

L’export JSON conserve les fiches et leur journal de méthode, le CSV spécifique exporte l’analyse structurée et le dossier imprimable inclut les fiches complètes. Le CSV financier garde son format existant. La matrice domaines × cercles aide à explorer, sans imposer de remplir toutes les cases.

Compatibilité : les projets et exports V1 restent lisibles. Aucune modification SQL nécessaire : le champ optionnel `exploration` est conservé dans le document JSON déjà stocké. Mettre à jour `src/validation.php`, `public/assets/explore.mjs`, `public/assets/app.mjs`, `public/assets/style.css` et `public/index.html` ensemble. Préserver la configuration privée et les données. Recharger les anciens onglets après mise à jour ; terminer/exporter auparavant le travail non enregistré.

Contrôles : `node tests/explore.test.mjs` et `php tests/explore.test.php`, en complément des tests financiers. Le second vérifie les anciens projets, les statuts documentés, les sources, les dates et les liens entre fiches et variantes. Les fixtures sont entièrement fictives.

Méthode : adaptation du support M3 « Benchmark intersectoriel », séance du 16.11.2026 ; inspiration : https://www.micklevy.com/ia-agents-les-meilleurs-cas-dusage-pour-lentreprise/ . Ni le support pédagogique ni le catalogue de 101 cas ne sont redistribués dans le dépôt.


## Version 3 — Import de documents, OCR et analyse IA facultative

Dans **Explorer et transposer → Document source et carte d’empathie**, importer un document texte ou cliquer sur **Lire un scan ou une image (OCR)**. Les scans PDF, PNG, JPG/JPEG et WebP sont reconnus dans le navigateur en français et anglais, avec des composants servis par votre propre site. Aucun service de conversion externe n’est utilisé. Limites : 8 Mo par fichier et 10 pages par lecture OCR ; texte retenu de 24 000 caractères maximum. L’écriture manuscrite est peu fiable.

Relire et corriger le texte reconnu, puis choisir **Utiliser le texte et préparer l’analyse IA**. Le bouton **Lancer l’analyse des frictions** transmet uniquement le contexte affiché et le texte retenu au compte Infomaniak configuré par votre administrateur. Les pistes, citations et hypothèses restent à vérifier ; aucune note, économie ou décision n’est remplie automatiquement. Sans clé IA, l’import/OCR, les pistes locales, les consignes exportables et le benchmark restent utilisables après connexion.

**Installation V3 :** consulter [le guide complet](INSTALLATION.md), notamment les sections « Installer les lecteurs de documents et l’OCR », « Activer son propre service IA » et « Mettre à jour depuis V1/V2 ». Les lecteurs OCR ne sont pas inclus dans le ZIP GitHub : la commande Python indiquée les installe (environ 74 Mo). Le dépôt ne contient ni accès MariaDB, ni clé IA, ni projets ou documents privés. Les supports originaux de cours et le classeur privé du brevet ne sont pas redistribués.

Tests complémentaires : `node --test tests/*.test.mjs`, puis `php tests/friction-ai.test.php`, `php tests/source-import.test.php` et `php tests/pdf-import.test.php` après installation des dépendances PDF. Les tests utilisent des cas fictifs et ne réalisent aucun appel IA.


## Version 4 — Entrer par le besoin et piloter son portefeuille

Parcours : document d’initialisation → explorer les frictions → cas observés ailleurs **facultatif** → prototype interne ou solution externe à étudier → cadrage → benchmark et finances. « Importer un document » crée une copie de travail nommée d’après le fichier ; le texte est à relire avant de le retenir comme source. La restauration JSON reste disponible dans un volet secondaire. L’exemple fictif JSON est conservé pour les tests et les anciennes sauvegardes.

Le bouton **Tous mes projets** revient à l’accueil. En cas de modifications, choisir enregistrer et revenir, revenir sans enregistrer, ou continuer. **Écarter ou clôturer** demande un motif et conserve le projet et son historique : les projets écartés/clôturés sont rangés dans une section distincte et peuvent être rouverts. Aucun projet d’un collègue n’est écarté automatiquement. Les noms de fournisseur restent dans la configuration technique et les métadonnées, tandis que l’interface parle simplement d’analyse IA.

Pas de migration SQL : `portfolio` et l’approche envisagée sont des champs JSON facultatifs. Mettre à jour l’interface et `src/validation.php` ensemble en préservant configuration, base et lecteurs installés. Tests supplémentaires : `node tests/portfolio.test.mjs` et `php tests/portfolio.test.php`.


## Version 4 — Parcours projet et portefeuille

Le parcours commence par **Importer un document** : entrée du projet → exploration des frictions → cas observé ailleurs facultatif → prototype interne ou solution externe → cadrage. Il est possible de poursuivre sans cas intersectoriel et de laisser l’approche à préciser. Le raccourci de démonstration a été retiré de l’accueil ; la restauration JSON se trouve dans une rubrique distincte.

**Tous mes projets** ramène au portefeuille. Si des modifications sont en cours, choisir de les enregistrer, de revenir sans les enregistrer ou de continuer le projet. Les projets peuvent être écartés ou clôturés avec un motif, puis rouverts ; leurs versions restent conservées. Chaque installation choisit son propre périmètre : aucun recentrage ni projet privé de l’auteur n’est importé. Les libellés de l’assistant restent indépendants du nom du fournisseur ; la configuration technique du service reste privée.
