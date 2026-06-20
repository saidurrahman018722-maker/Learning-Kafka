import paymentService  from '../services/paymentService.js';
import Stripe from 'stripe';
import {paymentConsumer} from "../utils/kafka.js";



export const createIntent = async (req, res) => {

 const { orderId} = req.body;
    
    // Grab the token the frontend sent
    const authHeader = req.headers.authorization;
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith("Bearer")){
     token = req.headers.authorization.split(" ")[1];
    }
    
    // Let's log it to make sure the frontend actually sent it!
    console.log("🔑 Token received from frontend:", authHeader);

    try {
        const response = await fetch(`${process.env.ORDER_SERVICE_URL}/order/get-order/${orderId}`, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });
        
        // 🚨 THE FIX: If the Order Service rejects us (401/403), stop immediately!
        if (!response.ok) {
            const errorData = await response.json();
            console.error("🚨 Order Service blocked the request:", errorData);
            return res.status(response.status).json({ 
                error: "Authentication failed with Order Service", 
                details: errorData 
            });
        }
        
        const order = await response.json();
        console.log(order);

        // 2. THE CRITICAL CHECKS: Block the payment if inventory failed or is still thinking!
        if (order.order.status === 'FAILED') {
            return res.status(400).json({ 
                error: "Payment blocked: This order failed because items are out of stock." 
            });
        }

        // 3. IF INVENTORY IS RESERVED, PROCEED WITH STRIPE!
        if (order.order.status === 'RESERVED' || order.order.status === 'PENDING') {
           const client_secret = await paymentService.initiatePayment(orderId,order.order.userId,token);

            // Send the secret to the frontend so the user can finally pay
            return res.status(200).json({ 
                clientSecret:client_secret
            });
        }

        // Catch-all for any other weird statuses
        return res.status(400).json({ error: "Invalid order status for payment." });

  } catch (error) {
    return res.status(error.message === 'Order not found' ? 404 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const handleWebhook = async (req, res) => {

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  let event;


  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook verification failed: ${err.message}`);
  }

  const paymentIntent = event.data.object;
  const token = paymentIntent.metadata.token;

  if (event.type === 'payment_intent.succeeded') {
    await paymentService.handleSuccessfulPayment(paymentIntent.id,token);
  } else if (event.type === 'payment_intent.payment_failed') {
    await paymentService.handleFailedPayment(paymentIntent.id,token);
  }

  return res.status(200).json({ received: true });
};

