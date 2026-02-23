# Application de Monitoring de Consommation Internet

Application web moderne de monitoring de consommation internet avec React + TypeScript + TailwindCSS pour le frontend et structure Laravel pour le backend.

## Fonctionnalités

### Pour les Administrateurs

- **Dashboard central** avec vue d'ensemble
  - Liste complète des utilisateurs avec leurs consommations
  - Sélecteur de fournisseur (YAS, Starlink, etc.)
  - Statistiques en temps réel
  - Actions rapides (activation/désactivation, coupure de connexion)

- **Gestion des utilisateurs**
  - Création via modal (pas de page séparée)
  - Activation/Désactivation (pas de suppression)
  - Vue détaillée des configurations par utilisateur
  - Gestion multi-fournisseurs par utilisateur

- **Gestion des fournisseurs**
  - CRUD complet
  - Maximum 4 fournisseurs
  - Activation/Désactivation

- **Historique des consommations**
  - Filtres par date, utilisateur, fournisseur
  - Graphiques d'évolution
  - Indication de dépassement de limite
  - Export CSV

- **Profil**
  - Modification du mot de passe
  - Modification de l'image de profil

### Pour les Clients

- **Dashboard personnel**
  - Consommation du mois en cours
  - Sélecteur de fournisseur avec bouton "Appliquer"
  - Graphiques d'usage (7 derniers jours)
  - Affichage des limites et dépassements

- **Historique**
  - Historique complet avec filtres par période
  - Vue détaillée par fournisseur

- **Profil**
  - Modification du mot de passe
  - Modification de l'image de profil

## Technologies Utilisées

### Frontend
- React 18
- TypeScript
- TailwindCSS
- Vite
- Lucide React (icônes)

### Backend (Structure fournie)
- Laravel
- Laravel Sanctum (authentification API)
- MySQL/PostgreSQL

## Installation et Démarrage

### Frontend (React)

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Builder pour la production
npm run build
```

L'application sera accessible sur `http://localhost:5173`

### Comptes de Démonstration

**Administrateur:**
- Username: `admin`
- Password: `password`

**Client:**
- Username: `client1`
- Password: `password`

### Backend (Laravel)

Consultez le fichier `LARAVEL_STRUCTURE.md` pour la structure complète du backend Laravel incluant:

- Migrations de base de données
- Models Eloquent
- Controllers API
- Routes
- Seeders
- Middleware

#### Configuration Backend

1. Créez un nouveau projet Laravel:
```bash
composer create-project laravel/laravel monitoring-backend
cd monitoring-backend
```

2. Installez Laravel Sanctum:
```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

3. Copiez les fichiers depuis `LARAVEL_STRUCTURE.md`:
   - Migrations → `database/migrations/`
   - Models → `app/Models/`
   - Controllers → `app/Http/Controllers/`
   - Routes → `routes/api.php`
   - Seeders → `database/seeders/`

4. Configurez votre base de données dans `.env`:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=monitoring_db
DB_USERNAME=root
DB_PASSWORD=
```

5. Configurez CORS dans `.env`:
```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost:5173
```

6. Exécutez les migrations et seeders:
```bash
php artisan migrate
php artisan db:seed
```

7. Lancez le serveur:
```bash
php artisan serve
```

L'API sera accessible sur `http://localhost:8000/api`

## Structure des Données

### Utilisateurs
- Username, Email, Téléphone
- Rôle (Admin/Client)
- Statut (Actif/Désactivé)
- Image de profil
- Configurations multi-fournisseurs

### Fournisseurs
- Nom (ex: YAS, Starlink)
- Statut
- Maximum 4 fournisseurs

### Configuration Utilisateur-Fournisseur
- IP du routeur
- OID Byte In
- OID Byte Out
- Limite mensuelle
- Statut

### Historique de Consommation
- Utilisateur
- Fournisseur
- Bytes In/Out
- Total
- Date

## Routes API Disponibles

### Authentication
- `POST /api/login` - Connexion
- `POST /api/logout` - Déconnexion
- `GET /api/me` - Utilisateur connecté

### Users (Admin)
- `GET /api/users` - Liste des utilisateurs
- `POST /api/users` - Créer un utilisateur
- `GET /api/users/{id}` - Détails d'un utilisateur
- `PUT /api/users/{id}` - Modifier un utilisateur
- `POST /api/users/{id}/toggle-active` - Activer/Désactiver
- `POST /api/users/{id}/update-password` - Changer le mot de passe

### Providers (Admin)
- `GET /api/providers` - Liste des fournisseurs
- `POST /api/providers` - Créer un fournisseur
- `PUT /api/providers/{id}` - Modifier un fournisseur
- `DELETE /api/providers/{id}` - Supprimer un fournisseur

### User Providers
- `GET /api/user-providers` - Configurations utilisateur-fournisseur
- `POST /api/user-providers` - Créer une configuration
- `PUT /api/user-providers/{id}` - Modifier une configuration

### Consumption History
- `GET /api/consumption-history` - Historique
- `POST /api/consumption-history` - Ajouter une entrée
- `GET /api/consumption-history/monthly` - Consommation mensuelle
- `GET /api/consumption-history/daily` - Consommation journalière

## Design et UX

L'application utilise un design moderne avec:
- Interface responsive (mobile, tablette, desktop)
- Thème professionnel avec dégradés
- Graphiques interactifs
- Modals pour les actions rapides
- Navigation intuitive avec sidebar
- Feedback visuel pour toutes les actions

## Sécurité

- Authentification JWT via Laravel Sanctum
- Pas de suppression d'utilisateurs (désactivation uniquement)
- RLS (Row Level Security) à implémenter côté base de données
- Validation des données côté frontend et backend
- Protection CORS configurée

## Prochaines Étapes

1. Connecter le frontend React à l'API Laravel
2. Implémenter la collecte SNMP réelle pour les données de consommation
3. Ajouter des notifications en temps réel
4. Implémenter l'export CSV réel
5. Ajouter des tests unitaires et d'intégration

## Support

Pour toute question ou problème, consultez la documentation ou créez une issue.
