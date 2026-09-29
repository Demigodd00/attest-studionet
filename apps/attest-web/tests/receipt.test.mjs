import assert from "node:assert/strict";
import { test } from "node:test";
import { assertSuccessfulExecution, depositHistoryCandidates, transactionStatus } from "../src/lib/attest.ts";

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

test("finds deposits by wallet and contract without a supplied transaction hash", () => {
  const wallet = "0x1cc85742D0231973C801d69c9260A916E30510D5";
  const contract = "0x3aFF086e8AAa7707b29ad88a9ebDf581d2d6Ef41";
  const hash = "0xbf3e3a1cce0adf5b5f88a52c4a6d3952e42788f6093e8ffb84dfb0aae80ed0d0";
  const deposit = { hash, from_address: wallet.toLowerCase(), to_address: contract, value: 13000000000000000, created_at: "2026-09-28T21:30:15Z" };
  const history = [
    { ...deposit, value: 0 },
    { ...deposit, to_address: wallet },
    { ...deposit, from_address: contract },
    deposit,
    { ...deposit, from_address: wallet },
  ];
  assert.deepEqual(depositHistoryCandidates(history, wallet, contract), [{ hash, createdAt: deposit.created_at }]);
  assert.throws(() => depositHistoryCandidates({}, wallet, contract), /invalid wallet activity/);
});
