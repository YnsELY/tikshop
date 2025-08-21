import React, { useState } from 'react';
import { X, Save, Plus, Trash2, Wand2, Upload } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Product, ProductVariant } from '../../types';
import { useProducts } from '../../store/productsStore';
import { uploadImageToImageBB } from '../../lib/imagebb';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface ProductEditModalProps {
  product: Product;
  onClose: () => void;
  onUpdate: () => void;
}

interface EditableVariant {
  color: string;
  size: string;
  stock: number;
  sku: string;
  isNew?: boolean;
  toDelete?: boolean;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  product,
  onClose,
  onUpdate,
}) => {
  const { updateProduct } = useProducts();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');

  const [formData, setFormData] = useState({
    reference: product.reference,
    name: product.name,
    description: product.description,
    price: product.price.toString(),
    image_url: product.image_url,
    category: product.category,
    stripe_price_id: product.stripe_price_id || '',
  });

  const [variants, setVariants] = useState<EditableVariant[]>(
    product.variants?.map(v => ({
      color: v.color,
      size: v.size,
      stock: v.stock,
      sku: v.sku,
    })) || []
  );

  // États pour ajouter de nouvelles variantes
  const [newColorsInput, setNewColorsInput] = useState('');
  const [newSizesInput, setNewSizesInput] = useState('');

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
      setFormData(prev => ({ ...prev, image_url: imageUrl }));
      toast.success('Image uploadée avec succès !');
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('Échec de l\'upload de l\'image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setUploadedImageUrl('');
    setFormData(prev => ({ ...prev, image_url: product.image_url }));
  };

  const updateVariant = (index: number, field: keyof EditableVariant, value: any) => {
    setVariants(prev => prev.map((variant, i) => 
      i === index ? { ...variant, [field]: value } : variant
    ));
  };

  const markVariantForDeletion = (index: number) => {
    setVariants(prev => prev.map((variant, i) => 
      i === index ? { ...variant, toDelete: !variant.toDelete } : variant
    ));
  };

  const generateNewVariants = () => {
    if (!formData.reference) {
      toast.error('Référence produit requise');
      return;
    }

    const colors = newColorsInput
      .split(',')
      .map(color => color.trim())
      .filter(color => color !== '');

    const sizes = newSizesInput
      .split(',')
      .map(size => size.trim())
      .filter(size => size !== '');

    if (colors.length === 0 || sizes.length === 0) {
      toast.error('Veuillez entrer au moins une couleur et une taille');
      return;
    }

    const newVariants: EditableVariant[] = [];

    colors.forEach(color => {
      sizes.forEach(size => {
        // Vérifier si cette combinaison existe déjà
        const exists = variants.some(v => 
          v.color.toLowerCase() === color.toLowerCase() && 
          v.size.toLowerCase() === size.toLowerCase() &&
          !v.toDelete
        );

        if (!exists) {
          const sku = `${formData.reference}-${color.toUpperCase().replace(/\s+/g, '-')}-${size.toUpperCase()}`;
          newVariants.push({
            color: color,
            size: size,
            stock: 0,
            sku: sku,
            isNew: true,
          });
        }
      });
    });

    if (newVariants.length === 0) {
      toast.info('Toutes ces combinaisons existent déjà');
      return;
    }

    setVariants(prev => [...prev, ...newVariants]);
    setNewColorsInput('');
    setNewSizesInput('');
    toast.success(`${newVariants.length} nouvelles variantes ajoutées`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 ProductEditModal: handleSubmit called');
    
    // Protection contre les soumissions multiples
    if (isLoading) {
      console.log('⚠️ Edit form already submitting, ignoring duplicate submission');
      return;
    }
    
    // Validation des données avant de commencer
    if (!formData.reference || !formData.name || !formData.price) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast.error('Le prix doit être un nombre positif');
      return;
    }
    
    setIsLoading(true);
    console.log('🚀 ProductEditModal: Starting update process...');

    try {
      // Préparer les données du produit
      const productData = {
        reference: formData.reference,
        name: formData.name,
        description: formData.description,
        price: price,
        image_url: formData.image_url,
        category: formData.category,
        stripe_price_id: formData.stripe_price_id || null,
      };

      // Préparer les variantes (exclure celles marquées pour suppression)
      const activeVariants = variants
        .filter(v => !v.toDelete)
        .map(v => ({
          color: v.color,
          size: v.size,
          stock: v.stock,
          sku: v.sku,
        }));

      console.log('📦 Data prepared - variants:', activeVariants.length);
      
      // Appel direct à la fonction de mise à jour
      await updateProduct(product.id, productData, activeVariants);
      
      console.log('✅ Product update completed successfully');
      
      // Mettre à jour automatiquement le produit sur Stripe
      try {
        console.log('🔄 Updating product on Stripe...');
        const stripeResult = await updateStripeProductAndPrice(productData, product.reference);
        
        if (stripeResult.priceUpdated) {
          toast.success('Produit et prix mis à jour avec succès sur Supabase et Stripe !');
          console.log('🎉 Nouveau Price ID créé et sauvegardé:', stripeResult.price.id);
        } else {
          toast.success('Produit mis à jour avec succès sur Supabase et Stripe !');
        }
      } catch (stripeError) {
        console.error('❌ Stripe update error (non-blocking):', stripeError);
        toast.success('Produit mis à jour avec succès sur Supabase');
        // Ne pas afficher d'erreur Stripe pour ne pas confuser l'utilisateur
      }
      
      console.log('🔄 Calling onUpdate callback...');
      onUpdate();
      
    } catch (error) {
      console.error('Error updating product:', error);
      
      // Messages d'erreur plus spécifiques
      if (error instanceof Error) {
        if (error.message.includes('permission denied')) {
          toast.error('Permissions insuffisantes pour modifier ce produit');
        } else if (error.message.includes('not authenticated')) {
          toast.error('Session expirée. Veuillez vous reconnecter');
        } else if (error.message.includes('duplicate key')) {
          toast.error('Cette référence produit existe déjà');
        } else {
          toast.error(`Erreur: ${error.message}`);
        }
      } else {
        toast.error('Erreur inconnue lors de la mise à jour');
      }
    } finally {
      console.log('🔄 Resetting loading state');
      setIsLoading(false);
    }
  };

  // Fonction pour mettre à jour le produit et créer un nouveau prix sur Stripe
  const updateStripeProductAndPrice = async (productData: any, originalReference: string): Promise<any> => {
    try {
      console.log('📦 Mise à jour automatique du produit sur Stripe:', productData.name);
      console.log('💰 Nouveau prix du produit:', productData.price, '€');
      
      // 1. Chercher le produit existant sur Stripe par référence
      const searchParams = new URLSearchParams({
        query: `metadata['reference']:'${originalReference}'`,
        limit: '1',
      });
      
      console.log('🔍 Recherche du produit Stripe avec référence:', originalReference);
      const searchResponse = await fetch(`https://api.stripe.com/v1/products/search?${searchParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}`,
        },
      });
      
      const searchData = await searchResponse.json();
      
      if (!searchResponse.ok) {
        throw new Error(`Erreur recherche produit Stripe: ${searchData.error?.message || 'Unknown error'}`);
      }
      
      if (searchData.data.length === 0) {
        console.log('⚠️ Produit non trouvé sur Stripe, création...');
        return await createStripeProductFromSupabase(productData);
      }
      
      const existingProduct = searchData.data[0];
      console.log('✅ Produit Stripe trouvé:', existingProduct.id);
      
      // 2. Mettre à jour le produit existant sur Stripe
      const updateFormData = new URLSearchParams({
        name: productData.name,
        'metadata[reference]': productData.reference,
        'metadata[category]': productData.category,
        'metadata[supabase_id]': product.id,
      });

      if (productData.description && productData.description.trim() !== '') {
        updateFormData.append('description', productData.description);
      }

      if (productData.image_url) {
        updateFormData.append('images[]', productData.image_url);
      }

      console.log('📤 Mise à jour du produit Stripe...');
      const updateResponse = await fetch(`https://api.stripe.com/v1/products/${existingProduct.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: updateFormData,
      });

      const updateData = await updateResponse.json();

      if (!updateResponse.ok) {
        throw new Error(`Erreur mise à jour produit Stripe: ${updateData.error?.message || 'Unknown error'}`);
      }
      
      console.log('✅ Produit Stripe mis à jour avec succès:', {
        id: updateData.id,
        name: updateData.name,
        description: updateData.description,
        images: updateData.images
      });
      
      // 3. TOUJOURS créer un nouveau prix et archiver l'ancien
      const currentPrice = parseFloat(formData.price);
      const originalPrice = product.price;
      
      console.log('💰 Comparaison des prix:', {
        originalPrice: originalPrice,
        newPrice: currentPrice,
        priceChanged: currentPrice !== originalPrice
      });
      
      console.log('💰 Création d\'un nouveau prix sur Stripe (obligatoire lors de la modification)...');
        
      // ÉTAPE 3A: Archiver l'ancien prix s'il existe
      if (product.stripe_price_id) {
        console.log('📦 Archivage de l\'ancien prix Stripe:', product.stripe_price_id);
        
        try {
          const archiveResponse = await fetch(`https://api.stripe.com/v1/prices/${product.stripe_price_id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              active: 'false'
            }),
          });
          
          const archiveData = await archiveResponse.json();
          
          if (archiveResponse.ok) {
            console.log('✅ Ancien prix archivé avec succès:', {
              id: archiveData.id,
              active: archiveData.active,
              unit_amount: archiveData.unit_amount
            });
          } else {
            console.warn('⚠️ Impossible d\'archiver l\'ancien prix (non-bloquant):', archiveData.error?.message);
          }
        } catch (archiveError) {
          console.warn('⚠️ Erreur lors de l\'archivage de l\'ancien prix (non-bloquant):', archiveError);
        }
      }
        
      // ÉTAPE 3B: Créer le nouveau prix (actif par défaut)
      const priceAmount = Math.round(currentPrice * 100); // Convertir en centimes
      console.log('💰 Nouveau prix en centimes:', priceAmount);
      
      const priceFormData = new URLSearchParams({
        product: existingProduct.id,
        unit_amount: priceAmount.toString(),
        currency: 'eur',
        active: 'true', // S'assurer que le nouveau prix est actif
        'metadata[reference]': productData.reference,
        'metadata[supabase_product_id]': product.id,
      });
      
      console.log('📤 Création du nouveau prix Stripe (actif par défaut)...');
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
        console.error('❌ Erreur création nouveau prix Stripe:', priceData);
        throw new Error(`Erreur création prix Stripe: ${priceData.error?.message || 'Unknown error'}`);
      }
      
      // 📋 AFFICHAGE DE LA RÉPONSE STRIPE PRIX
      console.log('💰 === NOUVEAU PRIX STRIPE CRÉÉ ===');
      console.log('🔗 Nouveau Price ID:', priceData.id);
      console.log('💰 Montant:', (priceData.unit_amount / 100).toFixed(2), '€');
      console.log('✅ Actif:', priceData.active);
      console.log('📊 Objet complet Stripe Prix:', JSON.stringify(priceData, null, 2));
      console.log('💰 === FIN NOUVEAU PRIX STRIPE ===');
      
      // 4. ÉTAPE CRITIQUE: Mettre à jour le Price ID dans Supabase
      console.log('💾 Mise à jour du Price ID dans Supabase...');
      console.log('🔑 Nouveau Price ID à sauvegarder:', priceData.id);
      
      const { error: updatePriceError } = await supabase
        .from('products')
        .update({ 
          stripe_price_id: priceData.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);
      
      if (updatePriceError) {
        console.error('❌ Erreur mise à jour Price ID:', updatePriceError);
        throw new Error(`Erreur sauvegarde Price ID: ${updatePriceError.message}`);
      }
      
      console.log('✅ SUCCÈS: Price ID mis à jour dans Supabase');
      console.log('🔑 Nouveau Price ID sauvegardé:', priceData.id);
      
      // 5. Mettre à jour le formulaire local avec le nouveau Price ID
      setFormData(prev => ({ 
        ...prev, 
        stripe_price_id: priceData.id 
      }));
      
      return {
        product: updateData,
        price: priceData,
        priceUpdated: true
      };
    } catch (error) {
      console.error('❌ Erreur mise à jour Stripe:', error);
      throw error;
    }
  };

  // Fonction pour créer le produit sur Stripe s'il n'existe pas
  const createStripeProductFromSupabase = async (productData: any): Promise<any> => {
    try {
      console.log('📦 Création du produit sur Stripe:', productData.name);
      
      const formData = new URLSearchParams({
        name: productData.name,
        'metadata[reference]': productData.reference,
        'metadata[category]': productData.category,
        'metadata[supabase_id]': product.id,
      });

      if (productData.description && productData.description.trim() !== '') {
        formData.append('description', productData.description);
      }

      if (productData.image_url) {
        formData.append('images[]', productData.image_url);
      }

      console.log('📤 Création du produit Stripe...');
      const productResponse = await fetch('https://api.stripe.com/v1/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const productResponseData = await productResponse.json();

      if (!productResponse.ok) {
        throw new Error(`Erreur création produit Stripe: ${productResponseData.error?.message || 'Unknown error'}`);
      }
      
      console.log('✅ Produit Stripe créé avec succès:', {
        id: productResponseData.id,
        name: productResponseData.name,
        description: productResponseData.description,
        images: productResponseData.images
      });
      
      return productResponseData;
    } catch (error) {
      console.error('❌ Erreur création Stripe:', error);
      throw error;
    }
  };
  const activeVariants = variants.filter(v => !v.toDelete);
  const variantsToDelete = variants.filter(v => v.toDelete);

  return (
    <Modal isOpen={true} onClose={onClose} title="Modifier le produit" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations de base */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Référence *"
            name="reference"
            value={formData.reference}
            onChange={handleInputChange}
            required
          />
          <Input
            label="Nom du produit *"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b6b5a] focus:border-transparent transition-colors"
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stripe Price ID
          </label>
          <div className="relative">
            <Input
              name="stripe_price_id"
              value={formData.stripe_price_id}
              onChange={handleInputChange}
              placeholder="price_1234567890abcdef"
              className={formData.stripe_price_id ? 'bg-green-50 border-green-300' : ''}
            />
            {formData.stripe_price_id && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            )}
          </div>
          {formData.stripe_price_id ? (
            <p className="text-xs text-green-600 mt-1 flex items-center">
              ✅ Price ID Stripe configuré
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              Price ID automatiquement généré lors de la création
            </p>
          )}
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b6b5a] focus:border-transparent transition-colors"
          />
        </div>

        {/* Gestion de l'image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Image du produit
          </label>
          
          <div className="space-y-4">
            {/* Image actuelle */}
            <div className="flex items-center space-x-4">
              <img
                src={imagePreview || formData.image_url}
                alt="Image du produit"
                className="w-24 h-24 object-cover rounded-lg border"
              />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2">Image actuelle</p>
                <div className="flex space-x-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload-edit"
                    disabled={isUploadingImage}
                  />
                  <label htmlFor="image-upload-edit">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploadingImage}
                      className={`cursor-pointer ${isUploadingImage ? 'pointer-events-none' : ''}`}
                      as="span"
                    >
                      {isUploadingImage ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#8b6b5a] border-t-transparent rounded-full animate-spin mr-2"></div>
                          Upload...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Changer l'image
                        </>
                      )}
                    </Button>
                  </label>
                  {imagePreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeImage}
                      className="text-red-600"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Annuler
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gestion des variantes existantes */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Variantes existantes</h4>
          
          {activeVariants.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucune variante active</p>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {activeVariants.map((variant, index) => {
                const originalIndex = variants.indexOf(variant);
                return (
                  <Card key={originalIndex} padding="sm" className={variant.isNew ? 'bg-green-50 border-green-200' : 'bg-gray-50'}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Couleur
                          </label>
                          <Input
                            value={variant.color}
                            onChange={(e) => updateVariant(originalIndex, 'color', e.target.value)}
                            size="sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Taille
                          </label>
                          <Input
                            value={variant.size}
                            onChange={(e) => updateVariant(originalIndex, 'size', e.target.value)}
                            size="sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Stock
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={variant.stock}
                            onChange={(e) => updateVariant(originalIndex, 'stock', parseInt(e.target.value) || 0)}
                            size="sm"
                          />
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => markVariantForDeletion(originalIndex)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 font-mono">SKU: {variant.sku}</p>
                      {variant.isNew && (
                        <p className="text-xs text-green-600 font-medium">Nouvelle variante</p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Variantes à supprimer */}
        {variantsToDelete.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-red-600">
              Variantes à supprimer ({variantsToDelete.length})
            </h4>
            <div className="space-y-2">
              {variantsToDelete.map((variant) => {
                const originalIndex = variants.indexOf(variant);
                return (
                  <div key={originalIndex} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <span className="text-sm text-red-800">
                      {variant.color} - {variant.size} (Stock: {variant.stock})
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => markVariantForDeletion(originalIndex)}
                      className="text-green-600 hover:text-green-700"
                    >
                      Restaurer
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ajouter de nouvelles variantes */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Ajouter de nouvelles variantes</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nouvelles couleurs
              </label>
              <Input
                value={newColorsInput}
                onChange={(e) => setNewColorsInput(e.target.value)}
                placeholder="Ex: Blanc, Noir, Rouge"
              />
              <p className="text-xs text-gray-500 mt-1">
                Séparez par des virgules
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nouvelles tailles
              </label>
              <Input
                value={newSizesInput}
                onChange={(e) => setNewSizesInput(e.target.value)}
                placeholder="Ex: S, M, L"
              />
              <p className="text-xs text-gray-500 mt-1">
                Séparez par des virgules
              </p>
            </div>
          </div>

          <div className="text-center">
            <Button
              type="button"
              onClick={generateNewVariants}
              variant="outline"
              className="bg-gradient-to-r from-[#8b6b5a] to-[#a0806f] text-white hover:from-[#755441] hover:to-[#8b6b5a]"
            >
              <Wand2 className="w-5 h-5 mr-2" />
              Générer les nouvelles variantes
            </Button>
          </div>
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
            Sauvegarder les modifications
          </Button>
        </div>
      </form>
    </Modal>
  );
};