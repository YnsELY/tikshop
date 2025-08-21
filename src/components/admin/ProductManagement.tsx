import React, { useState } from 'react';
import { Edit, Trash2, Plus, Package, Search, Eye } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { Product } from '../../types';
import { ProductForm } from './ProductForm';
import { ProductEditModal } from './ProductEditModal';
import toast from 'react-hot-toast';

export const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Charger tous les produits depuis la base de données
  const fetchAllProducts = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Admin: Chargement de tous les produits depuis la base...');
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          variants:product_variants (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Admin: Erreur chargement produits:', error);
        throw error;
      }

      console.log('✅ Admin: Produits chargés:', data?.length || 0);
      console.log('📦 Admin: Produits avec Stripe Price ID:', data?.filter(p => p.stripe_price_id).length || 0);
      
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les produits au montage du composant
  React.useEffect(() => {
    fetchAllProducts();
  }, []);

  const deleteProduct = async (productId: string) => {
    try {
      // Supprimer d'abord les variantes
      await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', productId);

      // Puis supprimer le produit
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) {
        throw error;
      }

      // Mettre à jour la liste locale
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  // Filtrer les produits selon le terme de recherche
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteProduct = async (product: Product) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product.name}" ?`)) {
      try {
        await deleteProduct(product.id);
        toast.success('Produit supprimé avec succès');
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const getTotalStock = (product: Product) => {
    if (!product.variants || product.variants.length === 0) {
      return 'N/A';
    }
    return product.variants.reduce((total, variant) => total + variant.stock, 0);
  };

  const handleProductFormClose = () => {
    setShowProductForm(false);
    // Recharger les produits après création
    fetchAllProducts();
  };

  const handleEditModalClose = () => {
    setEditingProduct(null);
  };

  const handleEditModalUpdate = () => {
    setEditingProduct(null);
    // Recharger immédiatement les produits après modification
    fetchAllProducts();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec bouton d'ajout et recherche - Réorganisé pour mobile */}
      <div className="space-y-4">
        {/* Titre et bouton nouveau produit */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">Gestion des produits</h3>
            <p className="text-gray-600">{products.length} produit(s) au total</p>
          </div>
          
          {/* Bouton Nouveau produit - Au-dessus sur mobile */}
          <Button 
            onClick={() => setShowProductForm(true)}
            className="w-full sm:w-auto whitespace-nowrap"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau produit
          </Button>
        </div>

        {/* Barre de recherche - En dessous du bouton sur mobile */}
        <div className="w-full">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>
      </div>

      {/* Liste des produits */}
      {filteredProducts.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'Aucun produit trouvé' : 'Aucun produit'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Essayez de modifier votre recherche'
                : 'Commencez par créer votre premier produit'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowProductForm(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Créer un produit
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} hover>
              <div className="space-y-4">
                {/* Image et infos principales */}
                <div className="flex items-start space-x-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {product.category}
                      </span>
                      <span className="text-xs text-gray-500 truncate ml-2">
                        REF: {product.reference}
                      </span>
                    </div>
                    
                    <h4 className="font-semibold text-lg truncate mb-1">
                      {product.name}
                    </h4>
                    
                    <p className="text-2xl font-bold text-primary-500">
                      €{product.price.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Informations sur les variantes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Variantes:</span>
                    <span className="font-medium">
                      {product.variants?.length || 0}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Stock total:</span>
                    <span className={`font-medium ${
                      getTotalStock(product) === 0 ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {getTotalStock(product)}
                    </span>
                  </div>

                  {/* Aperçu des couleurs disponibles */}
                  {product.variants && product.variants.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-600">Couleurs: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {[...new Set(product.variants.map(v => v.color))].slice(0, 3).map((color, index) => (
                          <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {color}
                          </span>
                        ))}
                        {[...new Set(product.variants.map(v => v.color))].length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{[...new Set(product.variants.map(v => v.color))].length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-xs text-gray-500">
                    Créé le {new Date(product.created_at).toLocaleDateString('fr-FR')}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/products/${product.id}`, '_blank')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingProduct(product)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProduct(product)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de création de produit */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <ProductForm onClose={handleProductFormClose} />
          </div>
        </div>
      )}

      {/* Modal d'édition de produit */}
      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onClose={handleEditModalClose}
          onUpdate={handleEditModalUpdate}
        />
      )}
    </div>
  );
};