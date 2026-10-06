import type { OsvAdvisory } from "./osv-client";

export const OFFLINE_OSV_FIXTURE: readonly OsvAdvisory[] = [
  {
    packageName: "lodash",
    version: "4.17.20",
    id: "GHSA-35jh-r3h4-6jhm",
    summary:
      "Lodash version 4.17.20 has a known security advisory in this offline fixture.",
    fixedVersion: "4.17.21",
  },
];
