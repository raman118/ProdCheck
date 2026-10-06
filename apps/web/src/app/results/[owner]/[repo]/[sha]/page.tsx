import { ScanResults } from "../../../../../components/scan-app";
import { getScanStore } from "../../../../../lib/db/store";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string; sha: string }>;
}) {
  const { owner, repo, sha } = await params;
  const store = await getScanStore().catch(() => undefined);
  const report = await store
    ?.getReport(owner, repo, sha)
    .catch(() => undefined);
  const history = report
    ? await store?.listHistory(owner, repo).catch(() => [])
    : [];
  return (
    <ScanResults
      owner={owner}
      repo={repo}
      sha={sha}
      initialReport={report}
      history={history ?? []}
    />
  );
}
