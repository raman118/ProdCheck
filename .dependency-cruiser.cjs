module.exports = {
  forbidden: [
    {
      name: "scanner-must-not-import-web",
      severity: "error",
      comment:
        "Move shared contracts to packages/shared; scanner cannot depend on the web app.",
      from: { path: "^packages/scanner/" },
      to: { path: "^apps/web/" },
    },
    {
      name: "shared-must-not-import-workspace-packages",
      severity: "error",
      comment:
        "Keep shared at the dependency root; move reusable implementation into shared or the consuming package.",
      from: { path: "^packages/shared/" },
      to: { path: "^(apps/|packages/(?!shared/))" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    enhancedResolveOptions: { exportsFields: ["exports"] },
    tsConfig: { fileName: "tsconfig.base.json" },
    includeOnly: "^(apps|packages)/",
  },
};
