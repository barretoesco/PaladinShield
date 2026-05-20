/**
 * Solana transaction fixtures for Integration Lab demos.
 * Browser: loads @solana/web3.js via esm.sh bundle (needs network once).
 * Node/tests: use direct @solana/web3.js import in test files.
 */
const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
const DEMO_PUBKEY_STR = "11111111111111111111111111111112";
const WEB3_BUNDLE_URL = "https://esm.sh/@solana/web3.js@1.98.4?bundle";

/** @type {Promise<typeof import('@solana/web3.js')>|null} */
let web3LoadPromise = null;

function loadWeb3Module() {
  if (!web3LoadPromise) {
    web3LoadPromise = import(WEB3_BUNDLE_URL).catch((error) => {
      web3LoadPromise = null;
      throw error;
    });
  }
  return web3LoadPromise;
}

function buildBenignPlainTransaction() {
  return {
    instructions: [{ programId: SYSTEM_PROGRAM_ID, data: new Uint8Array([0]), keys: [] }],
  };
}

function buildHostilePlainSignAndSendTransaction() {
  const auditText = "AUDIT_TEST_MALICIOUS_SIGN_AND_SEND";
  return {
    metadata: { audit: auditText, target: "drainer-domain.evil" },
    instructions: [
      {
        programId: MEMO_PROGRAM_ID,
        data: new Uint8Array([...new TextEncoder().encode(auditText)]),
        keys: [],
      },
    ],
  };
}

/** @returns {Promise<{ tx: unknown, source: 'web3.js'|'plain' }>} */
export async function buildBenignWeb3Transaction() {
  try {
    const { PublicKey, Transaction, SystemProgram } = await loadWeb3Module();
    const payer = new PublicKey(DEMO_PUBKEY_STR);
    const tx = new Transaction({
      recentBlockhash: "11111111111111111111111111111111",
      feePayer: payer,
    }).add(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: payer,
        lamports: 0,
      })
    );
    return { tx, source: "web3.js" };
  } catch {
    return { tx: buildBenignPlainTransaction(), source: "plain" };
  }
}

/** @returns {Promise<{ tx: unknown, source: 'web3.js'|'plain' }>} */
export async function buildHostileWeb3SignAndSendTransaction() {
  const auditText = "AUDIT_TEST_MALICIOUS_SIGN_AND_SEND";
  try {
    const { PublicKey, Transaction, TransactionInstruction } = await loadWeb3Module();
    const tx = new Transaction({
      recentBlockhash: "11111111111111111111111111111111",
      feePayer: new PublicKey(DEMO_PUBKEY_STR),
    }).add(
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        keys: [],
        data: new TextEncoder().encode(auditText),
      })
    );
    /** @type {Transaction & { metadata?: Record<string, unknown> }} */ (tx).metadata = {
      audit: auditText,
      target: "drainer-domain.evil",
    };
    return { tx, source: "web3.js" };
  } catch {
    return { tx: buildHostilePlainSignAndSendTransaction(), source: "plain" };
  }
}

/** @param {unknown} tx */
export function summarizeWeb3Transaction(tx) {
  const record = /** @type {{ instructions?: Array<{ programId?: { toBase58?: () => string } | string }> }} */ (
    tx
  );

  let serializedBytes = 0;
  if (typeof /** @type {{ serialize?: Function }} */ (tx).serialize === "function") {
    try {
      const bytes = /** @type {{ serialize: (opts: object) => Uint8Array } } */ (tx).serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
      serializedBytes = bytes.length;
    } catch {
      serializedBytes = 0;
    }
  }

  const instructions = Array.isArray(record.instructions) ? record.instructions : [];
  const programIds = instructions.map((ix) => {
    const pid = ix?.programId;
    if (pid && typeof pid === "object" && typeof pid.toBase58 === "function") {
      return pid.toBase58();
    }
    return String(pid || "");
  });

  return {
    instructionCount: instructions.length,
    programIds: programIds.filter(Boolean),
    serializedBytes,
  };
}
