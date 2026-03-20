"use client";

import { useState, useCallback, useEffect } from "react";
import {
  mintNft,
  getNft,
  getAllNfts,
  getUserNfts,
  transferNft,
  likeNft,
  getLikes,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────

interface NftData {
  id: string;
  name: string;
  description: string;
  image_url: string;
  creator: string;
  minted_at: string;
}

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  returns,
  color,
}: {
  name: string;
  params: string;
  returns?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
      {returns && (
        <span className="ml-auto text-white/15 text-[10px]">{returns}</span>
      )}
    </div>
  );
}

// ── NFT Card ─────────────────────────────────────────────────

function NftCard({
  nft,
  likes,
  onLike,
  isLiking,
  walletAddress,
  onTransfer,
}: {
  nft: NftData;
  likes: number;
  onLike: () => void;
  isLiking: boolean;
  walletAddress: string | null;
  onTransfer: (to: string) => void;
}) {
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="group relative rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.03] transition-all hover:border-white/[0.15] hover:shadow-[0_0_40px_rgba(124,108,240,0.1)]">
      {/* Image */}
      <div className="aspect-square overflow-hidden bg-gradient-to-br from-[#7c6cf0]/10 to-[#4fc3f7]/10">
        <img
          src={nft.image_url}
          alt={nft.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${nft.id}/400/400`;
          }}
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-white/90 truncate">{nft.name}</h3>
          <p className="text-xs text-white/40 line-clamp-2 mt-1">{nft.description}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-white/30">
            <UserIcon />
            <span className="font-mono">{truncate(nft.creator)}</span>
          </div>
          <Badge variant="info" className="text-[10px]">#{nft.id}</Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onLike}
            disabled={isLiking || !walletAddress}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-white/50 hover:text-[#f87171] hover:border-[#f87171]/20 hover:bg-[#f87171]/[0.05] transition-all disabled:opacity-50"
          >
            <HeartIcon />
            <span>{likes}</span>
          </button>

          {walletAddress && (
            <button
              onClick={() => setShowTransfer(!showTransfer)}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-white/50 hover:text-[#34d399] hover:border-[#34d399]/20 hover:bg-[#34d399]/[0.05] transition-all"
            >
              <SendIcon />
              Transfer
            </button>
          )}

          <a
            href={`https://testnet.stellar.expert/explorer/testnet/account/${nft.creator}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto rounded-lg border border-white/[0.06] bg-white/[0.02] p-1.5 text-white/30 hover:text-white/60 transition-all"
          >
            <ExternalIcon />
          </a>
        </div>

        {/* Transfer Input */}
        {showTransfer && (
          <div className="flex gap-2 pt-2 animate-fade-in-up">
            <input
              type="text"
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
              placeholder="G... receiver address"
              className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-white/70 placeholder:text-white/20 outline-none focus:border-[#34d399]/30"
            />
            <button
              onClick={() => {
                onTransfer(transferTo);
                setShowTransfer(false);
                setTransferTo("");
              }}
              disabled={!transferTo.trim()}
              className="rounded-lg bg-[#34d399]/20 border border-[#34d399]/20 px-3 py-2 text-xs text-[#34d399] hover:bg-[#34d399]/30 disabled:opacity-50 transition-all"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

type Tab = "gallery" | "mint" | "my-collection";

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("gallery");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Mint form
  const [mintName, setMintName] = useState("");
  const [mintDesc, setMintDesc] = useState("");
  const [mintUrl, setMintUrl] = useState("");
  const [isMinting, setIsMinting] = useState(false);

  // Gallery
  const [nfts, setNfts] = useState<NftData[]>([]);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [likingNft, setLikingNft] = useState<string | null>(null);

  // My Collection
  const [myNfts, setMyNfts] = useState<NftData[]>([]);
  const [isLoadingMyNfts, setIsLoadingMyNfts] = useState(false);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Load gallery
  const loadGallery = useCallback(async () => {
    setIsLoadingGallery(true);
    try {
      const ids = await getAllNfts() as bigint[];
      if (ids && ids.length > 0) {
        const nftDataPromises = ids.map(async (id) => {
          const nft = await getNft(Number(id)) as any;
          const likeCount = await getLikes(Number(id)) as bigint;
          return { nft, likes: Number(likeCount) };
        });
        const results = await Promise.all(nftDataPromises);
        setNfts(results.map((r) => r.nft));
        setLikes(
          results.reduce((acc, r) => {
            acc[String(r.nft.id)] = r.likes;
            return acc;
          }, {} as Record<string, number>)
        );
      } else {
        setNfts([]);
      }
    } catch (err: unknown) {
      console.error("Failed to load gallery:", err);
    } finally {
      setIsLoadingGallery(false);
    }
  }, []);

  // Load my NFTs
  const loadMyNfts = useCallback(async () => {
    if (!walletAddress) return;
    setIsLoadingMyNfts(true);
    try {
      const ids = await getUserNfts(walletAddress) as bigint[];
      if (ids && ids.length > 0) {
        const nftDataPromises = ids.map(async (id) => {
          return await getNft(Number(id)) as NftData;
        });
        const results = await Promise.all(nftDataPromises);
        setMyNfts(results);
      } else {
        setMyNfts([]);
      }
    } catch (err: unknown) {
      console.error("Failed to load my NFTs:", err);
    } finally {
      setIsLoadingMyNfts(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (activeTab === "gallery") {
      loadGallery();
    } else if (activeTab === "my-collection") {
      loadMyNfts();
    }
  }, [activeTab, loadGallery, loadMyNfts]);

  const handleMint = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!mintName.trim() || !mintDesc.trim() || !mintUrl.trim()) {
      return setError("Fill in all fields");
    }
    setError(null);
    setIsMinting(true);
    setTxStatus("Awaiting signature...");
    try {
      await mintNft(walletAddress, mintName.trim(), mintDesc.trim(), mintUrl.trim());
      setTxStatus("NFT minted on-chain!");
      setMintName("");
      setMintDesc("");
      setMintUrl("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsMinting(false);
    }
  }, [walletAddress, mintName, mintDesc, mintUrl]);

  const handleLike = useCallback(async (nftId: string) => {
    if (!walletAddress) return setError("Connect wallet first");
    setLikingNft(nftId);
    try {
      await likeNft(walletAddress, Number(nftId));
      setLikes((prev) => ({ ...prev, [nftId]: (prev[nftId] || 0) + 1 }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to like");
    } finally {
      setLikingNft(null);
    }
  }, [walletAddress]);

  const handleTransfer = useCallback(async (nftId: string, toAddress: string) => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!toAddress.trim()) return setError("Enter recipient address");
    setError(null);
    try {
      await transferNft(walletAddress, toAddress.trim(), Number(nftId));
      setTxStatus("NFT transferred!");
      loadMyNfts();
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    }
  }, [walletAddress, loadMyNfts]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "gallery", label: "Gallery", icon: <GridIcon />, color: "#7c6cf0" },
    { key: "mint", label: "Mint", icon: <ImageIcon />, color: "#34d399" },
    { key: "my-collection", label: "My Collection", icon: <UserIcon />, color: "#4fc3f7" },
  ];

  return (
    <div className="w-full max-w-5xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("on-chain") || txStatus.includes("transferred") || txStatus.includes("minted") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6cf0]/20 to-[#4fc3f7]/20 border border-white/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#7c6cf0]">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">NFT Gallery</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="info" className="text-[10px]">Soroban</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Gallery */}
            {activeTab === "gallery" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <MethodSignature name="get_all_nfts" params="()" returns="-> Vec<u64>" color="#7c6cf0" />
                  <button
                    onClick={loadGallery}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    Refresh
                  </button>
                </div>

                {isLoadingGallery ? (
                  <div className="flex items-center justify-center py-20">
                    <SpinnerIcon />
                    <span className="ml-2 text-sm text-white/40">Loading gallery...</span>
                  </div>
                ) : nfts.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-white/40">No NFTs in gallery yet.</p>
                    <p className="text-white/20 text-sm mt-2">Be the first to mint an NFT!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nfts.map((nft) => (
                      <NftCard
                        key={nft.id}
                        nft={nft}
                        likes={likes[nft.id] || 0}
                        onLike={() => handleLike(nft.id)}
                        isLiking={likingNft === nft.id}
                        walletAddress={walletAddress}
                        onTransfer={(to) => handleTransfer(nft.id, to)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mint */}
            {activeTab === "mint" && (
              <div className="space-y-5">
                <MethodSignature 
                  name="mint" 
                  params="(minter: Address, name: String, description: String, image_url: String)" 
                  returns="-> u64" 
                  color="#34d399" 
                />

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30 mb-2">NFT Name</label>
                    <input
                      type="text"
                      value={mintName}
                      onChange={(e) => setMintName(e.target.value)}
                      placeholder="e.g. Cosmic Art #1"
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none focus:border-[#34d399]/30 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30 mb-2">Description</label>
                    <textarea
                      value={mintDesc}
                      onChange={(e) => setMintDesc(e.target.value)}
                      placeholder="Describe your NFT..."
                      rows={3}
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none focus:border-[#34d399]/30 transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30 mb-2">Image URL</label>
                    <input
                      type="text"
                      value={mintUrl}
                      onChange={(e) => setMintUrl(e.target.value)}
                      placeholder="https://ipfs.io/ipfs/..."
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none focus:border-[#34d399]/30 transition-all"
                    />
                  </div>
                </div>

                {walletAddress ? (
                  <ShimmerButton onClick={handleMint} disabled={isMinting} shimmerColor="#34d399" className="w-full">
                    {isMinting ? <><SpinnerIcon /> Minting...</> : <><ImageIcon /> Mint NFT</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to mint NFTs
                  </button>
                )}
              </div>
            )}

            {/* My Collection */}
            {activeTab === "my-collection" && (
              <div className="space-y-5">
                <MethodSignature name="get_user_nfts" params="(user: Address)" returns="-> Vec<u64>" color="#4fc3f7" />

                {!walletAddress ? (
                  <div className="text-center py-20">
                    <p className="text-white/40">Connect your wallet to view your collection.</p>
                    <button
                      onClick={onConnect}
                      disabled={isConnecting}
                      className="mt-4 rounded-xl border border-dashed border-[#4fc3f7]/20 bg-[#4fc3f7]/[0.03] px-6 py-3 text-sm text-[#4fc3f7]/60 hover:border-[#4fc3f7]/30 hover:text-[#4fc3f7]/80 transition-all disabled:opacity-50"
                    >
                      Connect Wallet
                    </button>
                  </div>
                ) : isLoadingMyNfts ? (
                  <div className="flex items-center justify-center py-20">
                    <SpinnerIcon />
                    <span className="ml-2 text-sm text-white/40">Loading collection...</span>
                  </div>
                ) : myNfts.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-white/40">Your collection is empty.</p>
                    <p className="text-white/20 text-sm mt-2">Mint your first NFT to get started!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myNfts.map((nft) => (
                      <NftCard
                        key={nft.id}
                        nft={nft}
                        likes={likes[nft.id] || 0}
                        onLike={() => handleLike(nft.id)}
                        isLiking={likingNft === nft.id}
                        walletAddress={walletAddress}
                        onTransfer={(to) => handleTransfer(nft.id, to)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">NFT Gallery &middot; Soroban</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/15 font-mono">{nfts.length} total NFTs</span>
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}
