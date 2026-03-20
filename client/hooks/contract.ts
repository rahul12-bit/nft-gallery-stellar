"use client";

import {
  Contract,
  Networks,
  TransactionBuilder,
  Keypair,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  getAddress,
  signTransaction,
  setAllowed,
  isAllowed,
  requestAccess,
} from "@stellar/freighter-api";

// ============================================================
// CONSTANTS — Update these for your contract
// ============================================================

/** Your deployed Soroban contract ID */
export const CONTRACT_ADDRESS =
  "CDJVMAX34YRCQ5JFC6SIOQOVSUY6XWEFYJOLF3SBCKU7CMI3IAP6HPWN";

/** Network passphrase (testnet by default) */
export const NETWORK_PASSPHRASE = Networks.TESTNET;

/** Soroban RPC URL */
export const RPC_URL = "https://soroban-testnet.stellar.org";

/** Horizon URL */
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

/** Network name for Freighter */
export const NETWORK = "TESTNET";

// ============================================================
// RPC Server Instance
// ============================================================

const server = new rpc.Server(RPC_URL);

// ============================================================
// Wallet Helpers
// ============================================================

export async function checkConnection(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const connResult = await isConnected();
  if (!connResult.isConnected) {
    throw new Error("Freighter extension is not installed or not available.");
  }

  const allowedResult = await isAllowed();
  if (!allowedResult.isAllowed) {
    await setAllowed();
    await requestAccess();
  }

  const { address } = await getAddress();
  if (!address) {
    throw new Error("Could not retrieve wallet address from Freighter.");
  }
  return address;
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const connResult = await isConnected();
    if (!connResult.isConnected) return null;

    const allowedResult = await isAllowed();
    if (!allowedResult.isAllowed) return null;

    const { address } = await getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// ============================================================
// Contract Interaction Helpers
// ============================================================

/**
 * Build, simulate, and optionally sign + submit a Soroban contract call.
 */
export async function callContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller: string,
  sign: boolean = true
) {
  const contract = new Contract(CONTRACT_ADDRESS);
  const account = await server.getAccount(caller);

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed: ${(simulated as rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  if (!sign) {
    return simulated;
  }

  const prepared = rpc.assembleTransaction(tx, simulated).build();

  const { signedTxXdr } = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const txToSubmit = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE
  );

  const result = await server.sendTransaction(txToSubmit);

  if (result.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${result.status}`);
  }

  let getResult = await server.getTransaction(result.hash);
  while (getResult.status === "NOT_FOUND") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResult = await server.getTransaction(result.hash);
  }

  if (getResult.status === "FAILED") {
    throw new Error("Transaction failed on chain.");
  }

  return getResult;
}

/**
 * Read-only contract call (does not require signing).
 */
export async function readContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller?: string
) {
  const account =
    caller || Keypair.random().publicKey();
  const sim = await callContract(method, params, account, false);
  if (
    rpc.Api.isSimulationSuccess(sim as rpc.Api.SimulateTransactionResponse) &&
    (sim as rpc.Api.SimulateTransactionSuccessResponse).result
  ) {
    return scValToNative(
      (sim as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
    );
  }
  return null;
}

// ============================================================
// ScVal Conversion Helpers
// ============================================================

export function toScValString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

export function toScValU32(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

export function toScValU64(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "u64" });
}

export function toScValI128(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

export function toScValAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

export function toScValBool(value: boolean): xdr.ScVal {
  return nativeToScVal(value, { type: "bool" });
}

// ============================================================
// NFT Gallery — Contract Methods
// ============================================================

/**
 * Mint a new NFT — anyone can call
 * Calls: mint(minter: Address, name: String, description: String, image_url: String) -> u64
 */
export async function mintNft(
  caller: string,
  name: string,
  description: string,
  imageUrl: string
) {
  return callContract(
    "mint",
    [
      toScValAddress(caller),
      toScValString(name),
      toScValString(description),
      toScValString(imageUrl),
    ],
    caller,
    true
  );
}

/**
 * Get NFT details (read-only)
 * Calls: get_nft(nft_id: u64) -> NftData
 */
export async function getNft(nftId: number, caller?: string) {
  return readContract("get_nft", [toScValU64(BigInt(nftId))], caller);
}

/**
 * Get all NFT IDs (read-only)
 * Calls: get_all_nfts() -> Vec<u64>
 */
export async function getAllNfts(caller?: string) {
  return readContract("get_all_nfts", [], caller);
}

/**
 * Get total NFT count (read-only)
 * Calls: get_nft_count() -> u64
 */
export async function getNftCount(caller?: string) {
  return readContract("get_nft_count", [], caller);
}

/**
 * Get owner of an NFT (read-only)
 * Calls: get_owner(nft_id: u64) -> Address
 */
export async function getNftOwner(nftId: number, caller?: string) {
  return readContract("get_owner", [toScValU64(BigInt(nftId))], caller);
}

/**
 * Transfer NFT to another address
 * Calls: transfer(from: Address, to: Address, nft_id: u64)
 */
export async function transferNft(
  caller: string,
  toAddress: string,
  nftId: number
) {
  return callContract(
    "transfer",
    [
      toScValAddress(caller),
      toScValAddress(toAddress),
      toScValU64(BigInt(nftId)),
    ],
    caller,
    true
  );
}

/**
 * Get NFTs owned by a user (read-only)
 * Calls: get_user_nfts(user: Address) -> Vec<u64>
 */
export async function getUserNfts(userAddress: string, caller?: string) {
  return readContract("get_user_nfts", [toScValAddress(userAddress)], caller);
}

/**
 * Like an NFT — anyone can call (permissionless)
 * Calls: like(nft_id: u64)
 */
export async function likeNft(caller: string, nftId: number) {
  return callContract(
    "like",
    [toScValU64(BigInt(nftId))],
    caller,
    true
  );
}

/**
 * Get like count for an NFT (read-only)
 * Calls: get_likes(nft_id: u64) -> u64
 */
export async function getLikes(nftId: number, caller?: string) {
  return readContract("get_likes", [toScValU64(BigInt(nftId))], caller);
}

export { nativeToScVal, scValToNative, Address, xdr };
