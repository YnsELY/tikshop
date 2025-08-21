/*
  # Ajouter la colonne admin à la table profiles

  1. Modifications
    - Ajouter la colonne `is_admin` (boolean) à la table `profiles`
    - Valeur par défaut : false (non-admin)
    - Contrainte NOT NULL avec valeur par défaut

  2. Sécurité
    - La colonne est ajoutée de manière sécurisée
    - Tous les utilisateurs existants deviennent automatiquement non-admin
    - Seuls les administrateurs pourront modifier ce champ (à implémenter côté application)
*/

-- Ajouter la colonne is_admin à la table profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Créer un index sur la colonne is_admin pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN profiles.is_admin IS 'Indique si l''utilisateur a des droits d''administration (false par défaut)';