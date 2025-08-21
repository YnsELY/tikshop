# 🛍️ CocoLive

**CocoLive** est une plateforme de shopping en direct qui permet aux utilisateurs de découvrir et d'acheter des produits instantanément en utilisant simplement une référence produit.

## ✨ Fonctionnalités

### 🔍 Recherche Instantanée
- Recherche de produits par référence unique
- Redirection automatique vers la page produit
- Interface de recherche intuitive et rapide

### 👤 Gestion des Comptes
- Inscription et connexion sécurisées
- Profil utilisateur complet avec informations personnelles
- Historique des commandes détaillé

### 🛒 Shopping & Commandes
- Ajout au panier avec gestion des quantités
- Processus de commande simplifié
- Suivi des commandes en temps réel
- Points de retrait pour la livraison

### 🎨 Interface Moderne
- Design responsive et élégant
- Animations fluides et micro-interactions
- Thème cohérent avec palette de couleurs personnalisée
- Expérience utilisateur optimisée

## 🚀 Technologies Utilisées

### Frontend
- **React 18** avec TypeScript
- **Vite** pour le développement et le build
- **Tailwind CSS** pour le styling
- **React Router** pour la navigation
- **Zustand** pour la gestion d'état
- **Lucide React** pour les icônes

### Backend & Base de Données
- **Supabase** pour l'authentification et la base de données
- **PostgreSQL** avec Row Level Security (RLS)
- **Stripe** pour les paiements (intégration prête)

### Outils de Développement
- **ESLint** pour la qualité du code
- **TypeScript** pour la sécurité des types
- **PostCSS** et **Autoprefixer**

## 📦 Installation

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Compte Supabase

### Configuration

1. **Cloner le repository**
```bash
git clone https://github.com/votre-username/tikshop.git
cd tikshop
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration de l'environnement**
Créer un fichier `.env` à la racine du projet :
```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anonyme_supabase
VITE_STRIPE_PUBLISHABLE_KEY=votre_cle_publique_stripe
VITE_STRIPE_SECRET_KEY=votre_cle_secrete_stripe
```

4. **Configuration de la base de données**
Exécuter les migrations Supabase dans l'ordre :
```sql
-- Voir les fichiers dans supabase/migrations/
```

5. **Lancer le serveur de développement**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 🗄️ Structure de la Base de Données

### Tables Principales

#### `profiles`
- Informations utilisateur (nom, prénom, téléphone, adresse)
- Lié à l'authentification Supabase

#### `products`
- Catalogue des produits avec références uniques
- Prix, stock, descriptions, images
- Catégorisation des produits

#### `orders`
- Commandes utilisateur avec statuts
- Adresses de livraison et points relais
- Intégration paiements

#### `order_items`
- Détails des articles commandés
- Quantités et prix au moment de la commande

## 🎯 Utilisation

### Pour les Utilisateurs

1. **Recherche de Produit**
   - Entrer la référence produit (ex: `TSHIRT-BIO-2025`)
   - Accès direct à la fiche produit

2. **Commande**
   - Ajouter au panier
   - Remplir les informations de livraison
   - Finaliser la commande

3. **Suivi**
   - Consulter l'historique dans "Mon Compte"
   - Suivre le statut des commandes

### Pour les Développeurs

#### Structure des Composants
```
src/
├── components/
│   ├── account/     # Gestion du compte utilisateur
│   ├── auth/        # Authentification
│   ├── cart/        # Panier d'achat
│   ├── checkout/    # Processus de commande
│   ├── layout/      # Mise en page
│   ├── orders/      # Historique des commandes
│   ├── product/     # Affichage des produits
│   └── ui/          # Composants UI réutilisables
├── hooks/           # Hooks personnalisés
├── pages/           # Pages de l'application
├── store/           # Gestion d'état Zustand
├── types/           # Types TypeScript
└── lib/             # Configuration des services
```

#### Hooks Personnalisés
- `useProducts` - Gestion des produits
- `useOrders` - Gestion des commandes
- `useAuthStore` - Authentification
- `useCartStore` - Panier d'achat

## 🔧 Scripts Disponibles

```bash
# Développement
npm run dev

# Build de production
npm run build

# Aperçu du build
npm run preview

# Linting
npm run lint
```

## 🚀 Déploiement

### Netlify (Recommandé)
1. Connecter le repository GitHub
2. Configurer les variables d'environnement
3. Build automatique à chaque push

### Autres Plateformes
- Vercel
- Railway
- Heroku

## 🔐 Sécurité

- **Row Level Security (RLS)** activé sur toutes les tables
- **Authentification JWT** via Supabase
- **Validation côté client et serveur**
- **Chiffrement des données sensibles**

## 🎨 Personnalisation

### Thème
Le thème peut être modifié dans `tailwind.config.js` :
```javascript
colors: {
  primary: { /* Couleur principale */ },
  secondary: { /* Couleur secondaire */ },
  accent: { /* Couleur d'accent */ }
}
```

### Composants UI
Tous les composants UI sont dans `src/components/ui/` et peuvent être personnalisés.

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Contacter l'équipe de développement

## 🔄 Roadmap

### Version 1.1
- [ ] Système de favoris
- [ ] Notifications push
- [ ] Mode sombre

### Version 1.2
- [ ] Application mobile (React Native)
- [ ] API publique
- [ ] Système de reviews

### Version 2.0
- [ ] Marketplace multi-vendeurs
- [ ] Live streaming intégré
- [ ] IA pour recommandations

---

**CocoLive** - Shopping en direct simplifié 🛍️✨