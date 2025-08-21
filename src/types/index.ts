export interface User {
  id: string;
  email: string;
  profile: UserProfile;
}

export interface UserProfile {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  reference: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
  stripe_price_id?: string;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  color: string;
  size: string;
  stock: number;
  sku: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address: ShippingAddress;
  relay_point: RelayPoint;
  payment_intent_id: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  customer?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  price: number;
  product: Product;
  variant?: ProductVariant;
}

export interface ShippingAddress {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
}

export interface RelayPoint {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  opening_hours: string;
}

export interface PaymentMethod {
  id: string;
  last4: string;
  brand: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}