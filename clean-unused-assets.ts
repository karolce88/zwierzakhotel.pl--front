import { readdir, readFile, stat, unlink } from "fs/promises";
      import fs from "fs";
      import path from "path";

      async function getAllFiles(dir: string): Promise<string[]> {
        const entries = await readdir(dir, { withFileTypes: true });
        const files: string[] = [];
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files.push(...(await getAllFiles(fullPath)));
          } else {
            files.push(fullPath);
          }
        }
        return files;
      }

      export async function smartClean(options?: { distDir?: string; assetsSubdir?: string }) {
        const distDir = options?.distDir ?? "dist";
        const assetsSubdir = options?.assetsSubdir ?? "assets";
        const assetsDir = path.join(distDir, assetsSubdir);

        let allDistFiles: string[] = [];
        try {
          allDistFiles = await getAllFiles(distDir);
        } catch {
          console.warn(`⚠ Cannot read dist directory: ${distDir}. Skipping SmartClean.`);
          return;
        }

        const contentFiles = allDistFiles.filter((file) =>
          /\.(html|css|js|mjs|cjs|ts|map)$/i.test(file)
        );

        let combinedContent = "";
        for (const file of contentFiles) {
          try {
            combinedContent += await readFile(file, "utf-8");
          } catch {}
        }

        let assetFiles: string[] = [];
        try {
          assetFiles = await getAllFiles(assetsDir);
        } catch {
          console.warn(`⚠ No assets folder found in ${assetsDir}, skipping SmartClean.`);
          return;
        }

        let removed = 0;
        for (const file of assetFiles) {
          const info = await stat(file);
          if (!info.isFile()) continue;
          const fileName = path.basename(file);
          if (!combinedContent.includes(fileName)) {
            await unlink(file);
            console.log("🧹 Removed unused asset:", fileName);
            removed++;
          }
        }

        if (removed === 0) {
          console.log("✨ SmartClean: no unused assets found.");
        } else {
          console.log(`✅ SmartClean: removed ${removed} unused asset(s).`);
        }
      }
      