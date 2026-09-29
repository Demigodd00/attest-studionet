import { chains, createClient } from "genlayer-js";
import { TransactionHashVariant, TransactionStatus } from "genlayer-js/types";

export type Address = string;

export interface Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
  isMetaMask?: boolean;
}

export interface WalletSession {
  address: Address;
  client: ReturnType<typeof createClient>;
  provider: Provider;
  walletName: string;
}

export interface ChallengeRecord {
  challenger: string;
  argument: string;
  source_urls: string[];
  bond_atto: string;
  created_at: number;
}

export interface Citation {
  source_id: string;
  role: string;
  url: string;
  digest: string;
  line: number;
  excerpt: string;
}

export interface EvidenceSnapshot {
  id: string;
  role: string;
  url: string;
  status: "READABLE" | "TOO_LARGE" | "UNAVAILABLE";
  digest: string;
  text: string;
}

export interface ClaimSummary {
  id: string;
  title: string;
  statement: string;
  author: string;
  bond_atto: string;
  challenge_bond_atto: string;
  created_at: string;
  challenge_deadline: string;
  status: "OPEN" | "CHALLENGED" | "RESOLVED";
  outcome: string;
  terms_digest: string;
  challenged: boolean;
}

export interface ClaimRecord extends ClaimSummary {
  verification_rule: string;
  source_urls: string[];
  review_window_secs: number;
  challenge: ChallengeRecord | null;
  author_argument: string;
  response_argument: string;
  response_urls: string[];
  reason: string;
  citations: Citation[];
  evidence_snapshot: EvidenceSnapshot[];
  resolved_at: number;
}

export interface ProtocolStats {
  total_created: string;
  total_challenged: string;
  total_supported: string;
  total_disproven: string;
  total_inconclusive: string;
  total_timeout_refunded: string;
  total_locked_atto: string;
  total_settled_atto: string;
}

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ATTEST_ADDRESS ?? "";
export const CONTRACT_READY =
  /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS) && !/^0x0{40}$/i.test(CONTRACT_ADDRESS);
export const EXPLORER_URL = CONTRACT_READY
  ? "https://explorer-studio.genlayer.com/address/" + CONTRACT_ADDRESS
  : "https://explorer-studio.genlayer.com";

const readClient = createClient({ chain: chains.studionet });
const PAGE_SIZE = 50;

export interface ClaimPage {
  total: number;
  items: ClaimSummary[];
}

export interface PendingTransaction {
  hash: string;
  method: string;
  submittedAt: number;
}

export interface WalletDeposit {
  hash: string;
  amountAtto: string | null;
  status: string;
  outcome: "credited" | "failed" | "pending" | "unknown";
  createdAt: string;
}

function pendingKey(address: Address): string {
  return "attest:pending:61999:" + CONTRACT_ADDRESS.toLowerCase() + ":" + address.toLowerCase();
}

export function getPendingTransaction(address: Address): PendingTransaction | null {
  if (typeof window === "undefined" || !CONTRACT_READY) return null;
  const raw = window.localStorage.getItem(pendingKey(address));
  if (!raw) return null;
  try {
    const pending = JSON.parse(raw) as PendingTransaction;
    if (/^0x[0-9a-fA-F]{64}$/.test(pending.hash) && typeof pending.method === "string") return pending;
  } catch {
    // Keep invalid journals blocked for manual inspection rather than silently resending.
  }
  throw new Error("A saved transaction could not be read. Inspect this wallet's recent StudioNet activity before sending again.");
}

function clearPendingTransaction(address: Address): void {
  window.localStorage.removeItem(pendingKey(address));
}

export function formatGen(value: string | bigint, precision = 3): string {
  const atto = typeof value === "bigint" ? value : BigInt(value || "0");
  const whole = atto / 10n ** 18n;
  const fraction = (atto % 10n ** 18n)
    .toString()
    .padStart(18, "0")
    .slice(0, precision)
    .replace(/0+$/, "");
  return fraction ? whole.toString() + "." + fraction : whole.toString();
}

export function parseGen(value: string): bigint {
  const input = value.trim();
  if (!/^\d+(\.\d{0,18})?$/.test(input)) {
    throw new Error("Enter a GEN amount with up to 18 decimal places.");
  }
  const [whole, fraction = ""] = input.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
}

export function shortenAddress(value: string): string {
  return value.length > 13 ? value.slice(0, 6) + "…" + value.slice(-4) : value;
}

function contractAddress(): Address {
  if (!CONTRACT_READY) throw new Error("The ATTEST contract has not been configured for this app.");
  return CONTRACT_ADDRESS;
}

