import assert from "node:assert/strict";
import { test } from "node:test";
import { assertSuccessfulExecution, transactionStatus } from "../src/lib/attest.ts";

const successfulExecution = {
  consensus_data: {
    leader_receipt: [{
      execution_result: "SUCCESS",
      result: { status: "return", payload: { readable: "null" } },
      genvm_result: { error_code: null, error_description: null },
    }],
  },
};

test("accepts the simplified receipt returned after waiting for a finalized deposit", () => {
  const receipt = { status: 7, status_name: "FINALIZED", ...successfulExecution };
  assert.equal(transactionStatus(receipt), "FINALIZED");
  assert.doesNotThrow(() => assertSuccessfulExecution(receipt));
});

test("accepts the full getTransaction receipt when reconciling a saved hash", () => {
  const receipt = { status: 7, statusName: "FINALIZED", ...successfulExecution };
  assert.equal(transactionStatus(receipt), "FINALIZED");
  assert.doesNotThrow(() => assertSuccessfulExecution(receipt));
});

test("does not mistake an intermediate or numeric-only status for finality", () => {
  assert.equal(transactionStatus({ status: 7 }), "");
  assert.throws(() => assertSuccessfulExecution({ status: 7, ...successfulExecution }), /has not finalized/);
  assert.throws(() => assertSuccessfulExecution({ status_name: "ACCEPTED", ...successfulExecution }), /has not finalized/);
});

test("rejects a finalized transaction whose contract execution failed", () => {
  const receipt = {
    status_name: "FINALIZED",
    consensus_data: { leader_receipt: [{ execution_result: "ERROR", result: { status: "rollback", payload: "Rejected" } }] },
  };
  assert.throws(() => assertSuccessfulExecution(receipt), /Rejected/);
});
