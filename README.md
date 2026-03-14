# Permanence Penale

Application web juridique pour gerer les gardes a vue entre trois profils:

- `Policier`: declare une nouvelle garde a vue depuis sa ville.
- `Avocat`: recoit les notifications de permanence et accepte ou refuse dans un delai defini.
- `Batonnier`: attribue les villes aux avocats, choisit l'ordre de permanence et regle le temps de reponse.

L'application est construite avec `Next.js`, `TypeScript`, `Prisma` et `SQLite`.

## Fonctionnalites

- Authentification par email / mot de passe.
- Inscription avec role `policier`, `avocat` ou `batonnier`.
- Interface differenciee selon le metier.
- Attribution des gardes a vue par ville d'Ile-de-France.
- Escalade automatique vers l'avocat suivant si le delai de reponse expire.
- Notifications integrees a l'application.
- Tableau de bord batonnier pour definir les permanences et les delais.

## Demarrage local

1. Installer les dependances:

```bash
npm install
```

2. Initialiser la base SQLite:

```bash
npm run db:migrate
```

3. Injecter les donnees de demonstration:

```bash
npm run db:seed
```

4. Lancer l'application:

```bash
npm run dev
```

Application disponible sur `http://localhost:3000`.

## Comptes de demonstration

Mot de passe commun: `demo1234`

- `batonnier@demo.fr`
- `policier.paris@demo.fr`
- `avocat.paris1@demo.fr`

Des utilisateurs supplementaires sont aussi seeds pour `Bobigny`, `Creteil` et `Nanterre`.

## Scripts utiles

- `npm run dev`: mode developpement.
- `npm run build`: build de production.
- `npm run start`: lance le build.
- `npm run lint`: verification ESLint.
- `npm run db:migrate`: cree le schema SQLite local.
- `npm run db:seed`: recharge les donnees de demonstration.
- `npm run db:studio`: ouvre Prisma Studio.

## Notes

- Le delai de reponse est configurable par ville depuis l'espace batonnier.
- Les avocats peuvent s'inscrire sans ville; le batonnier leur en assigne une ensuite.
- L'escalade est traitee cote serveur et se reflechit automatiquement dans les tableaux de bord via rafraichissement regulier.
