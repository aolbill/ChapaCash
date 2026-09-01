import { connectMongo } from "@/lib/mongo";
import { env } from "@/lib/env";
import { createUser } from "@/server/auth/service";
import { ensureSystemAccounts } from "@/server/ledger/service";
import { FeatureFlag, User } from "@/server/db/models";
import { DISABLED_COMPLIANCE_FLAGS } from "@/domain/copy";
import { logger } from "@/lib/logger";

async function main() {
  await connectMongo();
  await ensureSystemAccounts();

  for (const key of DISABLED_COMPLIANCE_FLAGS) {
    const enabled = key === "real_money_payments";
    await FeatureFlag.updateOne(
      { key },
      { $set: { enabled, note: enabled ? "M-PESA deposits via Paystack" : "Not fully enforced" } },
      { upsert: true },
    );
  }

  const playerEmail = env.DEMO_PLAYER_EMAIL.toLowerCase();
  const adminEmail = env.DEMO_ADMIN_EMAIL.toLowerCase();

  if (!(await User.findOne({ $or: [{ email: playerEmail }, { phone: "254700000001" }] }))) {
    await createUser({
      email: playerEmail,
      phone: "0700000001",
      password: env.DEMO_PLAYER_PASSWORD,
      displayName: "Demo Player",
      role: "PLAYER",
      ageConfirmed: true,
    });
    logger.info("seed_player_created", { email: playerEmail });
  } else {
    await User.updateOne(
      { email: playerEmail, phone: { $in: [null, ""] } },
      { $set: { phone: "254700000001" } },
    );
  }

  if (!(await User.findOne({ $or: [{ email: adminEmail }, { phone: "254700000002" }] }))) {
    await createUser({
      email: adminEmail,
      phone: "0700000002",
      password: env.DEMO_ADMIN_PASSWORD,
      displayName: "Demo Admin",
      role: "ADMIN",
      ageConfirmed: true,
    });
    logger.info("seed_admin_created", { email: adminEmail });
  } else {
    await User.updateOne(
      { email: adminEmail, phone: { $in: [null, ""] } },
      { $set: { phone: "254700000002" } },
    );
  }

  logger.info("seed_complete");
  process.exit(0);
}

main().catch((error) => {
  logger.error("seed_failed", { err: String(error) });
  process.exit(1);
});
