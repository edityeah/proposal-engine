/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse and mammoth are server-only; keep them out of the client bundle.
  // pdfkit et al. are server-only; @electric-sql/pglite must stay external so its
  // WASM + Node filesystem backend load correctly (local-dev DB).
  serverExternalPackages: ["pdf-parse", "mammoth", "pdfkit", "@electric-sql/pglite"],
  // Hide the Next.js dev-tools indicator — it sits bottom-left and overlaps the
  // sidebar's user footer. (Dev-only overlay; no effect on production.)
  devIndicators: false,
};

export default nextConfig;
