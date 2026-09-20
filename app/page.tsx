"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

type Transaction = {
  merchant: string;
  detail: string;
  amount: number;
  status: "Completed" | "Pending";
};

type PortfolioAsset = {
  chain: string;
  symbol: string;
  name: string;
  address: string | null;
  amount: number;
  priceUsd: number;
  usdValue: number;
  native: boolean;
};

type ChainSummary = {
  name: string;
  slug: string;
  explorer: string;
  totalUsd: number;
  unpricedAssets: number;
  ok: boolean;
  error?: string;
  assetCount: number;
};

type Portfolio = {
  address: string;
  totalUsd: number;
  assets: PortfolioAsset[];
  chains: ChainSummary[];
  unpricedAssets: number;
  pricedAssetCount: number;
  source: string;
  scope: string[];
  updatedAt: string;
};

type SolanaAsset = {
  mint: string;
  symbol: string;
  name: string;
  amount: number;
  priceUsd: number;
  usdValue: number;
  cash: boolean;
  native: boolean;
};

type SolanaPortfolio = {
  address: string;
  totalUsd: number;
  cashUsd: number;
  usdcAmount: number;
  assets: SolanaAsset[];
  pricedAssetCount: number;
  unpricedAssets: number;
  updatedAt: string;
};

const EVM_STORAGE_KEY = "tapmo:fomo-evm-address";
const SOLANA_STORAGE_KEY = "tapmo:fomo-solana-address";

const demoTransactions: Transaction[] = [
  {
    merchant: "McDonald's",
    detail: "Today · Apple Pay",
    amount: 12.48,
    status: "Completed",
  },
  {
    merchant: "Uber",
    detail: "Yesterday · Tapmo Card",
    amount: 21.16,
    status: "Completed",
  },
  {
    merchant: "Coffee",
    detail: "Sep 18 · Apple Pay",
    amount: 6.75,
    status: "Completed",
  },
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function tokenAmount(value: number) {
  if (value >= 1000000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 1 ? 6 : 3,
  }).format(value);
}

function shortAddress(address?: string) {
  if (!address) return "";
  if (address.length < 11) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function isEvmAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function isSolanaAddress(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim());
}

export default function Home() {
  return <PrivyTapmo />;
}

function PrivyTapmo() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = wallets[0]?.address;

  const connected = ready && authenticated && Boolean(walletAddress);

  return (
    <TapmoDashboard
      connected={connected}
      authReady={ready}
      walletAddress={walletAddress}
      onConnect={login}
      onDisconnect={logout}
    />
  );
}

