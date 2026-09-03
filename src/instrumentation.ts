export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { connectMongo } = await import("@/lib/mongo");
  await connectMongo().catch(() => undefined);
}
