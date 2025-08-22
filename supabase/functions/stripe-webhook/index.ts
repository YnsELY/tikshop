import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
          metadata,
          customer_details,
          shipping_details,
        } = stripeData as Stripe.Checkout.Session;

        // Get the full session with line items to extract product information
        const fullSession = await stripe.checkout.sessions.retrieve(checkout_session_id, {
          expand: ['line_items', 'line_items.data.price.product']
        });

        // Create order in our orders table
        await createOrderFromStripeSession(fullSession, customerId);

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'pending', // Start with pending status for manual processing
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // TODO verify if needed
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}

async function createOrderFromStripeSession(session: Stripe.Checkout.Session, customerId: string) {
  try {
    console.log('Creating order from Stripe session:', session.id);
    console.log('Session metadata:', session.metadata);

    // Get user ID from customer mapping
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();

    if (customerError || !customerData) {
      console.error('Failed to find user for customer:', customerId, customerError);
      return;
    }

    const userId = customerData.user_id;

    // Extract shipping address from session
    const shippingAddress = {
      first_name: session.customer_details?.name?.split(' ')[0] || session.metadata?.shipping_first_name || '',
      last_name: session.customer_details?.name?.split(' ').slice(1).join(' ') || session.metadata?.shipping_last_name || '',
      email: session.customer_details?.email || '',
      phone: session.customer_details?.phone || session.metadata?.shipping_phone || '',
      address: session.shipping_details?.address?.line1 || session.metadata?.shipping_address || '',
      city: session.shipping_details?.address?.city || session.metadata?.shipping_city || '',
      postal_code: session.shipping_details?.address?.postal_code || session.metadata?.shipping_postal_code || '',
      country: session.shipping_details?.address?.country || session.metadata?.shipping_country || 'FR',
    };

    // Extract relay point information from metadata
    let relayPoint = null;
    if (session.metadata?.relay_point_id) {
      relayPoint = {
        id: session.metadata.relay_point_id,
        name: session.metadata.relay_point_name || '',
        address: session.metadata.relay_point_address || '',
        city: session.metadata.relay_point_city || '',
        postal_code: session.metadata.relay_point_postal_code || '',
        country: 'FR',
      };
    }

    // Convert amount from cents to euros
    const totalAmount = (session.amount_total || 0) / 100;

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        total_amount: totalAmount,
        status: 'pending',
        shipping_address: shippingAddress,
        relay_point: relayPoint,
        payment_intent_id: session.payment_intent as string,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Failed to create order:', orderError);
      return;
    }

    console.log('Order created successfully:', order.id);

    // Create order items from line items
    if (session.line_items?.data) {
      for (const lineItem of session.line_items.data) {
        try {
          console.log('Processing line item:', lineItem);
          
          // Si c'est un checkout de panier, traiter différemment
          if (session.metadata?.cart_checkout === 'true' && session.metadata?.cart_items) {
            // Traiter les articles du panier depuis les métadonnées
            const cartItems = JSON.parse(session.metadata.cart_items);
            console.log('Processing cart items from metadata:', cartItems);
            
            for (const cartItem of cartItems) {
              const { error: itemError } = await supabase
                .from('order_items')
                .insert({
                  order_id: order.id,
                  product_id: cartItem.product_id,
                  variant_id: cartItem.variant_id || null,
                  quantity: cartItem.quantity,
                  price: (lineItem.price?.unit_amount || 0) / 100, // Convert from cents
                });

              if (itemError) {
                console.error('Failed to create cart order item:', itemError);
              } else {
                console.log('Cart order item created for product:', cartItem.product_id);
              }
            }
            
            // Sortir de la boucle car on a traité tous les articles du panier
            break;
          } else {
            // Traitement normal pour un seul produit
            let productId = null;
            let variantId = null;
            console.log('Processing line items from session:', session.line_items.data.length);
          
            // Try to find product by Stripe product metadata
            if (lineItem.price?.product && typeof lineItem.price.product === 'object') {
              const stripeProduct = lineItem.price.product as Stripe.Product;
              
              if (stripeProduct.metadata?.supabase_id) {
                productId = stripeProduct.metadata.supabase_id;
              } else if (stripeProduct.metadata?.reference) {
                // Find product by reference
                const { data: productData } = await supabase
                  .from('products')
                  .select('id')
                  .eq('reference', stripeProduct.metadata.reference)
                  .single();
                
                if (productData) {
                  console.log('Creating order item for cart item:', cartItem);
                  
                  productId = productData.id;
                }
              }
            }

            // Try to find variant if specified in metadata
            if (session.metadata?.variant_id) {
              variantId = session.metadata.variant_id;
            }

            // If we found a product, create the order item
            if (productId) {
              const { error: itemError } = await supabase
                .from('order_items')
                .insert({
                  order_id: order.id,
                  product_id: productId,
                  variant_id: variantId,
                  quantity: lineItem.quantity || 1,
                  price: (lineItem.price?.unit_amount || 0) / 100, // Convert from cents
                });

              if (itemError) {
                console.error('Failed to create order item:', itemError);
              } else {
                console.log('Order item created for product:', productId);
              }
            } else {
              console.warn('Could not find product for line item:', lineItem);
            }
          }
        } catch (itemError) {
          console.error('Error processing line item:', itemError);
        }
      }
    }

    console.log('Order processing completed for session:', session.id);
  } catch (error) {
    console.error('Error creating order from Stripe session:', error);
  }
}