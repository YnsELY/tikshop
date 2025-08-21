import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { startOfDay, endOfDay, subDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export interface SalesData {
  date: string;
  sales: number;
  orders: number;
  revenue: number;
}

export interface HourlyData {
  hour: number;
  sales: number;
  orders: number;
  revenue: number;
}

export interface BestSeller {
  product_id: string;
  product_name: string;
  product_reference: string;
  category: string;
  total_quantity: number;
  total_revenue: number;
  orders_count: number;
  image_url: string;
}

export interface ProductStats {
  product_id: string;
  daily_sales: SalesData[];
  hourly_sales: HourlyData[];
  total_quantity: number;
  total_revenue: number;
  peak_hour: number;
  peak_day: string;
}

export interface GlobalStats {
  total_orders: number;
  total_revenue: number;
  total_customers: number;
  avg_order_value: number;
  orders_today: number;
  revenue_today: number;
  orders_this_week: number;
  revenue_this_week: number;
  orders_this_month: number;
  revenue_this_month: number;
}

export const useAnalytics = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Fonction pour récupérer les statistiques globales
  const getGlobalStats = async (): Promise<GlobalStats> => {
    if (!user?.profile?.is_admin) {
      throw new Error('Access denied');
    }

    const today = new Date();
    const startToday = startOfDay(today);
    const endToday = endOfDay(today);
    const startWeek = startOfWeek(today, { weekStartsOn: 1 });
    const endWeek = endOfWeek(today, { weekStartsOn: 1 });
    const startMonth = startOfMonth(today);
    const endMonth = endOfMonth(today);

    try {
      // Statistiques globales
      const { data: totalStats } = await supabase
        .from('orders')
        .select('total_amount, user_id')
        .neq('status', 'cancelled');

      // Statistiques du jour
      const { data: todayStats } = await supabase
        .from('orders')
        .select('total_amount')
        .neq('status', 'cancelled')
        .gte('created_at', startToday.toISOString())
        .lte('created_at', endToday.toISOString());

      // Statistiques de la semaine
      const { data: weekStats } = await supabase
        .from('orders')
        .select('total_amount')
        .neq('status', 'cancelled')
        .gte('created_at', startWeek.toISOString())
        .lte('created_at', endWeek.toISOString());

      // Statistiques du mois
      const { data: monthStats } = await supabase
        .from('orders')
        .select('total_amount')
        .neq('status', 'cancelled')
        .gte('created_at', startMonth.toISOString())
        .lte('created_at', endMonth.toISOString());

      const totalOrders = totalStats?.length || 0;
      const totalRevenue = totalStats?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const uniqueCustomers = new Set(totalStats?.map(order => order.user_id)).size;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        total_customers: uniqueCustomers,
        avg_order_value: avgOrderValue,
        orders_today: todayStats?.length || 0,
        revenue_today: todayStats?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
        orders_this_week: weekStats?.length || 0,
        revenue_this_week: weekStats?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
        orders_this_month: monthStats?.length || 0,
        revenue_this_month: monthStats?.reduce((sum, order) => sum + order.total_amount, 0) || 0,
      };
    } catch (err) {
      console.error('Error fetching global stats:', err);
      throw err;
    }
  };

  // Fonction pour récupérer les ventes par jour
  const getSalesByPeriod = async (startDate: Date, endDate: Date, groupBy: 'day' | 'week' | 'month' = 'day'): Promise<SalesData[]> => {
    if (!user?.profile?.is_admin) {
      throw new Error('Access denied');
    }

    try {
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          created_at,
          total_amount,
          order_items (quantity)
        `)
        .neq('status', 'cancelled')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at');

      if (!orders) return [];

      // Grouper les données par période
      const groupedData: { [key: string]: { sales: number; orders: number; revenue: number } } = {};

      orders.forEach(order => {
        const date = new Date(order.created_at);
        let key: string;

        switch (groupBy) {
          case 'week':
            key = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            break;
          case 'month':
            key = format(startOfMonth(date), 'yyyy-MM-dd');
            break;
          default:
            key = format(date, 'yyyy-MM-dd');
        }

        if (!groupedData[key]) {
          groupedData[key] = { sales: 0, orders: 0, revenue: 0 };
        }

        const totalQuantity = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        groupedData[key].sales += totalQuantity;
        groupedData[key].orders += 1;
        groupedData[key].revenue += order.total_amount;
      });

      return Object.entries(groupedData)
        .map(([date, data]) => ({
          date,
          sales: data.sales,
          orders: data.orders,
          revenue: data.revenue,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (err) {
      console.error('Error fetching sales by period:', err);
      throw err;
    }
  };

  // Fonction pour récupérer les ventes par heure
  const getSalesByHour = async (startDate: Date, endDate: Date): Promise<HourlyData[]> => {
    if (!user?.profile?.is_admin) {
      throw new Error('Access denied');
    }

    try {
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          created_at,
          total_amount,
          order_items (quantity)
        `)
        .neq('status', 'cancelled')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (!orders) return [];

      // Grouper par heure
      const hourlyData: { [hour: number]: { sales: number; orders: number; revenue: number } } = {};

      // Initialiser toutes les heures
      for (let i = 0; i < 24; i++) {
        hourlyData[i] = { sales: 0, orders: 0, revenue: 0 };
      }

      orders.forEach(order => {
        const hour = new Date(order.created_at).getHours();
        const totalQuantity = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        
        hourlyData[hour].sales += totalQuantity;
        hourlyData[hour].orders += 1;
        hourlyData[hour].revenue += order.total_amount;
      });

      return Object.entries(hourlyData).map(([hour, data]) => ({
        hour: parseInt(hour),
        sales: data.sales,
        orders: data.orders,
        revenue: data.revenue,
      }));
    } catch (err) {
      console.error('Error fetching sales by hour:', err);
      throw err;
    }
  };

  // Fonction pour récupérer les best-sellers
  const getBestSellers = async (startDate: Date, endDate: Date, category?: string, limit: number = 10): Promise<BestSeller[]> => {
    if (!user?.profile?.is_admin) {
      throw new Error('Access denied');
    }

    try {
      let query = supabase
        .from('order_items')
        .select(`
          quantity,
          price,
          products (
            id,
            name,
            reference,
            category,
            image_url
          ),
          orders!inner (
            created_at,
            status
          )
        `)
        .neq('orders.status', 'cancelled')
        .gte('orders.created_at', startDate.toISOString())
        .lte('orders.created_at', endDate.toISOString());

      if (category && category !== 'all') {
        query = query.eq('products.category', category);
      }

      const { data: orderItems } = await query;

      if (!orderItems) return [];

      // Grouper par produit
      const productStats: { [productId: string]: BestSeller } = {};

      orderItems.forEach(item => {
        if (!item.products) return;

        const productId = item.products.id;
        if (!productStats[productId]) {
          productStats[productId] = {
            product_id: productId,
            product_name: item.products.name,
            product_reference: item.products.reference,
            category: item.products.category,
            total_quantity: 0,
            total_revenue: 0,
            orders_count: 0,
            image_url: item.products.image_url,
          };
        }

        productStats[productId].total_quantity += item.quantity;
        productStats[productId].total_revenue += item.price * item.quantity;
        productStats[productId].orders_count += 1;
      });

      return Object.values(productStats)
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, limit);
    } catch (err) {
      console.error('Error fetching best sellers:', err);
      throw err;
    }
  };

  // Fonction pour récupérer les statistiques d'un produit spécifique
  const getProductStats = async (productId: string, startDate: Date, endDate: Date): Promise<ProductStats | null> => {
    if (!user?.profile?.is_admin) {
      throw new Error('Access denied');
    }

    try {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          quantity,
          price,
          orders!inner (
            created_at,
            status
          )
        `)
        .eq('product_id', productId)
        .neq('orders.status', 'cancelled')
        .gte('orders.created_at', startDate.toISOString())
        .lte('orders.created_at', endDate.toISOString());

      if (!orderItems || orderItems.length === 0) return null;

      // Statistiques par jour
      const dailyStats: { [date: string]: { sales: number; revenue: number } } = {};
      const hourlyStats: { [hour: number]: { sales: number; revenue: number } } = {};

      // Initialiser les heures
      for (let i = 0; i < 24; i++) {
        hourlyStats[i] = { sales: 0, revenue: 0 };
      }

      let totalQuantity = 0;
      let totalRevenue = 0;

      orderItems.forEach(item => {
        const date = format(new Date(item.orders.created_at), 'yyyy-MM-dd');
        const hour = new Date(item.orders.created_at).getHours();
        const revenue = item.price * item.quantity;

        // Statistiques quotidiennes
        if (!dailyStats[date]) {
          dailyStats[date] = { sales: 0, revenue: 0 };
        }
        dailyStats[date].sales += item.quantity;
        dailyStats[date].revenue += revenue;

        // Statistiques horaires
        hourlyStats[hour].sales += item.quantity;
        hourlyStats[hour].revenue += revenue;

        totalQuantity += item.quantity;
        totalRevenue += revenue;
      });

      // Trouver l'heure de pic
      const peakHour = Object.entries(hourlyStats)
        .reduce((max, [hour, data]) => data.sales > max.sales ? { hour: parseInt(hour), sales: data.sales } : max, { hour: 0, sales: 0 })
        .hour;

      // Trouver le jour de pic
      const peakDay = Object.entries(dailyStats)
        .reduce((max, [date, data]) => data.sales > max.sales ? { date, sales: data.sales } : max, { date: '', sales: 0 })
        .date;

      return {
        product_id: productId,
        daily_sales: Object.entries(dailyStats).map(([date, data]) => ({
          date,
          sales: data.sales,
          orders: 1, // Approximation
          revenue: data.revenue,
        })),
        hourly_sales: Object.entries(hourlyStats).map(([hour, data]) => ({
          hour: parseInt(hour),
          sales: data.sales,
          orders: 1, // Approximation
          revenue: data.revenue,
        })),
        total_quantity: totalQuantity,
        total_revenue: totalRevenue,
        peak_hour: peakHour,
        peak_day: peakDay,
      };
    } catch (err) {
      console.error('Error fetching product stats:', err);
      throw err;
    }
  };

  return {
    isLoading,
    error,
    getGlobalStats,
    getSalesByPeriod,
    getSalesByHour,
    getBestSellers,
    getProductStats,
  };
};