import Stripe from 'stripe';
import { prisma } from "../config/db.js";
import { producer } from "../utils/kafka.js"; // Import your Kafka producer!

class PaymentService {
  async initiatePayment(orderId,userId) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // FIX: Proper fetch request
    const response = await fetch(`${process.env.ORDER_SERVICE_URL}/order/${orderId}`);
    if (!response.ok) {
      throw new Error('Order not found');
    }
    const order = await response.json();

    const stripeAmount = Math.round(order.total * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: 'usd',
      automatic_payment_methods: { 
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: { orderId: order.id }, 
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        userId:userId,
        amount: stripeAmount,
        currency: 'usd',
        stripePaymentIntentId: paymentIntent.id,
        status: 'PENDING',
      },
    });

    return paymentIntent.client_secret;
  }

  // 2. Handle SUCCESS
  async handleSuccessfulPayment(paymentIntentId) {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!payment) return;


    await prisma.payment.update({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { status: 'SUCCESS' },
    });

    // B. Tell Kafka the payment succeeded!
    await producer.send({
      topic: 'payment-events',
      messages: [{
        value: JSON.stringify({
          type: 'PaymentProcessed',
          data: { orderId: payment.orderId, userId:payment.userId, status: 'SUCCESS' }
        })
      }]
    });
    console.log(`Payment Success Event fired for Order: ${payment.orderId}`);
  }

  // 3. Handle FAILURE
  async handleFailedPayment(paymentIntentId) {
    // A. Fetch the payment first so we know the orderId!
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!payment) return;
    

    // B. Update Payment DB
    await prisma.payment.update({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { status: 'FAILED' },
    });

   
    await producer.send({
      topic: 'payment-events',
      messages: [{
        value: JSON.stringify({
          type: 'PaymentProcessed',
          data: { orderId: payment.orderId,userId:payment.userId, status: 'FAILED' }
        })
      }]
    });
    console.log(`Payment Failed Event fired for Order: ${payment.orderId}`);
  }
}

export default new PaymentService();