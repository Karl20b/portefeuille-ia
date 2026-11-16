# Portefeuille IA — benchmark et finances

Une application en français pour comparer des solutions et établir la rentabilité prévisionnelle de projets. Chaque installation utilise son propre serveur et sa propre base MariaDB.

## Ce que permet l’application

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
3. Ouvrir l’exemple fictif ou créer un projet vierge.
4. Documenter les sources, mesurer les temps et exporter le travail.

Sans base configurée, l’exemple et les exports fonctionnent si le dossier `public/` est servi en HTTP. L’enregistrement serveur nécessite l’installation complète. Aucune sauvegarde automatique n’a lieu en mode démonstration : exporter le JSON avant de fermer la page.

GitHub héberge les sources. Le site PHP doit être installé sur un hébergement compatible ; GitHub Pages n’exécute pas PHP.

## Technique

PHP 8.5, PDO MySQL/MariaDB, sessions, JSON ; MariaDB 10.11 ; serveur Apache avec HTTPS. HTML, CSS et JavaScript natifs, sans Composer, sans compilation et sans appel à un service IA. Installer à la racine d’un site ou sous-domaine dédié, avec `public/` comme racine HTTP.

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
