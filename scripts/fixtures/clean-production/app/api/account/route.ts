import { accountSchema } from "@/schemas/account";
import { rateLimit } from "@/server/rate-limit";
import { requireAuth } from "@/server/auth";

export async function POST(request: Request) {
  await rateLimit(request);
  const user = await requireAuth();
  const body = accountSchema.parse(await request.json());
  return Response.json({ user: user.id, body });
}
