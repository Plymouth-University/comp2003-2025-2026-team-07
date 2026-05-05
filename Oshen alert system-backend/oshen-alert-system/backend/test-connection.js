const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔌 Testing database connection...');
  
  try {
    // Test: Count tables
    const userCount = await prisma.users.count();
    const vesselCount = await prisma.vessels.count();
    
    console.log('✅ Connection successful!');
    console.log(`📊 Users in database: ${userCount}`);
    console.log(`🚢 Vessels in database: ${vesselCount}`);
    
    // Test: Get admin user
    const admin = await prisma.users.findFirst({
      where: { role: 'admin' }
    });
    
    if (admin) {
      console.log(`👤 Admin user found: ${admin.username}`);
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();