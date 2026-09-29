# ATTEST finality and deposit-credit follow-up

On 2026-09-29, a reviewer reported that a finalized deposit showed “The transaction has not finalized” in the app and appeared lost. The reviewer transaction hash was not available, so this note does not claim to verify that particular deposit.

The issue was reproduced with the [finalized author deposit in the public acceptance journal](https://explorer-studio.genlayer.com/tx/0xbf3e3a1cce0adf5b5f88a52c4a6d3952e42788f6093e8ffb84dfb0aae80ed0d0). The GenLayer JavaScript SDK returns `status_name: "FINALIZED"` from `waitForTransactionReceipt`, while `getTransaction` returns `statusName: "FINALIZED"`. The app had checked only `statusName` or the numeric `status` code after waiting. It therefore displayed the false finality error and cleared the saved hash even when contract execution succeeded.

A read-only scan of this contract's public StudioNet history on 2026-09-29 found [one additional 1 GEN deposit that day](https://explorer-studio.genlayer.com/tx/0x078b82761f9c825e486d69d8671e15d8097a35982c0dd907dbafd2b04205f39f), sent by `0x01863B065D8D8eD5397B266DF2d121384e0b7d40`. Its GenLayer receipt was FINALIZED with successful execution, and `get_credit` reported exactly 1 GEN still available for that address at inspection time. We cannot attribute that wallet to the reviewer without their confirmation. If it is theirs, they can connect it and withdraw the credit without finding a hash.

The app now reads both status fields, separately checks successful contract execution, and keeps the saved transaction when a receipt is not yet final. It automatically reconciles a saved transaction after reconnecting and discovers deposit history from the connected wallet address on StudioNet. The connected-wallet view shows each discovered deposit's outcome and the contract's current GEN credit. **Refresh wallet status** updates both; **Withdraw credit** appears when current credit is positive. No transaction hash needs to be supplied to use this recovery flow. A successful deposit credits the contract balance; posting a claim or withdrawing credit can later reduce the available balance to zero.

To verify in the updated app:

1. Open [ATTEST](https://attest-web-silk.vercel.app) and connect the wallet used for the deposit on StudioNet.
2. Read **Deposits from this wallet** and **Available contract credit**. The app finds deposit transactions by wallet address and checks saved pending transactions automatically; select **Refresh wallet status** to retry at any time.
3. If the credit is positive, select **Withdraw credit** and wait for a finalized successful result. The balance should then return to zero. Do not send another deposit while a previous one is still processing or unverified.

Suggested reply for the existing portal review:

> We reproduced and fixed the false “transaction has not finalized” message. The updated ATTEST app now discovers deposits from the connected StudioNet wallet, checks their finalization and execution, and shows the current withdrawable credit without asking for a transaction hash. Please reconnect the wallet used for the deposit and inspect “Deposits from this wallet” and “Available contract credit.” A public 1 GEN deposit to this contract on September 29 finalized successfully and had 1 GEN available at our check, though we cannot confirm it is yours without your wallet address. If it is yours, use “Withdraw credit” to recover it; no new deposit is needed.

The regression tests in `apps/attest-web/tests/receipt.test.mjs` cover both receipt shapes, nonfinal statuses, failed execution, and wallet-address deposit discovery. A live read-only check found the known acceptance deposit and its exact amount using only the acceptance wallet address. The independent [read-only release verifier](../scripts/check_attest_release.py) checks the public acceptance transactions and settlement records. The hosted browser-wallet signing path was not part of that earlier acceptance run. The reviewer can verify their own outcome by connecting the same wallet; their particular deposit cannot be checked externally without at least that wallet address.
