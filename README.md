# 🗳️ SurveyApp — Sondages par priorité

Mini SaaS monolithique de sondages avec vote par priorisation.

## Stack

- **Frontend** : Next.js 15, React 19, Tailwind CSS, TypeScript
- **Backend** : Hono, TypeScript, Node.js
- **DB** : SQLite (better-sqlite3)
- **Déploiement** : Railway (monolithique)

## Architecture

```
survey-app/
├── client/          # Next.js frontend (export statique)
│   └── src/app/
│       ├── page.tsx          # Accueil — entrer un code ou login admin
│       ├── admin/page.tsx    # Panel admin — créer des sondages
│       ├── survey/page.tsx   # Participation — voter par priorité
│       └── results/page.tsx  # Stats — chart des scores pondérés
├── server/          # Hono API + SQLite
│   └── src/
│       ├── index.ts          # Serveur + serve static Next.js
│       ├── db.ts             # SQLite setup
│       └── routes/
│           ├── auth.ts       # POST /api/auth/login
│           └── surveys.ts    # CRUD sondages + réponses + stats
├── package.json     # Root — scripts build/start
└── railway.toml
```

## Lancement local

```bash
# Installer les dépendances
npm run install:all

# Dev (frontend sur :3001, backend sur :3000)
npm run dev

# Build complet
npm run build

# Start prod
npm run start
```

## Déploiement Railway

1. Pushez le code sur GitHub
2. Créez un nouveau projet Railway → "Deploy from GitHub repo"
3. Railway détecte `nixpacks.toml` et lance `npm run build` puis `npm run start`
4. ✅ Done !

**Variables d'environnement optionnelles :**
```
PORT=3000           # Port du serveur (Railway le set automatiquement)
JWT_SECRET=...      # Secret pour signer les tokens JWT
DB_PATH=./data/survey.db  # Chemin de la DB SQLite
```

## Fonctionnement

### Admin
- Login avec l'identifiant `mindmaster2027`
- Créer un sondage : titre + choix séparés par virgules (`Option A, Option B, Option C`)
- Un token à 6 caractères est généré (ex: `K3MX7P`)
- Voir les stats de chaque sondage

### Participants
1. Entrer le code à 6 caractères sur la page d'accueil
2. Choisir un pseudo
3. Cliquer sur les choix dans l'ordre de préférence
   - Premier clic = Priorité #1 (poids maximal)
   - Pas obligé de cliquer sur tous les choix
4. Valider

### Calcul du score
Pour chaque participant ayant sélectionné N choix :
- Choix au rang 1 → **N points**
- Choix au rang 2 → **N-1 points**
- Choix au rang R → **N-R+1 points**

Les scores sont ensuite agrégés sur tous les participants.
Plus le score pondéré est élevé, plus ce choix a été priorisé collectivement.
