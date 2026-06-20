import Stripe from 'stripe';
import { prisma } from "../config/db.js";
import { producer } from "../utils/kafka.js"; // Import your Kafka producer!

class PaymentService {
  async initiatePayment(orderId,userId,token) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // FIX: Proper fetch request
    const response = await fetch(`${process.env.ORDER_SERVICE_URL}/order/get-order/${orderId}`, {
        headers: {
           'Authorization': `Bearer ${token}`, // <-- Forward the token!
        }
    });
    const order = await response.json();
    console.log(order);

    const stripeAmount = Math.round(order.order.total * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: 'usd',
      automatic_payment_methods: { 
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: { orderId: order.order.id,
        userId:userId,
        token:token
       }, 
    });

    await prisma.payment.create({
      data: {
        orderId: order.order.id,
        userId:userId,
        total: stripeAmount,
        currency: 'USD',
        stripePaymentIntentId: paymentIntent.id,
        status: 'PENDING',
      },
    });

    return paymentIntent.client_secret;
  }

  // 2. Handle SUCCESS
  async handleSuccessfulPayment(paymentIntentId,token) {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!payment) return;


    await prisma.payment.update({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { status: 'PAID' },
    });

    // B. Tell Kafka the payment succeeded!
    await producer.send({
      topic: 'payment-events',
      messages: [{
        value: JSON.stringify({
          type: 'PaymentProcessed',
          data: { orderId: payment.orderId, userId:payment.userId, status: 'PAID',token }
        })
      }]
    });
    console.log(`Payment Success Event fired for Order: ${payment.orderId}`);
  }

  // 3. Handle FAILURE
  async handleFailedPayment(paymentIntentId,token) {
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
          data: { orderId: payment.orderId,userId:payment.userId, status: 'FAILED',token }
        })
      }]
    });
    console.log(`Payment Failed Event fired for Order: ${payment.orderId}`);
  }
}

export default new PaymentService();