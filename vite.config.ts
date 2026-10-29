// Kuromoji dictionaries ship from public/kuromoji-dict as *.dat.bin (raw gzip bytes);
// the hosting layer does not serve *.gz as plain static files.
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
});
