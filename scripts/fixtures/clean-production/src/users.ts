export async function getUser(email: string) {
  const signal = AbortSignal.timeout(5000);
  try {
    await fetch("https://supabase.example.test/health", { signal });
    return await supabase.from("users").select("*").eq("email", email);
  } catch (error) {
    logger.error({ error }, "user lookup failed");
    throw error;
  }
}
