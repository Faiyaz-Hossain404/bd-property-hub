/**
 * One-time backfill for the single-role migration.
 *
 * Collapses each user's legacy multi-role `roles` array down to the new single
 * `role` field and removes the array. Idempotent — it only touches documents that
 * don't already have a `role`, so re-running is safe. It is also safe to run
 * BEFORE or AFTER deploying the new code: until it runs, the app reads the legacy
 * array via effectiveRole(), and after it runs every document is clean single-role.
 *
 * Mapping (highest privilege wins):
 *   super_admin      -> admin_prime
 *   customer_support -> admin
 *   admin            -> admin
 *   seller           -> seller
 *   (anything else)  -> buyer
 *
 * Run it against the target database (the same MONGODB_URI the API uses):
 *
 *   MONGODB_URI="mongodb+srv://..." pnpm --filter @bdph/api backfill:roles
 *
 * or directly:
 *
 *   cd apps/api && MONGODB_URI="mongodb+srv://..." npx ts-node scripts/backfill-single-role.ts
 *
 * It talks to the raw `users` collection (not the Mongoose model) on purpose, so
 * the retired 'super_admin' / 'customer_support' values don't trip enum validation
 * and the whole update runs server-side as one aggregation-pipeline updateMany.
 */
import mongoose from 'mongoose';

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Set it to the target database and re-run. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const users = mongoose.connection.collection('users');

  const pending = await users.countDocuments({ role: { $exists: false } });
  console.log(`Users needing backfill (no single role yet): ${pending}`);
  if (pending === 0) {
    console.log('Nothing to do — every user already has a single role.');
    await mongoose.disconnect();
    return;
  }

  const legacyArray = { $ifNull: ['$roles', []] };
  const result = await users.updateMany({ role: { $exists: false } }, [
    {
      $set: {
        role: {
          $switch: {
            branches: [
              { case: { $in: ['super_admin', legacyArray] }, then: 'admin_prime' },
              { case: { $in: ['admin_prime', legacyArray] }, then: 'admin_prime' },
              {
                case: {
                  $or: [
                    { $in: ['admin', legacyArray] },
                    { $in: ['customer_support', legacyArray] },
                  ],
                },
                then: 'admin',
              },
              { case: { $in: ['seller', legacyArray] }, then: 'seller' },
            ],
            default: 'buyer',
          },
        },
      },
    },
    { $unset: 'roles' },
  ]);

  console.log(`Backfilled ${result.modifiedCount} user(s); the legacy 'roles' array was removed.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
