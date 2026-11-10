/**
 * Checks that every built-in template, converted to the editable format, renders
 * the same email as the code template. Run: npx tsx scripts/email-roundtrip.ts
 */
import assert from "node:assert/strict";
import { SAMPLE_VARS, TEMPLATE_IDS, defaultSource, validate } from "@/lib/email/catalogue";
import { renderText } from "@/lib/email/render";
import { compile, parse, serialize } from "@/lib/email/source";
import { templates } from "@/lib/email/templates";

const variants = [SAMPLE_VARS, { ...SAMPLE_VARS, onboarding_call_line: "", calendar_link: "" }];
for (const id of TEMPLATE_IDS) {
  const src = defaultSource(id);
  assert.deepEqual(validate(id, src), [], `${id} default fails validation`);
  assert.equal(serialize(parse(src.body)), src.body, `${id} parse/serialize not stable`);
  for (const vars of variants) {
    const want = templates[id](vars);
    const got = compile(src, vars);
    assert.equal(got.subject, want.subject, `${id} subject`);
    assert.equal(renderText(got.blocks), renderText(want.blocks), `${id} body`);
  }
}
// Editing guards
assert.ok(validate("C01", { subject: "Hi {{frist_name}}", body: "x" }).some((e) => e.includes("frist_name")));
assert.ok(validate("C01", { subject: "Hi", body: "Dear {{first_name" }).some((e) => e.includes("unfinished")));
assert.deepEqual(validate("C11", { subject: "{{milestone_label}}", body: "x" }), []);
assert.ok(validate("C01", { subject: "{{milestone_label}}", body: "x" }).length > 0);
console.log(`ALL ${TEMPLATE_IDS.length} TEMPLATES ROUND-TRIP`);
