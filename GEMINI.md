# 🗳️ SurveyApp — Project Context

Mini SaaS monolithique de sondages avec vote par priorisation. Ce projet permet de créer des sondages où les participants classent leurs choix par ordre de préférence.

## 🚀 Vue d'ensemble
- **Objectif** : Permettre des prises de décision collectives basées sur la priorité plutôt que sur un vote unique.
- **Utilisateurs** :
  - **Admin** : Crée des sondages (identifiant `mindmaster2027`), génère des codes à 6 caractères, et visualise les statistiques.
  - **Participants** : Rejoignent un sondage via un code, choisissent un pseudo et classent les options par priorité.

## 🛠️ Stack Technique
- **Frontend** : Next.js 15, React 19, Tailwind CSS, TypeScript.
- **Backend** : Hono (Node.js), TypeScript.
- **Base de données** : SQLite via `better-sqlite3`.
- **Authentification** : JWT (JSON Web Token) pour la session administrateur.
- **Déploiement** : Monolithique sur Railway.

## 🏗️ Architecture
L'application est structurée comme un monolithe où le serveur Hono sert à la fois l'API et l'export statique du frontend Next.js.

```text
survey-app/
├── client/src/app/
│   ├── page.tsx           # Accueil — entrée du code ou login admin
│   ├── admin/page.tsx     # Panel admin — création et gestion des sondages
│   ├── survey/page.tsx    # Flux participant — vote par priorité
│   └── results/page.tsx   # Statistiques — graphiques et scores pondérés
└── server/src/
    ├── index.ts           # Serveur Hono — routes API + service fichiers statiques
    ├── db.ts              # Initialisation SQLite + Schéma (surveys, responses)
    └── routes/
        ├── auth.ts        # Authentification admin (JWT)
        └── surveys.ts     # CRUD sondages, soumission de votes, stats
```

## ⚙️ Commandes Utiles
Les scripts suivants sont définis dans le `package.json` à la racine :

- `npm run install:all` : Installe les dépendances du projet, du client et du serveur.
- `npm run dev` : Lance le frontend (port 3001) et le backend (port 3000) en mode développement.
- `npm run build` : Génère l'export statique de Next.js et compile le serveur TypeScript.
- `npm run start` : Démarre le serveur de production.

## 🧠 Concepts Clés & Décisions
- **Algorithme de Scoring** : Pour N choix sélectionnés, le rang 1 reçoit N points, le rang 2 reçoit N-1 points, etc. Les scores sont cumulés sur tous les participants pour obtenir un score pondéré global.
- **Authentification Admin** : Un seul compte admin (`mindmaster2027`). Le JWT est stocké dans le `localStorage` sous la clé `admin_token`.
- **Unicité des Tokens** : Les codes de sondage sont des chaînes alphanumériques de 6 caractères (ex: `K3MX7P`) générées aléatoirement avec vérification d'unicité.
- **Contrainte de Vote** : Un participant est identifié par son pseudo pour un sondage donné, empêchant les votes multiples (contrainte d'unicité `survey_token` + `pseudo`).
- **SPA Fallback** : Le serveur Hono redirige toutes les routes non-API vers les fichiers `index.html` correspondants pour supporter le routage côté client de Next.js.

## 📝 Variables d'Environnement
- `PORT` : Port d'écoute (par défaut 3000).
- `JWT_SECRET` : Secret pour la signature des tokens.
- `DB_PATH` : Chemin vers le fichier SQLite (par défaut `./data/survey.db`).