function TapmoDashboard({
  connected,
  authReady,
  walletAddress,
  onConnect,
  onDisconnect,
}: {
  connected: boolean;
  authReady: boolean;
  walletAddress?: string;
  onConnect: () => void;
  onDisconnect: () => Promise<void>;
}) {
  const [frozen, setFrozen] = useState(false);

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  const [solanaPortfolio, setSolanaPortfolio] =
    useState<SolanaPortfolio | null>(null);
  const [solanaLoading, setSolanaLoading] = useState(false);
  const [solanaError, setSolanaError] = useState<string | null>(null);

  const [linkedFomoAddress, setLinkedFomoAddress] = useState("");
  const [addressDraft, setAddressDraft] = useState("");
  const [addressError, setAddressError] = useState("");

  const [linkedSolanaAddress, setLinkedSolanaAddress] = useState("");
  const [solanaDraft, setSolanaDraft] = useState("");
  const [solanaAddressError, setSolanaAddressError] = useState("");

  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const savedEvm = window.localStorage.getItem(EVM_STORAGE_KEY) || "";
    if (isEvmAddress(savedEvm)) {
      setLinkedFomoAddress(savedEvm);
      setAddressDraft(savedEvm);
    }

    const savedSolana = window.localStorage.getItem(SOLANA_STORAGE_KEY) || "";
    if (isSolanaAddress(savedSolana)) {
      setLinkedSolanaAddress(savedSolana);
      setSolanaDraft(savedSolana);
    }

    setStorageReady(true);
  }, []);

  const portfolioAddress = linkedFomoAddress || walletAddress || "";

  useEffect(() => {
    if (!connected || !portfolioAddress || !storageReady) {
      setPortfolio(null);
      setPortfolioError(null);
      setPortfolioLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadPortfolio() {
      setPortfolioLoading(true);
      setPortfolioError(null);

      try {
        const response = await fetch(
          `/api/onchain/portfolio?address=${encodeURIComponent(portfolioAddress)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Could not load EVM balances.");
        }

        const data = (await response.json()) as Portfolio;
        setPortfolio(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        setPortfolioError(
          error instanceof Error ? error.message : "Could not load EVM balances."
        );
      } finally {
        if (!controller.signal.aborted) {
          setPortfolioLoading(false);
        }
      }
    }

    void loadPortfolio();
    return () => controller.abort();
  }, [connected, portfolioAddress, storageReady]);

  useEffect(() => {
    if (!connected || !linkedSolanaAddress || !storageReady) {
      setSolanaPortfolio(null);
      setSolanaError(null);
      setSolanaLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadSolanaPortfolio() {
      setSolanaLoading(true);
      setSolanaError(null);

      try {
        const response = await fetch(
          `/api/solana/portfolio?address=${encodeURIComponent(linkedSolanaAddress)}`,
          { signal: controller.signal }
        );

        const body = await response.json();

        if (!response.ok) {
          throw new Error(body?.error || "Could not load Solana balances.");
        }

        setSolanaPortfolio(body as SolanaPortfolio);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSolanaError(
          error instanceof Error
            ? error.message
            : "Could not load Solana balances."
        );
      } finally {
        if (!controller.signal.aborted) {
          setSolanaLoading(false);
        }
      }
    }

    void loadSolanaPortfolio();
    return () => controller.abort();
  }, [connected, linkedSolanaAddress, storageReady]);

  const evmValue = portfolio?.totalUsd ?? 0;
  const solanaValue = solanaPortfolio?.totalUsd ?? 0;
  const linkedValue = evmValue + solanaValue;
  const isLoading = portfolioLoading || solanaLoading;

  const cardNumber = connected
    ? "••••  ••••  ••••  4827"
    : "••••  ••••  ••••  ••••";

  const chainStatus = useMemo(() => {
    if (!portfolio) return "";
    const working = portfolio.chains
      .filter((chain) => chain.ok)
      .map((chain) => chain.name);
    return working.length ? working.join(" + ") : "EVM explorer unavailable";
  }, [portfolio]);

  function linkFomoAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = addressDraft.trim();

    if (!isEvmAddress(normalized)) {
      setAddressError("Enter a valid 0x EVM address.");
      return;
    }

    window.localStorage.setItem(EVM_STORAGE_KEY, normalized);
    setLinkedFomoAddress(normalized);
    setAddressDraft(normalized);
    setAddressError("");
  }

  function clearFomoAddress() {
    window.localStorage.removeItem(EVM_STORAGE_KEY);
    setLinkedFomoAddress("");
    setAddressDraft("");
    setAddressError("");
  }

  function linkSolanaAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = solanaDraft.trim();

    if (!isSolanaAddress(normalized)) {
      setSolanaAddressError("Enter a valid Solana public address.");
      return;
    }

    window.localStorage.setItem(SOLANA_STORAGE_KEY, normalized);
    setLinkedSolanaAddress(normalized);
    setSolanaDraft(normalized);
    setSolanaAddressError("");
  }

  function clearSolanaAddress() {
    window.localStorage.removeItem(SOLANA_STORAGE_KEY);
    setLinkedSolanaAddress("");
    setSolanaDraft("");
    setSolanaAddressError("");
  }

  return (
    <main>
      <nav className="nav">
        <div className="brand">
          <span className="brandMark">T</span>
          <span>tapmo</span>
        </div>
        <span className="beta">BETA</span>
      </nav>

      <section className="hero">
        <div className="eyebrow">FOMO → REAL WORLD</div>
        <h1>Tap your Fomo balance anywhere.</h1>
        <p className="subhead">
          Authenticate with Privy, link the EVM and Solana addresses behind your
          Fomo account, and preview the Tapmo card experience.
        </p>

        {!connected ? (
          <button
            className="primary"
            onClick={onConnect}
            disabled={!authReady}
          >
            {authReady ? "Connect wallet" : "Loading wallet login…"}
          </button>
        ) : (
          <div className="walletControls">
            <div className="connectedPill">
              <span className="dot" />
              Authenticated · {shortAddress(walletAddress)}
            </div>
            <button className="textButton" onClick={() => void onDisconnect()}>
              Disconnect
            </button>
          </div>
        )}

        {connected && storageReady && (
          <div className="walletLinkGrid">
            <div className="fomoLinkPanel">
              <div className="fomoLinkHeader">
                <div>
                  <span className="label">FOMO EVM ADDRESS</span>
                  <strong>
                    {linkedFomoAddress
                      ? shortAddress(linkedFomoAddress)
                      : "Link the EVM address shown in Fomo"}
                  </strong>
                </div>
                {linkedFomoAddress && (
                  <span className="linkedTag">LINKED · VIEW ONLY</span>
                )}
              </div>

              <form className="addressForm" onSubmit={linkFomoAddress}>
                <input
                  value={addressDraft}
                  onChange={(event) => setAddressDraft(event.target.value)}
                  placeholder="0x…"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Fomo EVM address"
                />
                <button type="submit">
                  {linkedFomoAddress ? "Update" : "Link address"}
                </button>
              </form>

              {addressError && (
                <div className="addressError">{addressError}</div>
              )}

              <div className="fomoLinkFooter">
                <span>
                  Reads public ERC-20/native balances only. No spending authority.
                </span>
                {linkedFomoAddress && (
                  <button type="button" onClick={clearFomoAddress}>
                    Use auth wallet instead
                  </button>
                )}
              </div>
            </div>

            <div className="fomoLinkPanel">
              <div className="fomoLinkHeader">
                <div>
                  <span className="label">FOMO SOLANA ADDRESS</span>
                  <strong>
                    {linkedSolanaAddress
                      ? shortAddress(linkedSolanaAddress)
                      : "Link the address visible in Jupiter"}
                  </strong>
                </div>
                {linkedSolanaAddress && (
                  <span className="linkedTag">LINKED · VIEW ONLY</span>
                )}
              </div>

              <form className="addressForm" onSubmit={linkSolanaAddress}>
                <input
                  value={solanaDraft}
                  onChange={(event) => setSolanaDraft(event.target.value)}
                  placeholder="Solana address…"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Fomo Solana address"
                />
                <button type="submit">
                  {linkedSolanaAddress ? "Update" : "Link address"}
                </button>
              </form>

              {solanaAddressError && (
                <div className="addressError">{solanaAddressError}</div>
              )}

              <div className="fomoLinkFooter">
                <span>
                  Reads public SOL/SPL balances. Native Solana USDC is labeled as cash.
                </span>
                {linkedSolanaAddress && (
                  <button type="button" onClick={clearSolanaAddress}>
                    Unlink Solana
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="dashboard">
        <div className="leftColumn">
          <div className="balancePanel">
            <div>
              <span className="label">LINKED FOMO ONCHAIN VALUE</span>
              <div className="balance">
                {!connected
                  ? "$—"
                  : isLoading
                    ? "Loading…"
                    : money(linkedValue)}
              </div>
              {connected && (
                <div className="balanceMeta">
                  EVM {money(evmValue)} · Solana {money(solanaValue)}
                  {solanaPortfolio
                    ? ` · Solana cash ${money(solanaPortfolio.cashUsd)}`
                    : ""}
                </div>
              )}
            </div>
            <div className="status">
              <span
                className={portfolioError && solanaError ? "dot dotError" : "dot"}
              />
              {!connected
                ? "Connect wallet"
                : isLoading
                  ? "Syncing"
                  : portfolioError || solanaError
                    ? "Partial data"
                    : "Live data"}
            </div>
          </div>

          {connected && linkedSolanaAddress && (
            <div className="portfolioBreakdown">
              <div className="portfolioHeader">
                <span className="label">SOLANA / JUPITER SIDE</span>
                <span className="liveTag">LIVE</span>
              </div>

              {solanaLoading ? (
                <div className="noAssets">Reading Solana balances…</div>
              ) : solanaError ? (
                <div className="portfolioNote">{solanaError}</div>
              ) : solanaPortfolio ? (
                <>
                  <div className="cashCallout">
                    <div>
                      <span>USDC CASH</span>
                      <strong>{money(solanaPortfolio.cashUsd)}</strong>
                    </div>
                    <small>{tokenAmount(solanaPortfolio.usdcAmount)} USDC</small>
                  </div>

                  {solanaPortfolio.assets.length ? (
                    <div className="assetList">
                      {solanaPortfolio.assets.slice(0, 5).map((asset) => (
                        <div className="assetRow" key={asset.mint}>
                          <div className="assetIcon">
                            {(asset.symbol || "?").slice(0, 1).toUpperCase()}
                          </div>
                          <div className="assetName">
                            <strong>
                              {asset.symbol}
                              {asset.cash ? " · CASH" : ""}
                            </strong>
                            <span>Solana · {tokenAmount(asset.amount)}</span>
                          </div>
                          <div className="assetValue">
                            {asset.priceUsd > 0 ? money(asset.usdValue) : "Unpriced"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="noAssets">
                      No SOL or SPL balances found at this address.
                    </div>
                  )}

                  {solanaPortfolio.unpricedAssets > 0 && (
                    <div className="portfolioNote">
                      {solanaPortfolio.unpricedAssets} Solana asset
                      {solanaPortfolio.unpricedAssets === 1 ? "" : "s"} could
                      not be priced and are excluded from the USD total.
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {connected && portfolio && (
            <div className="portfolioBreakdown">
              <div className="portfolioHeader">
                <span className="label">EVM SIDE</span>
                <span className="liveTag">LIVE</span>
              </div>

              {portfolio.assets.length ? (
                <div className="assetList">
                  {portfolio.assets.slice(0, 4).map((asset) => (
                    <div
                      className="assetRow"
                      key={`${asset.chain}-${asset.address ?? "native"}`}
                    >
                      <div className="assetIcon">
                        {(asset.symbol || "?").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="assetName">
                        <strong>{asset.symbol}</strong>
                        <span>{asset.chain} · {tokenAmount(asset.amount)}</span>
                      </div>
                      <div className="assetValue">{money(asset.usdValue)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="noAssets">
                  No priced ERC-20/native balances found on Base or Robinhood Chain.
                </div>
              )}

              <div className="portfolioNote">
                {portfolio.pricedAssetCount} priced EVM assets · {chainStatus}
                {portfolio.unpricedAssets > 0
                  ? ` · ${portfolio.unpricedAssets} unpriced`
                  : ""}
              </div>
            </div>
          )}

          <div className={"card " + (frozen ? "cardFrozen" : "")}>
            <div className="cardTop">
              <div className="cardLogo">tapmo</div>
              <span className="cardBadge">VIRTUAL · DEMO</span>
            </div>

            <div className="cardNumber">{cardNumber}</div>

            <div className="cardBottom">
              <div>
                <span>FOMO ACCOUNT</span>
                <strong>
                  {linkedSolanaAddress
                    ? "EVM + SOLANA"
                    : connected
                      ? shortAddress(linkedFomoAddress || walletAddress).toUpperCase()
                      : "—"}
                </strong>
              </div>
              <div>
                <span>STATUS</span>
                <strong>{connected ? "SANDBOX" : "—"}</strong>
              </div>
            </div>

            {frozen && <div className="freezeOverlay">CARD FROZEN</div>}
          </div>

          <div className="actions">
            <button className="darkButton" disabled={!connected}>
              Add to Apple Wallet
            </button>
            <button
              className="secondary"
              disabled={!connected}
              onClick={() => setFrozen((value) => !value)}
            >
              {frozen ? "Unfreeze card" : "Freeze card"}
            </button>
          </div>
        </div>

        <div className="activityPanel">
          <div className="panelHeader">
            <div>
              <span className="label">RECENT ACTIVITY</span>
              <h2>Transactions</h2>
            </div>
            <span className="demoTag">DEMO</span>
          </div>

          {!connected ? (
            <div className="emptyState">
              Authenticate your wallet to preview Tapmo activity.
            </div>
          ) : (
            <>
              <div className="transactions">
                {demoTransactions.map((tx) => (
                  <div className="transaction" key={tx.merchant + tx.detail}>
                    <div className="merchantIcon">{tx.merchant[0]}</div>
                    <div className="transactionText">
                      <strong>{tx.merchant}</strong>
                      <span>{tx.detail}</span>
                    </div>
                    <div className="amount">−{money(tx.amount)}</div>
                  </div>
                ))}
              </div>

              <div className="demoBox">
                <div>
                  <strong>Card rail is still simulated</strong>
                  <span>
                    Demo taps never move or subtract from linked wallet balances.
                  </span>
                </div>
                <button disabled={frozen}>Simulate tap</button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="how">
        <div>
          <span className="step">01</span>
          <h3>Authenticate</h3>
          <p>Privy authenticates the person using Tapmo.</p>
        </div>
        <div>
          <span className="step">02</span>
          <h3>Link Fomo</h3>
          <p>
            Tapmo reads the Fomo EVM and Solana addresses separately and
            combines their priced public holdings.
          </p>
        </div>
        <div>
          <span className="step">03</span>
          <h3>Tap</h3>
          <p>
            Card payments stay sandboxed until the authorized Fomo, Zero Hash,
            and card-issuer rails are connected.
          </p>
        </div>
      </section>

      <footer>
        <span>Tapmo · Beta</span>
        <span>
          Linked wallet balances are read-only. Card activity is simulated.
        </span>
      </footer>
    </main>
  );
}
