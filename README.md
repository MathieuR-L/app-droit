# GAVence

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
- Upload d'un PDF de garde a vue par le policier.
- Resume automatique local du PDF visible par l'avocat sans cle API.
- Resume du PDF via Gemini quand `GEMINI_API_KEY` est configure, avec repli local sinon.
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
- `npm run test`: tests unitaires du bootstrap Vercel et de l'authentification.
- `npm run start`: lance le build.
- `npm run lint`: verification ESLint.
- `npm run db:migrate`: cree le schema SQLite local.
- `npm run db:seed`: recharge les donnees de demonstration.
- `npm run db:studio`: ouvre Prisma Studio.

## Notes

- Le delai de reponse est configurable par ville depuis l'espace batonnier.
- Les avocats peuvent s'inscrire sans ville; le batonnier leur en assigne une ensuite.
- L'escalade est traitee cote serveur et se reflechit automatiquement dans les tableaux de bord via rafraichissement regulier.
- Les PDF sont stockes localement dans `storage/custody-records` et servis via une route authentifiee.
- Si un PDF ne contient pas de texte exploitable, le document reste disponible et le resume indique qu'un OCR ou un LLM serait preferable.
- Si `GEMINI_API_KEY` est defini, l'application utilise aussi l'API Gemini pour produire un resume plus robuste du PDF original. La variable `GEMINI_MODEL` permet de choisir le modele, par defaut `gemini-2.5-flash`.
- En deployment Vercel, l'application copie `prisma/dev.db` vers `/tmp/app-droit.db` pour permettre une execution de demo sans base externe. Les donnees restent donc ephemeres et peuvent etre reinitialisees a tout moment.
- `next.config.ts` force aussi l'inclusion de `prisma/dev.db` dans le bundle serveur pour eviter un 500 au runtime si le fichier n'est pas trace automatiquement.
- Si `SESSION_SECRET` n'est pas defini, l'application utilise automatiquement un secret de demonstration integre pour que les comptes demo restent utilisables. Un vrai `SESSION_SECRET` reste recommande pour une production serieuse.
