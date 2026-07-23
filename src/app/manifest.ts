import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Rizqhub", short_name: "Rizqhub", description: "Platform commerce universal untuk kursus, produk digital, dan jasa.", start_url: "/", display: "standalone", background_color: "#fbfaf6", theme_color: "#163d2d", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] };
}
