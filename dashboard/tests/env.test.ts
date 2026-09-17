import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), "dashboard-env-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.ROOT_ENV_PATH;
});

describe("resolveRootEnvPath", () => {
  it("uses ROOT_ENV_PATH when set", async () => {
    process.env.ROOT_ENV_PATH = "/custom/path/.env";
    const { resolveRootEnvPath } = await import("@/lib/env");
    expect(resolveRootEnvPath()).toBe("/custom/path/.env");
  });
});

describe("parseEnvFile", () => {
  it("parses KEY=value lines, skipping blanks and comments", async () => {
    const { parseEnvFile } = await import("@/lib/env");
    const result = parseEnvFile(["# comment", "", "FOO=bar", "BAZ=1"].join("\n"));
    expect(result).toEqual({ FOO: "bar", BAZ: "1" });
  });

  it("strips matching surrounding quotes from a value", async () => {
    const { parseEnvFile } = await import("@/lib/env");
    expect(parseEnvFile('KEY="quoted value"').KEY).toBe("quoted value");
    expect(parseEnvFile("KEY='single quoted'").KEY).toBe("single quoted");
  });

  it("ignores a line with no '=' rather than throwing", async () => {
    const { parseEnvFile } = await import("@/lib/env");
    expect(parseEnvFile("not a valid line\nOK=1")).toEqual({ OK: "1" });
  });
});

describe("ConfigError", () => {
  it("is a distinguishable Error subclass", async () => {
    const { ConfigError } = await import("@/lib/env");
    const err = new ConfigError("bad config");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("bad config");
  });
});
