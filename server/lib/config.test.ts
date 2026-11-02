import { describe, expect, it } from "vitest";
import { parseSettings } from "./config";

const base = {
  migrationsDir: "m",
  mqtt: { url: "mqtt://x", username: "", password: "", sharedGroup: "" },
  timescale: { mode: "auto", compressAfter: "", retention: "" },
};

describe("parseSettings", () => {
  it("treats empty strings as unset", () => {
    const s = parseSettings(base);
    expect(s.mqtt.username).toBeUndefined();
    expect(s.timescale.compressAfter).toBeUndefined();
  });

  it("restores strings that destr turned into booleans or numbers", () => {
    const s = parseSettings({
      ...base,
      mqtt: { ...base.mqtt, password: 123456 },
      timescale: { ...base.timescale, mode: true },
    });
    expect(s.mqtt.password).toBe("123456");
    expect(s.timescale.mode).toBe("true");
    expect(parseSettings({ ...base, timescale: { ...base.timescale, mode: false } }).timescale.mode).toBe("false");
  });

  it("rejects an invalid mode", () => {
    expect(() =>
      parseSettings({ ...base, timescale: { ...base.timescale, mode: "yes" } }),
    ).toThrow();
  });
});
