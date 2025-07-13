import { defineConfig } from "@rspack/cli";
import { rspack } from "@rspack/core";
import { RsdoctorRspackPlugin } from "@rsdoctor/rspack-plugin";
import { TsCheckerRspackPlugin } from "ts-checker-rspack-plugin";

import { copyFile, mkdir, readdir, readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { join } from "path";
import { fileURLToPath } from "url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const packagemeta = JSON.parse(await readFile("package.json"));

export default defineConfig({
  mode: "development",
  devtool: "source-map",
  entry: {
    bundle: join(__dirname, "src/main.tsx"),
  },
  resolve: {
    extensions: [".ts", ".js", ".tsx"],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        loader: "builtin:swc-loader",
        exclude: ["/node_modules/"],
        options: {
          jsc: {
            parser: {
              syntax: "typescript",
            },
            target: "es2022",
            transform: {
              react: {
                runtime: "automatic",
                importSource: "dreamland",
                throwIfNamespace: false,
              },
            },
          },
          module: {
            type: "es6",
            strict: false,
            strictMode: false,
          },
        },
        type: "javascript/auto",
      },
    ],
    parser: {
      javascript: {
        overrideStrict: "non-strict",
        dynamicImportMode: "eager",
      },
    },
  },
  output: {
    filename: "mw_bundle.js",
    path: join(__dirname, "resources"),
    libraryTarget: "es2022",
    iife: true,
  },
  plugins: [
    {
      apply(compiler) {
        compiler.hooks.done.tap("PostBuildPlugin", (stats) => {
          console.log("Build completed! Running post-build code...");

          (async () => {
            const sourceDir = join(__dirname, "resources");
            const targetDir = join(__dirname, "vivaldi/resources/vivaldi");

            try {
              await mkdir(targetDir, { recursive: true });
              const files = await readdir(sourceDir);

              for (const file of files) {
                const sourceFile = join(sourceDir, file);
                const targetFile = join(targetDir, file);
                await copyFile(sourceFile, targetFile);
              }

              console.log("Files copied successfully!");
            } catch (error) {
              console.error("Error copying files:", error);
            }
          })();
        });
      },
    },
    // new TsCheckerRspackPlugin(),
    new rspack.DefinePlugin({
      VERSION: JSON.stringify(packagemeta.version),
    }),
    new rspack.DefinePlugin({
      COMMITHASH: (() => {
        try {
          const hash = JSON.stringify(
            execSync("git rev-parse --short HEAD", {
              encoding: "utf-8",
            }).replace(/\r?\n|\r/g, ""),
          );

          return hash;
        } catch {
          return "unknown";
        }
      })(),
    }),
    process.env.DEBUG
      ? new RsdoctorRspackPlugin({
          supports: {
            parseBundle: true,
            banner: true,
          },
        })
      : null,
  ],
  target: "web",
});
