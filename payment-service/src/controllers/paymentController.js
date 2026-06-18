import paymentService  from '../services/paymentService.js';
import Stripe from 'stripe';
import {paymentConsumer} from "../utils/kafka.js";



export const createIntent = async (req, res) => {
  try {
        paymentConsumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                const eventData = JSON.parse(message.value.toString());

                if(eventData.type === "StartingPayment" && eventData.data.status === "RESERVED"){
                    const { orderId } = eventData.data;
                    console.log(`\nProcessing payment for Order: ${orderId}...`);
    


        const clientSecret = await paymentService.initiatePayment(orderId,req.user.id);

        return res.status(200).json({
        success: true,
        clientSecret,
        });

    }
            }
        })

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

  if (event.type === 'payment_intent.succeeded') {
    await paymentService.handleSuccessfulPayment(paymentIntent.id);
  } else if (event.type === 'payment_intent.payment_failed') {
    await paymentService.handleFailedPayment(paymentIntent.id);
  }

  return res.status(200).json({ received: true });
};