export async function connectWallet(provider: Provider): Promise<WalletSession> {
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(accounts[0])) {
    throw new Error("The wallet did not return a valid account.");
  }
  const chain = chains.studionet;
  const chainId = "0x" + chain.id.toString(16);
  const currentChain = await provider.request({ method: "eth_chainId" });
  if (typeof currentChain !== "string" || BigInt(currentChain) !== BigInt(chain.id)) {
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? (error as { code?: number }).code
          : undefined;
      if (code !== 4902) throw error;
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId,
            chainName: chain.name,
            rpcUrls: [...chain.rpcUrls.default.http],
            nativeCurrency: chain.nativeCurrency,
            ...(chain.blockExplorers?.default.url
              ? { blockExplorerUrls: [chain.blockExplorers.default.url] }
              : {}),
          },
        ],
      });
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
    }
  }
  const activeAccounts = await provider.request({ method: "eth_accounts" });
  if (!Array.isArray(activeAccounts) || typeof activeAccounts[0] !== "string") {
    throw new Error("No wallet account is available after connecting.");
  }
  const activeChain = await provider.request({ method: "eth_chainId" });
  if (typeof activeChain !== "string" || BigInt(activeChain) !== BigInt(chain.id)) {
    throw new Error("Switch your wallet to StudioNet and reconnect.");
  }
  const address = activeAccounts[0] as Address;
  return {
    address,
    client: createClient({ chain, account: address as never, provider: provider as never }),
    provider,
    walletName: provider.isMetaMask ? "MetaMask" : "Browser wallet",
  };
}

export async function listClaims(offset = 0): Promise<ClaimPage> {
  const result = (await readClient.readContract({
    address: contractAddress() as never,
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
    functionName: "list_claims",
    args: [offset, PAGE_SIZE],
  })) as unknown as { total: string; items: ClaimSummary[] };
  const total = Number(result.total);
  if (!Number.isSafeInteger(total) || total < 0 || !Array.isArray(result.items)) {
    throw new Error("The contract returned an invalid claims page.");
  }
  return { total, items: result.items };
}

export async function getClaim(claimId: string): Promise<ClaimRecord> {
  return (await readClient.readContract({
    address: contractAddress() as never,
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
    functionName: "get_claim",
    args: [claimId],
  })) as unknown as ClaimRecord;
}

export async function getStats(): Promise<ProtocolStats> {
  return (await readClient.readContract({
    address: contractAddress() as never,
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
    functionName: "get_stats",
    args: [],
  })) as unknown as ProtocolStats;
}

export async function getCredit(address: Address): Promise<string> {
  return (await readClient.readContract({
    address: contractAddress() as never,
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
    functionName: "get_credit",
    args: [address],
  })) as string;
}

export function depositHistoryCandidates(history: unknown, address: Address, contractAddressValue: Address): { hash: string; createdAt: string }[] {
  if (!Array.isArray(history)) throw new Error("StudioNet returned invalid wallet activity.");
  const sender = address.toLowerCase();
  const contract = contractAddressValue.toLowerCase();
  const seen = new Set<string>();
  return history.filter((entry) => {
    const row = object(entry);
    const hash = row.hash;
    const value = row.value;
    const positive = typeof value === "bigint" ? value > 0n :
      typeof value === "number" ? Number.isFinite(value) && value > 0 :
      typeof value === "string" && /^\d+$/.test(value) && BigInt(value) > 0n;
    if (typeof hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(hash) ||
      String(row.from_address ?? "").toLowerCase() !== sender ||
      String(row.to_address ?? "").toLowerCase() !== contract || !positive || seen.has(hash.toLowerCase())) return false;
    seen.add(hash.toLowerCase());
    return true;
  }).map((entry) => {
    const row = object(entry);
    return { hash: String(row.hash), createdAt: typeof row.created_at === "string" ? row.created_at : "" };
  }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 20);
}

export async function getWalletDeposits(address: Address): Promise<WalletDeposit[]> {
  const history = await readClient.request({ method: "sim_getTransactionsForAddress", params: [address as never] });
  const candidates = depositHistoryCandidates(history, address, contractAddress());
  return Promise.all(candidates.map(async ({ hash, createdAt }): Promise<WalletDeposit> => {
    try {
      const receipt = await readClient.getTransaction({ hash: hash as never });
      const tx = object(receipt);
      if (String(tx.sender ?? tx.from_address ?? "").toLowerCase() !== address.toLowerCase() ||
        String(tx.to_address ?? tx.to ?? "").toLowerCase() !== contractAddress().toLowerCase()) {
        throw new Error("Transaction does not match the connected wallet and ATTEST contract.");
      }
      const amount = tx.value;
      const amountAtto = typeof amount === "bigint" || typeof amount === "string" ? String(amount) : null;
      const status = transactionStatus(receipt);
      if (status !== TransactionStatus.FINALIZED) {
        const outcome = status === "CANCELED" || status === "CANCELLED" || status === "UNDETERMINED" ? "failed" : status ? "pending" : "unknown";
        return { hash, amountAtto, status, outcome, createdAt };
      }
      try {
        assertSuccessfulExecution(receipt);
        return { hash, amountAtto, status, outcome: "credited", createdAt };
      } catch {
        return { hash, amountAtto, status, outcome: "failed", createdAt };
      }
    } catch {
      return { hash, amountAtto: null, status: "UNKNOWN", outcome: "unknown", createdAt };
    }
  }));
}

