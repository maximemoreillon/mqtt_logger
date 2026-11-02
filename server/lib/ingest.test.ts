import { describe, expect, it } from "vitest";
import {
  extractValues,
  isValidTopicFilter,
  toNumber,
  topicMatches,
} from "./ingest";

describe("toNumber", () => {
  it.each([
    [21.5, 21.5],
    [0, 0],
    ["21.5", 21.5],
    [" 3 ", 3],
    [true, 1],
    [false, 0],
    ["", null],
    ["  ", null],
    [null, null],
    ["12abc", null],
    ["ON", null],
    [Number.NaN, null],
    [Number.POSITIVE_INFINITY, null],
  ])("%j -> %j", (input, expected) => {
    expect(toNumber(input)).toBe(expected);
  });
});

describe("extractValues", () => {
  it("handles flat JSON objects, keeping zeros and booleans", () => {
    expect(
      extractValues('{"temperature": 21.5, "humidity": 0, "door": false}'),
    ).toEqual([
      { field: "temperature", value: 21.5 },
      { field: "humidity", value: 0 },
      { field: "door", value: 0 },
    ]);
  });

  it("flattens nested objects with dotted names", () => {
    expect(extractValues('{"ENERGY": {"Power": 12, "Today": "1.5"}}')).toEqual([
      { field: "ENERGY.Power", value: 12 },
      { field: "ENERGY.Today", value: 1.5 },
    ]);
  });

  it("stores bare values under 'value'", () => {
    expect(extractValues("21.5")).toEqual([{ field: "value", value: 21.5 }]);
    expect(extractValues("true")).toEqual([{ field: "value", value: 1 }]);
  });

  it("skips strings, nulls and non-numeric payloads", () => {
    expect(extractValues('{"state": "ON", "x": null, "t": 1}')).toEqual([
      { field: "t", value: 1 },
    ]);
    expect(extractValues("ON")).toEqual([]);
    expect(extractValues("")).toEqual([]);
  });

  it("applies the keys whitelist on flattened names", () => {
    expect(
      extractValues('{"a": 1, "b": 2, "c": {"d": 3}}', ["a", "c.d"]),
    ).toEqual([
      { field: "a", value: 1 },
      { field: "c.d", value: 3 },
    ]);
  });
});

describe("topicMatches", () => {
  it.each([
    ["home/temp", "home/temp", true],
    ["home/temp", "home/humidity", false],
    ["home/+/temp", "home/kitchen/temp", true],
    ["home/+/temp", "home/kitchen/sub/temp", false],
    ["home/#", "home/kitchen/temp", true],
    ["home/#", "home", true],
    ["#", "anything/at/all", true],
    ["+", "$SYS/broker", false],
    ["#", "$SYS/broker", false],
    ["home/+", "home", false],
  ])("%s vs %s -> %s", (filter, topic, expected) => {
    expect(topicMatches(filter, topic)).toBe(expected);
  });
});

describe("isValidTopicFilter", () => {
  it.each([
    ["home/temp", true],
    ["home/+/temp", true],
    ["home/#", true],
    ["#", true],
    ["home/#/temp", false],
    ["home/te#", false],
    ["home/te+mp", false],
    ["", false],
  ])("%s -> %s", (filter, expected) => {
    expect(isValidTopicFilter(filter)).toBe(expected);
  });
});
