const headers = [
  { key: "Content-Security-Policy", value: "default-src 'self'" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Frame-Options", value: "DENY" },
];
export default { headers };
