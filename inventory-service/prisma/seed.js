import { prisma } from "../src/config/bd.js";

async function main() {
  console.log('Start seeding...');

  // 1. Generate exactly 30 unique products programmatically
  const adjectives = ['Quantum', 'Aero', 'Ergo', 'Hyper', 'Stealth', 'Nova'];
  const nouns = ['Keyboard', 'Mouse', 'Headset', 'Monitor', 'Tablet'];
  
  const products = [];
  let counter = 1;

  for (const adj of adjectives) {
    for (const noun of nouns) {
      products.push({
        name: `${adj} ${noun}`,
        sku: `TECH-${1000 + counter}`, // Generates SKUs like TECH-1001, TECH-1002, etc.
        // Random price between 20.00 and 170.00
        price: parseFloat((Math.random() * 150 + 20).toFixed(2)), 
        // Random stock quantity between 5 and 55
        stockQuantity: Math.floor(Math.random() * 50) + 5 
      });
      counter++;
    }
  }

  // 2. Bulk insert the 30 products into the database
  // We use createMany for efficiency instead of looping single creates
  const result = await prisma.product.createMany({
    data: products,
    skipDuplicates: true, // Prevents crashing if you run the seed script twice
  });

  console.log(`✅ Successfully seeded ${result.count} products!`);
}

// 3. Execute the main function and handle disconnects/errors
main()
  .catch((e) => {
    console.error("❌ Failed to seed database:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });