import { postsSchema } from "@/schemas/posts";
import { rateLimit } from "@/server/rate-limit";
import { requireAuth } from "@/server/auth";

export async function POST(request: Request) {
  await rateLimit(request);
  const user = await requireAuth();
  const body = postsSchema.parse(await request.json());
  return Response.json({ user: user.id, body });
}
