import type { MetadataRoute } from "next";

/* Makes RSVPme installable: "Add to Home screen" opens it full screen, like an app */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RSVPme",
    short_name: "RSVPme",
    description: "Invitations with replies that count themselves.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6efe2",
    theme_color: "#7a1f2e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
