# ATTEST finality and deposit-credit follow-up

On 2026-09-29, a reviewer reported that a finalized deposit showed “The transaction has not finalized” in the app and appeared lost. The reviewer transaction hash was not available, so this note does not claim to verify that particular deposit.

The issue was reproduced with the [finalized author deposit in the public acceptance journal](https://explorer-studio.genlayer.com/tx/0xbf3e3a1cce0adf5b5f88a52c4a6d3952e42788f6093e8ffb84dfb0aae80ed0d0). The GenLayer JavaScript SDK returns `status_name: "FINALIZED"` from `waitForTransactionReceipt`, while `getTransaction` returns `statusName: "FINALIZED"`. The app had checked only `statusName` or the numeric `status` code after waiting. It therefore displayed the false finality error and cleared the saved hash even when contract execution succeeded.

The app now reads both status fields, separately checks successful contract execution, and keeps the saved transaction when a receipt is not yet final. The connected-wallet view shows the contract's available GEN credit, offers **Refresh credit**, and exposes **Withdraw credit** whenever that credit is positive. The same wallet that sent a deposit can use these controls to inspect and withdraw unused credit; no new deposit should be sent to recover it. A successful deposit credits the contract balance; posting a claim is a separate transaction.

To verify in the updated app:

1. Open [ATTEST](https://attest-web-silk.vercel.app) and connect the wallet used for the deposit on StudioNet.
2. Read **Available contract credit** and select **Refresh credit**. If there is a saved pending transaction, select **Check pending transaction** first.
3. If the credit is positive, select **Withdraw credit** and wait for a finalized successful result. The balance should then return to zero.

The regression tests in `apps/attest-web/tests/receipt.test.mjs` cover the waited simplified receipt, the full reconciliation receipt, nonfinal statuses, and failed execution. The independent [read-only release verifier](../scripts/check_attest_release.py) checks the public acceptance transactions and settlement records. The hosted browser-wallet signing path was not part of that earlier acceptance run. Without the reviewer's transaction hash or wallet address, their exact credit and withdrawal outcome cannot be confirmed from public records.
