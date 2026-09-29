# ATTEST

ATTEST is a GenLayer StudioNet application for bonded public claims. An author locks a factual statement, verification rule, public evidence URLs, deadline, and test-GEN bond. A challenger can post a counter-bond and contrary evidence. After the deadline, GenLayer validators independently fetch the sources and adjudicate the claim; the contract assigns withdrawable credit according to the agreed result.

This is the standalone ATTEST repository. It contains no other applications.

- [Live app](https://attest-web-silk.vercel.app)
- [StudioNet contract](https://explorer-studio.genlayer.com/address/0x3aFF086e8AAa7707b29ad88a9ebDf581d2d6Ef41)
- [Reviewer guide](docs/ATTEST_REVIEW.md)
- [Project Explorer submission guide](docs/ATTEST_SUBMISSION.md)
- [Public acceptance journal](deployments/attest_acceptance.json)

The release uses synthetic, project-controlled evidence and valueless StudioNet test GEN. The public acceptance covers three finalized claims: [att-1](https://attest-web-silk.vercel.app/?claim=att-1) DISPROVEN, [att-2](https://attest-web-silk.vercel.app/?claim=att-2) INCONCLUSIVE, and [att-3](https://attest-web-silk.vercel.app/?claim=att-3) UNCONTESTED. The journal records 13 finalized transactions, 16 passing checks, and two finalized native test-GEN withdrawals. The [read-only verifier](scripts/check_attest_release.py) checks the deployment, final claim records, evidence snapshots, receipts, and transfers without wallet keys.

## Repository layout

- `contracts/attest.py` — GenLayer intelligent contract
- `apps/attest-web/` — public Next.js application and synthetic evidence fixtures
- `tests/direct/test_attest.py` — direct contract tests
- `scripts/` — deployment, acceptance, and independent release verification
- `deployments/` — verified public deployment and acceptance records
- `docs/` — architecture, reviewer, submission, and logo assets

## Verify

Use Python 3.12, Node.js 22, and pnpm 11.19.0. From the repository root:

```powershell
pip install -r requirements-deploy.txt
python scripts/prepare_gltest_runner.py
genvm-lint check contracts/attest.py
pytest tests/direct/test_attest.py -q
python scripts/check_attest_release.py
```

For the frontend:

```powershell
cd apps/attest-web
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm audit --prod --audit-level high
```

The [frontend README](apps/attest-web/README.md) explains local wallet configuration. Without `NEXT_PUBLIC_ATTEST_ADDRESS`, the local app shows labeled sample records and disables writes. The hosted application is configured for the verified StudioNet contract.

The acceptance fixtures are synthetic and do not prove an independent real-world event. The hosted browser-wallet signing path, a live `SUPPORTED` claim, and the seven-day timeout were not exercised in the public acceptance run.
