import type { Check } from "./contracts";
import { checkSec001ApiAuth } from "./sec/sec-001-api-auth";
import { checkSec002Secrets } from "./sec/sec-002-secrets";
import { checkSec003ClientSecrets } from "./sec/sec-003-client-secrets";
import { checkSec004WildcardCors } from "./sec/sec-004-wildcard-cors";
import { checkSec005SecurityHeaders } from "./sec/sec-005-security-headers";
import { checkSec006DangerousPatterns } from "./sec/sec-006-dangerous-patterns";
import { checkRel001RateLimit } from "./rel/rel-001-rate-limit";
import { checkRel002BodyValidation } from "./rel/rel-002-body-validation";
import { checkRel003ExternalCalls } from "./rel/rel-003-external-calls";
import { checkRel004HealthEndpoint } from "./rel/rel-004-health-endpoint";
import { checkData001RlsEnabled } from "./data/data-001-rls-enabled";
import { checkData002PermissiveRls } from "./data/data-002-permissive-rls";
import { checkData003MissingIndex } from "./data/data-003-missing-index";
import { checkData004DestructiveMigration } from "./data/data-004-destructive-migration";
import { checkObs001Observability } from "./obs/obs-001-observability";
import { checkQua001Tests } from "./qua/qua-001-tests";
import { checkQua002Ci } from "./qua/qua-002-ci";
import { checkQua003VulnerableDependencies } from "./qua/qua-003-vulnerable-dependencies";
import { checkQua004PinnedDependencies } from "./qua/qua-004-pinned-dependencies";

export const ALL_CHECKS: readonly Check[] = [
  checkSec001ApiAuth,
  checkSec002Secrets,
  checkSec003ClientSecrets,
  checkSec004WildcardCors,
  checkSec005SecurityHeaders,
  checkSec006DangerousPatterns,
  checkRel001RateLimit,
  checkRel002BodyValidation,
  checkRel003ExternalCalls,
  checkRel004HealthEndpoint,
  checkData001RlsEnabled,
  checkData002PermissiveRls,
  checkData003MissingIndex,
  checkData004DestructiveMigration,
  checkObs001Observability,
  checkQua001Tests,
  checkQua002Ci,
  checkQua003VulnerableDependencies,
  checkQua004PinnedDependencies,
];

export const ALL_CHECK_IDS = [
  "SEC-001",
  "SEC-002",
  "SEC-003",
  "SEC-004",
  "SEC-005",
  "SEC-006",
  "REL-001",
  "REL-002",
  "REL-003",
  "REL-004",
  "DATA-001",
  "DATA-002",
  "DATA-003",
  "DATA-004",
  "OBS-001",
  "QUA-001",
  "QUA-002",
  "QUA-003",
  "QUA-004",
] as const;

export {
  checkSec001ApiAuth,
  checkSec002Secrets,
  checkSec003ClientSecrets,
  checkSec004WildcardCors,
  checkSec005SecurityHeaders,
  checkSec006DangerousPatterns,
  checkRel001RateLimit,
  checkRel002BodyValidation,
  checkRel003ExternalCalls,
  checkRel004HealthEndpoint,
  checkData001RlsEnabled,
  checkData002PermissiveRls,
  checkData003MissingIndex,
  checkData004DestructiveMigration,
  checkObs001Observability,
  checkQua001Tests,
  checkQua002Ci,
  checkQua003VulnerableDependencies,
  checkQua004PinnedDependencies,
};
export type { Check, CheckContext } from "./contracts";
