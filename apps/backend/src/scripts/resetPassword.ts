import { createDb } from '../db.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { hashPassword } from '../password.js';
import { loadEnv } from '../env.js';

loadEnv();

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: docker compose exec app node apps/backend/dist/scripts/resetPassword.js <email> <new_password>');
    process.exit(1);
  }

  const [email, newPassword] = args;
  if (!email || !newPassword) {
    console.error('Error: Both email and new password are required.');
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error('Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  const db = await createDb();
  const userRepository = new UserRepository(db);

  try {
    const user = await userRepository.findByEmail(email.trim().toLowerCase());
    if (!user) {
      console.error(`Error: User with email "${email}" not found.`);
      process.exit(1);
    }

    const hashedPassword = await hashPassword(newPassword);
    await userRepository.setPassword(user.id, hashedPassword);

    console.log(`✓ Password successfully reset for user: ${email}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to reset password:', err);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main();
