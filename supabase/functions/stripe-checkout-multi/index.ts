import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl ?? '', supabaseServiceKey ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration Multi-Product',
    version: '1.0.0',
  },
});

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  // For 204 No Content, don't include Content-Type or body
  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const requestBody = await req.json();
    const { line_items, success_url, cancel_url, mode = 'payment', shipping_rate_id, metadata } = requestBody;

    // Validation des paramètres
    if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
      return corsResponse({ error: 'line_items is required and must be a non-empty array' }, 400);
    }

    if (!success_url || !cancel_url) {
      return corsResponse({ error: 'success_url and cancel_url are required' }, 400);
    }

    // Authentification
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('Missing authorization header');
      return corsResponse({ error: 'Missing authorization header' }, 401);
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      console.error('Invalid authorization token format');
      return corsResponse({ error: 'Invalid authorization token' }, 401);
    }
    
    console.log('Authenticating user for multi-product checkout...');
    
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      console.error('Authentication error:', getUserError);
      return corsResponse({ error: `Failed to authenticate user: ${getUserError.message}` }, 401);
    }

    if (!user) {
      console.error('User not found after authentication');
      return corsResponse({ error: 'User not found' }, 404);
    }

    console.log('User authenticated successfully:', user.id);

    // Récupérer ou créer le customer Stripe
    const { data: customer, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (getCustomerError) {
      console.error('Failed to fetch customer information from the database', getCustomerError);
      return corsResponse({ error: 'Failed to fetch customer information' }, 500);
    }

    let customerId;

    if (!customer || !customer.customer_id) {
      // Créer un nouveau customer Stripe
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });

      console.log(`Created new Stripe customer ${newCustomer.id} for user ${user.id}`);

      const { error: createCustomerError } = await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newCustomer.id,
      });

      if (createCustomerError) {
        console.error('Failed to save customer information in the database', createCustomerError);
        
        try {
          await stripe.customers.del(newCustomer.id);
        } catch (deleteError) {
          console.error('Failed to clean up after customer mapping error:', deleteError);
        }

        return corsResponse({ error: 'Failed to create customer mapping' }, 500);
      }

      customerId = newCustomer.id;
    } else {
      customerId = customer.customer_id;
    }

    // Configuration de la session Stripe
    const sessionConfig: any = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: line_items,
      mode: mode,
      success_url: success_url,
      cancel_url: cancel_url,
    };

    // Ajouter les frais de livraison si fournis
    if (shipping_rate_id) {
      sessionConfig.shipping_options = [
        {
          shipping_rate: shipping_rate_id,
        },
      ];
    }

    // Ajouter les métadonnées si fournies
    if (metadata) {
      sessionConfig.metadata = metadata;
    }

    // Créer la session de checkout Stripe
    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log(`Created multi-product checkout session ${session.id} for customer ${customerId}`);
    console.log(`Line items count: ${line_items.length}`);

    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error(`Multi-product checkout error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});