# Déploiement sur Vercel - Survey App

Ce projet est configuré pour être déployé sur Vercel avec une base de données **PostgreSQL** (comme Supabase, Neon ou Vercel Postgres).

## Configuration de la base de données

Le projet utilise un système hybride :
- **Local** : Utilise SQLite par défaut (si aucune URL Postgres n'est fournie).
- **Production (Vercel)** : Utilise PostgreSQL via les variables d'environnement.

## Étapes de déploiement

1. Connectez votre dépôt à Vercel.
2. Ajoutez les variables d'environnement suivantes dans le tableau de bord Vercel :
   - `POSTGRES_URL` : Votre URL de connexion PostgreSQL (ex: `postgresql://...`).
   - `JWT_SECRET` : Une clé secrète pour les jetons admin.
3. Cliquez sur **Deploy**.

## Variables d'environnement (.env)

Pour le développement local, créez un fichier `.env` à la racine :

```env
POSTGRES_URL="votre_url_supabase_ou_neon"
JWT_SECRET="votre_secret_admin"
```

## Fonctionnement technique

La couche d'accès aux données (`client/src/lib/db.ts`) détecte automatiquement la présence de `POSTGRES_URL`. Si elle est présente, elle utilise le module `pg` et adapte les requêtes SQL (conversion des `?` en `$1, $2`, etc.) pour assurer la compatibilité entre SQLite et PostgreSQL.
