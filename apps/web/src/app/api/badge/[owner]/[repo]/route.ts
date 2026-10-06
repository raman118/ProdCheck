import { isBadgeIdentifier, renderScoreBadge } from "../../../../../lib/badge";
import { getScanStore } from "../../../../../lib/db/store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> },
): Promise<Response> {
  const { owner, repo: repoSegment } = await params;
  const repo = repoSegment.endsWith(".svg")
    ? repoSegment.slice(0, -4)
    : repoSegment;
  if (!isBadgeIdentifier(owner) || !isBadgeIdentifier(repo)) {
    return new Response(renderScoreBadge(), {
      status: 400,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
  try {
    const [latest] = await (await getScanStore()).listHistory(owner, repo, 1);
    return new Response(renderScoreBadge(latest?.score), {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(renderScoreBadge(), {
      status: 503,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
