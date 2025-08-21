import React, { useState } from 'react';
import { X, Plus, Trash2, Upload, Save, Wand2, Image as ImageIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useProducts } from '../../store/productsStore';
import { useAuthStore } from '../../store/authStore';
import { uploadImageToImageBB } from '../../lib/imagebb';
import { supabase } from '../../lib/supabase';
import { ProductVariant } from '../../types';
import toast from 'react-hot-toast';

interface ProductFormProps {
  onClose: () => void;
}

interface GeneratedVariant {
  color: string;
  size: string;
  stock: number;
  sku: string;
}

export const ProductForm: React.FC<ProductFormProps> = ({ onClose }) => {
  const { createProduct } = useProducts();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [createdStripeProduct, setCreatedStripeProduct] = useState<any>(null);

  const [formData, setFormData] = useState({
    reference: '',
    name: '',
    description: '',
    price: '',
    category: 'Vêtements',
  });

  // États pour la génération de variantes
  const [colorsInput, setColorsInput] = useState('');
  const [sizesInput, setSizesInput] = useState('');
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [variantsGenerated, setVariantsGenerated] = useState(false);

  const categories = [
    'Vêtements',
    'Chaussures',
    'Accessoires',
    'Électronique',
    'Maison',
    'Sport',
    'Beauté',
    'Autre'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image');
      return;
    }

    // Vérifier la taille du fichier (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }

    setImageFile(file);
    
    // Créer un aperçu local
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload vers ImageBB
    setIsUploadingImage(true);
    try {
      const imageUrl = await uploadImageToImageBB(file);
      setUploadedImageUrl(imageUrl);
      toast.success('Image uploadée avec succès !');
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('Échec de l\'upload de l\'image');
      // Garder l'aperçu local même si l'upload échoue
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setUploadedImageUrl('');
  };

  // Génération automatique des variantes avec séparation par virgules
  const generateVariants = () => {
    if (!formData.reference) {
      toast.error('Veuillez d\'abord entrer une référence produit');
      return;
    }

    // Séparer les couleurs par virgules et nettoyer
    const colors = colorsInput
      .split(',')
      .map(color => color.trim())
      .filter(color => color !== '');

    // Séparer les tailles par virgules et nettoyer
    const sizes = sizesInput
      .split(',')
      .map(size => size.trim())
      .filter(size => size !== '');

    if (colors.length === 0 || sizes.length === 0) {
      toast.error('Veuillez entrer au moins une couleur et une taille (séparées par des virgules)');
      return;
    }

    const variants: GeneratedVariant[] = [];

    // Créer toutes les combinaisons possibles
    colors.forEach(color => {
      sizes.forEach(size => {
        const sku = `${formData.reference}-${color.toUpperCase().replace(/\s+/g, '-')}-${size.toUpperCase()}`;
        variants.push({
          color: color,
          size: size,
          stock: 0,
          sku: sku
        });
      });
    });

    setGeneratedVariants(variants);
    setVariantsGenerated(true);
    toast.success(`${variants.length} variantes générées ! (${colors.length} couleurs × ${sizes.length} tailles)`);
  };

  const updateVariantStock = (index: number, stock: number) => {
    setGeneratedVariants(prev => prev.map((variant, i) => 
      i === index ? { ...variant, stock: Math.max(0, stock) } : variant
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 ProductForm: handleSubmit called');
    console.log('🔍 Current loading state:', isLoading);
    console.log('📡 ProductForm: About to start product creation...');
    
    // Protection contre les soumissions multiples
    if (isLoading) {
      console.log('⚠️ Form already submitting, ignoring duplicate submission');
      return;
    }
    
    // Validation complète des données d'entrée
    if (!user?.profile?.is_admin) {
      console.error('❌ ProductForm: User is not admin');
      toast.error('Accès non autorisé');
      return;
    }

    // Validation
    if (!formData.reference || !formData.name || !formData.price) {
      console.error('❌ ProductForm: Missing required fields');
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      console.error('❌ ProductForm: Invalid price');
      toast.error('Le prix doit être un nombre positif');
      return;
    }

    if (!variantsGenerated || generatedVariants.length === 0) {
      console.error('❌ ProductForm: No variants generated');
      toast.error('Veuillez générer au moins une variante');
      return;
    }

    setIsLoading(true);
    console.log('🔄 ProductForm: Loading state set to true');
    console.log('🚀 Starting product creation...');
    console.log('📋 Form data:', formData);
    console.log('🎨 Generated variants:', generatedVariants);
    
    try {
      // ÉTAPE 1: Créer d'abord le produit et le prix sur Stripe
      console.log('🚀 ÉTAPE 1: Création du produit sur Stripe...');
      const stripeData = await createStripeProductAndPrice();
      console.log('✅ ÉTAPE 1 terminée: Produit Stripe créé avec Price ID:', stripeData.price.id);
      
      // ÉTAPE 2: Créer le produit dans Supabase avec le Price ID de Stripe
      console.log('🚀 ÉTAPE 2: Création du produit dans Supabase avec Price ID...');
      
      // Utiliser l'URL uploadée ou une URL par défaut
      const imageUrl = uploadedImageUrl || imagePreview || 'https://images.pexels.com/photos/1192609/pexels-photo-1192609.jpeg?auto=compress&cs=tinysrgb&w=400';

      const productData = {
        reference: formData.reference,
        name: formData.name,
        description: formData.description,
        price: price,
        image_url: imageUrl,
        category: formData.category,
        seller_id: user.id,
        stripe_price_id: stripeData.price.id, // 🔑 PRICE ID DE STRIPE
      };

      // Préparer les variantes pour la base de données
      const variantsData = generatedVariants.map(variant => ({
        color: variant.color,
        size: variant.size,
        stock: variant.stock,
        sku: variant.sku,
      }));

      console.log('📦 Product data to create in Supabase:', productData);
      console.log('🎨 Variants data to create:', variantsData);
      console.log('🔑 Stripe Price ID to save:', stripeData.price.id);
      console.log('📡 ProductForm: About to call createProduct...');

      // Créer le produit dans Supabase avec le Price ID
      const createdProduct = await createProduct(productData, variantsData);
      console.log('📬 ProductForm: createProduct completed');
      console.log('✅ ÉTAPE 2 terminée: Produit créé dans Supabase avec Price ID');
      
      // ÉTAPE 3: Mettre à jour le produit avec le Price ID Stripe
      console.log('🚀 ÉTAPE 3: Mise à jour du Price ID dans Supabase...');
      console.log('🔑 Price ID à sauvegarder:', stripeData.price.id);
      
      const { error: updatePriceError } = await supabase
        .from('products')
        .update({ 
          stripe_price_id: stripeData.price.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', createdProduct.id);
      
      if (updatePriceError) {
        console.error('❌ Erreur mise à jour Price ID:', updatePriceError);
        throw new Error(`Erreur sauvegarde Price ID: ${updatePriceError.message}`);
      }
      
      console.log('✅ ÉTAPE 3 terminée: Price ID sauvegardé dans Supabase');
      console.log('🔑 Price ID sauvegardé:', stripeData.price.id);
      console.log('💾 Colonne stripe_price_id mise à jour avec succès');
      
      console.log('✅ Product created successfully');
      toast.success('Produit créé avec succès sur Stripe et Supabase !');
      console.log('🔄 ProductForm: Closing form after success');
      onClose();
    } catch (error) {
      console.error('Error creating product:', error);
      console.log('📡 ProductForm: Product creation failed');
      
      // Afficher une erreur plus détaillée
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          toast.error('Un produit avec cette référence existe déjà');
        } else if (error.message.includes('permission denied')) {
          toast.error('Permissions insuffisantes pour créer un produit');
        } else if (error.message.includes('not authenticated')) {
          toast.error('Session expirée. Veuillez vous reconnecter');
        } else {
          toast.error(`Erreur: ${error.message}`);
        }
      } else {
        toast.error('Erreur lors de la création du produit');
      }
    } finally {
      console.log('🔄 ProductForm: Resetting loading state in finally block');
      setIsLoading(false);
      console.log('🏁 ProductForm: Finally block executed');
      console.log('📡 ProductForm: Process completed');
      console.log('🏁 Product creation process finished');
    }
  };

  // Fonction pour créer le produit ET le prix sur Stripe AVANT Supabase
  const createStripeProductAndPrice = async (): Promise<any> => {
    try {
      console.log('📦 Création du produit ET prix sur Stripe:', formData.name);
      console.log('💰 Prix du produit:', formData.price, '€');
      
      const imageUrl = uploadedImageUrl || imagePreview || 'https://images.pexels.com/photos/1192609/pexels-photo-1192609.jpeg?auto=compress&cs=tinysrgb&w=400';
      
      // 1. Créer le produit sur Stripe
      const stripeFormData = new URLSearchParams({
        name: formData.name,
        'metadata[reference]': formData.reference,
        'metadata[category]': formData.category,
      });

      if (formData.description && formData.description.trim() !== '') {
        stripeFormData.append('description', formData.description);
      }

      if (imageUrl) {
        stripeFormData.append('images[]', imageUrl);
      }

      console.log('📤 Création du produit Stripe...');
      const productResponse = await fetch('https://api.stripe.com/v1/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: stripeFormData,
      });

      const productData = await productResponse.json();

      if (!productResponse.ok) {
        throw new Error(`Erreur création produit Stripe: ${productData.error?.message || 'Unknown error'}`);
      }

      // 📋 AFFICHAGE COMPLET DE LA RÉPONSE STRIPE PRODUIT
      console.log('🎯 === RÉPONSE COMPLÈTE STRIPE PRODUIT ===');
      console.log('📦 Produit Stripe créé avec succès:');
      console.log('🔗 ID:', productData.id);
      console.log('📝 Nom:', productData.name);
      console.log('📄 Description:', productData.description);
      console.log('🖼️ Images:', productData.images);
      console.log('🏷️ Métadonnées:', productData.metadata);
      console.log('📅 Créé le:', new Date(productData.created * 1000).toLocaleString('fr-FR'));
      console.log('🔄 Mis à jour le:', new Date(productData.updated * 1000).toLocaleString('fr-FR'));
      console.log('✅ Actif:', productData.active);
      console.log('🔗 URL:', productData.url);
      console.log('📊 Objet complet Stripe Produit:', JSON.stringify(productData, null, 2));
      console.log('🎯 === FIN RÉPONSE STRIPE PRODUIT ===');
      
      // 2. Créer le prix sur Stripe
      console.log('💰 Création du prix Stripe...');
      const priceAmount = Math.round(parseFloat(formData.price) * 100); // Convertir en centimes
      console.log('💰 Prix en centimes:', priceAmount);
      
      const priceFormData = new URLSearchParams({
        product: productData.id,
        unit_amount: priceAmount.toString(),
        currency: 'eur',
        'metadata[reference]': formData.reference,
      });
      
      const priceResponse = await fetch('https://api.stripe.com/v1/prices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: priceFormData,
      });
      
      const priceData = await priceResponse.json();
      
      if (!priceResponse.ok) {
        console.error('❌ Erreur création prix Stripe:', priceData);
        throw new Error(`Erreur création prix Stripe: ${priceData.error?.message || 'Unknown error'}`);
      }
      
      // 📋 AFFICHAGE COMPLET DE LA RÉPONSE STRIPE PRIX
      console.log('💰 === RÉPONSE COMPLÈTE STRIPE PRIX ===');
      console.log('💳 Prix Stripe créé avec succès:');
      console.log('🔗 ID:', priceData.id);
      console.log('🏷️ Produit associé:', priceData.product);
      console.log('💰 Montant (centimes):', priceData.unit_amount);
      console.log('💱 Devise:', priceData.currency);
      console.log('🔄 Type de facturation:', priceData.type);
      console.log('🔄 Récurrent:', priceData.recurring);
      console.log('🏷️ Métadonnées:', priceData.metadata);
      console.log('📅 Créé le:', new Date(priceData.created * 1000).toLocaleString('fr-FR'));
      console.log('✅ Actif:', priceData.active);
      console.log('📊 Objet complet Stripe Prix:', JSON.stringify(priceData, null, 2));
      console.log('💰 === FIN RÉPONSE STRIPE PRIX ===');
      
      // 📋 RÉSUMÉ FINAL
      console.log('🎉 === RÉSUMÉ CRÉATION STRIPE ===');
      console.log('✅ Produit créé:', productData.name);
      console.log('💰 Prix configuré:', `€${(priceData.unit_amount / 100).toFixed(2)}`);
      console.log('🔗 Price ID à utiliser:', priceData.id);
      console.log('🎉 === FIN RÉSUMÉ ===');
      
      // 3. Retourner les données Stripe pour utilisation dans Supabase
      return {
        product: productData,
        price: priceData,
      };
    } catch (error) {
      console.error('❌ Erreur création Stripe:', error);
      throw error;
    }
  };
  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">Créer un nouveau produit</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations de base */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Référence *"
            name="reference"
            value={formData.reference}
            onChange={handleInputChange}
            placeholder="Ex: TSHIRT-BIO-2025"
            required
          />
          <Input
            label="Nom du produit *"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Ex: T-Shirt Bio Premium"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Prix (€) *"
            name="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={handleInputChange}
            placeholder="29.99"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b6b5a] focus:border-transparent transition-colors"
              required
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b6b5a] focus:border-transparent transition-colors"
            placeholder="Description détaillée du produit..."
          />
        </div>

        {/* Upload d'image avec ImageBB */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Image du produit *
          </label>
          
          {!imagePreview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={isUploadingImage}
              />
              <label htmlFor="image-upload" className={`cursor-pointer ${isUploadingImage ? 'pointer-events-none' : ''}`}>
                <div className="flex flex-col items-center">
                  {isUploadingImage ? (
                    <>
                      <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-lg font-medium text-primary-600 mb-2">
                        Upload en cours...
                      </p>
                      <p className="text-sm text-gray-500">
                        Veuillez patienter
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-gray-700 mb-2">
                        Cliquez pour uploader une image
                      </p>
                      <p className="text-sm text-gray-500">
                        PNG, JPG, JPEG jusqu'à 5MB
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>
          ) : (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Aperçu"
                className="w-full h-64 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                disabled={isUploadingImage}
              >
                <X className="w-4 h-4" />
              </button>
              
              {/* Indicateur de statut d'upload */}
              <div className="absolute bottom-2 left-2">
                {isUploadingImage ? (
                  <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Upload en cours...
                  </div>
                ) : uploadedImageUrl ? (
                  <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    ✓ Uploadée
                  </div>
                ) : (
                  <div className="bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Aperçu local
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Configuration des variantes */}
        <div className="space-y-6">
          <h4 className="text-lg font-semibold">Configuration des variantes</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Couleurs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Couleurs disponibles *
              </label>
              <Input
                value={colorsInput}
                onChange={(e) => setColorsInput(e.target.value)}
                placeholder="Ex: Blanc, Noir, Bleu Marine, Rouge, Vert"
              />
              <p className="text-xs text-gray-500 mt-1">
                Séparez chaque couleur par une virgule
              </p>
            </div>

            {/* Tailles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tailles disponibles *
              </label>
              <Input
                value={sizesInput}
                onChange={(e) => setSizesInput(e.target.value)}
                placeholder="Ex: S, M, L, XL"
              />
              <p className="text-xs text-gray-500 mt-1">
                Séparez chaque taille par une virgule
              </p>
            </div>
          </div>

          {/* Bouton de génération */}
          <div className="text-center">
            <Button
              type="button"
              onClick={generateVariants}
              variant="secondary"
              className="bg-gradient-to-r from-[#8b6b5a] to-[#a0806f] hover:from-[#755441] hover:to-[#8b6b5a]"
            >
              <Wand2 className="w-5 h-5 mr-2" />
              Générer les variantes
            </Button>
          </div>

          {/* Variantes générées - Une ligne par variante */}
          {variantsGenerated && generatedVariants.length > 0 && (
            <div>
              <h5 className="font-medium mb-4">
                Variantes générées ({generatedVariants.length})
              </h5>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {generatedVariants.map((variant, index) => (
                  <Card key={index} padding="sm" className="bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {variant.color} - {variant.size}
                            </p>
                            <p className="text-xs text-gray-500 font-mono truncate">
                              {variant.sku}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 w-24">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Stock
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={variant.stock}
                          onChange={(e) => updateVariantStock(index, parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="text-center"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            type="submit" 
            isLoading={isLoading}
            disabled={isUploadingImage}
          >
            <Save className="w-5 h-5 mr-2" />
            Créer le produit
          </Button>
        </div>
      </form>
    </Card>
  );
};