export async function writeContract(
  session: WalletSession,
  functionName: string,
  args: unknown[],
  value = 0n,
  onSubmitted?: (hash: string) => void,
): Promise<string> {
  if (!navigator.locks) {
    throw new Error("Safe transaction submission requires a modern browser on HTTPS or localhost.");
  }
  return navigator.locks.request(pendingKey(session.address), { ifAvailable: true }, async (lock) => {
    if (!lock) throw new Error("Another tab is sending a transaction from this wallet.");
    if (getPendingTransaction(session.address)) {
      throw new Error("This wallet has a saved transaction. Check its outcome before submitting another.");
    }
    const storageProbe = pendingKey(session.address) + ":probe";
    try {
      window.localStorage.setItem(storageProbe, "1");
      if (window.localStorage.getItem(storageProbe) !== "1") throw new Error("Browser storage is unavailable.");
      window.localStorage.removeItem(storageProbe);
    } catch {
      throw new Error("Enable browser storage before signing so ATTEST can recover the transaction after a page reload.");
    }
    const hash = await session.client.writeContract({
      address: contractAddress() as never,
      functionName,
      args: args as never[],
      value,
    });
    const transactionHash = String(hash);
    window.localStorage.setItem(pendingKey(session.address), JSON.stringify({
      hash: transactionHash, method: functionName, submittedAt: Date.now(),
    } satisfies PendingTransaction));
    onSubmitted?.(transactionHash);
    const receipt = await readClient.waitForTransactionReceipt({
      hash: hash as never, status: TransactionStatus.FINALIZED, retries: 120,
    });
    if (transactionStatus(receipt) !== TransactionStatus.FINALIZED) {
      throw new Error("The transaction has not finalized. Check the saved transaction before sending another.");
    }
    try {
      assertSuccessfulExecution(receipt);
    } finally {
      // A finalized result is definitive, including a finalized execution error.
      clearPendingTransaction(session.address);
    }
    return transactionHash;
  });
}

export async function reconcilePendingTransaction(session: WalletSession): Promise<{ done: boolean; successful: boolean; message: string; hash?: string }> {
  const pending = getPendingTransaction(session.address);
  if (!pending) return { done: true, successful: false, message: "No pending transaction is saved." };
  const receipt = await readClient.getTransaction({ hash: pending.hash as never });
  const status = transactionStatus(receipt);
  if (status === "UNDETERMINED" || status === "CANCELED" || status === "CANCELLED") {
    clearPendingTransaction(session.address);
    return { done: true, successful: false, message: "The transaction ended without successful execution (" + status + ").", hash: pending.hash };
  }
  if (status !== TransactionStatus.FINALIZED) {
    return { done: false, successful: false, message: "The transaction is still " + (status || "pending") + ". Do not submit it again.", hash: pending.hash };
  }
  try {
    assertSuccessfulExecution(receipt);
    return { done: true, successful: true, message: "The saved transaction finalized successfully.", hash: pending.hash };
  } catch (error) {
    return { done: true, successful: false, message: error instanceof Error ? "Finalized without successful execution: " + error.message : "Finalized without successful execution.", hash: pending.hash };
  } finally {
    clearPendingTransaction(session.address);
  }
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function transactionStatus(receipt: unknown): string {
  const tx = object(receipt);
  // The SDK returns status_name for waited/simplified StudioNet receipts and
  // statusName for getTransaction. status itself is the numeric lifecycle code.
  const status = tx.status_name ?? tx.statusName ?? tx.status;
  return typeof status === "string" ? status.toUpperCase() : "";
}

export function assertSuccessfulExecution(receipt: unknown): void {
  const tx = object(receipt);
  if (transactionStatus(receipt) !== TransactionStatus.FINALIZED) {
    throw new Error("The transaction has not finalized.");
  }
  const consensus = object(tx.consensus_data ?? tx.consensusData);
  const leaders = consensus.leader_receipt ?? consensus.leaderReceipt;
  const leader = object(Array.isArray(leaders) ? leaders[0] : leaders);
  const result = object(leader.result);
  const vm = object(leader.genvm_result ?? leader.genvmResult);
  const execution = leader.execution_result ?? leader.executionResult;
  const failed =
    Boolean(tx.error || vm.error_code || vm.error_description) ||
    result.status === "rollback" ||
    result.status === "error";
  if (
    !failed &&
    (execution === "SUCCESS" ||
      (execution === undefined && tx.txExecutionResultName === "FINISHED_WITH_RETURN"))
  ) {
    return;
  }
  const payload = result.payload;
  const candidates = [
    typeof payload === "string" ? payload : object(payload).readable,
    vm.error_description,
    typeof tx.error === "string" ? tx.error : object(tx.error).message,
  ];
  const reason = candidates.find((candidate) => typeof candidate === "string" && candidate.trim());
  throw new Error(typeof reason === "string" ? reason : "GenLayer did not confirm successful execution.");
}
