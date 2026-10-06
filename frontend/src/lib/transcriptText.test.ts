import test from "node:test";
import assert from "node:assert/strict";
import { transcriptToText } from "./transcriptText.ts";

test("transcriptToText writes one timestamped line per segment", () => {
  const text = transcriptToText("Standup", [
    { speaker_name: "Ana", start_time: 0, text: "Hi" },
    { speaker_name: "Bo", start_time: 75, text: "Hello" },
  ]);
  assert.equal(text, "Standup\n\n[00:00] Ana: Hi\n[01:15] Bo: Hello\n");
});
