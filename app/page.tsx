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

const STORAGE_KEY = "tapmo:fomo-evm-address";

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
  const [linkedFomoAddress, setLinkedFomoAddress] = useState("");
  const [addressDraft, setAddressDraft] = useState("");
  const [addressError, setAddressError] = useState("");
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) || "";
    if (isEvmAddress(saved)) {
      setLinkedFomoAddress(saved);
      setAddressDraft(saved);
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
          throw new Error("Could not load onchain balances.");
        }

        const data = (await response.json()) as Portfolio;
        setPortfolio(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        setPortfolioError(
          error instanceof Error ? error.message : "Could not load onchain balances."
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

  const liveBalance = portfolio?.totalUsd ?? 0;

  const cardNumber = connected
    ? "••••  ••••  ••••  4827"
    : "••••  ••••  ••••  ••••";

  const chainStatus = useMemo(() => {
    if (!portfolio) return "";
    const working = portfolio.chains
      .filter((chain) => chain.ok)
      .map((chain) => chain.name);
    return working.length ? working.join(" + ") : "Explorer unavailable";
  }, [portfolio]);

  function linkFomoAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = addressDraft.trim();

    if (!isEvmAddress(normalized)) {
      setAddressError("Enter a valid 0x EVM address.");
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, normalized);
    setLinkedFomoAddress(normalized);
    setAddressDraft(normalized);
    setAddressError("");
  }

  function clearFomoAddress() {
    window.localStorage.removeItem(STORAGE_KEY);
    setLinkedFomoAddress("");
    setAddressDraft("");
    setAddressError("");
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
          Authenticate with Privy, link the EVM address shown inside Fomo, and
          preview the Tapmo card experience.
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
          <div className="fomoLinkPanel">
            <div className="fomoLinkHeader">
              <div>
                <span className="label">FOMO EVM ADDRESS</span>
                <strong>
                  {linkedFomoAddress
                    ? shortAddress(linkedFomoAddress)
                    : "Link the address shown in Fomo"}
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
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                aria-label="Fomo EVM address"
              />
              <button type="submit">
                {linkedFomoAddress ? "Update" : "Link address"}
              </button>
            </form>

            {addressError && <div className="addressError">{addressError}</div>}

            <div className="fomoLinkFooter">
              <span>
                This address is used only to read public onchain balances. It
                does not grant Tapmo spending authority.
              </span>
              {linkedFomoAddress && (
                <button type="button" onClick={clearFomoAddress}>
                  Use authenticated wallet instead
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="dashboard">
        <div className="leftColumn">
          <div className="balancePanel">
            <div>
              <span className="label">
                {linkedFomoAddress ? "FOMO EVM ONCHAIN VALUE" : "LIVE ONCHAIN VALUE"}
              </span>
              <div className="balance">
                {!connected
                  ? "$—"
                  : portfolioLoading
                    ? "Loading…"
                    : portfolioError
                      ? "$—"
                      : money(liveBalance)}
              </div>
              {connected && (
                <div className="balanceMeta">
                  {portfolioError
                    ? portfolioError
                    : portfolioLoading
                      ? "Reading Base + Robinhood Chain…"
                      : `${portfolio?.pricedAssetCount ?? 0} priced assets · ${chainStatus}`}
                </div>
              )}
            </div>
            <div className="status">
              <span className={portfolioError ? "dot dotError" : "dot"} />
              {!connected
                ? "Connect wallet"
                : portfolioLoading
                  ? "Syncing"
                  : portfolioError
                    ? "Data unavailable"
                    : linkedFomoAddress
                      ? "Fomo address"
                      : "Auth wallet"}
            </div>
          </div>

          {connected && !portfolioLoading && !portfolioError && portfolio && (
            <div className="portfolioBreakdown">
              <div className="portfolioHeader">
                <span className="label">TOP HOLDINGS</span>
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
                        <span>
                          {asset.chain} · {tokenAmount(asset.amount)}
                        </span>
                      </div>
                      <div className="assetValue">{money(asset.usdValue)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="noAssets">
                  No priced ERC-20 or native balances found on Base or Robinhood Chain.
                </div>
              )}

              {(portfolio.unpricedAssets > 0 ||
                portfolio.chains.some((chain) => !chain.ok)) && (
                <div className="portfolioNote">
                  {portfolio.unpricedAssets > 0
                    ? `${portfolio.unpricedAssets} additional asset${portfolio.unpricedAssets === 1 ? "" : "s"} had no USD price and were excluded. `
                    : ""}
                  {portfolio.chains.some((chain) => !chain.ok)
                    ? "At least one network explorer did not respond, so this may be a partial total."
                    : ""}
                </div>
              )}
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
                <span>FOMO WALLET</span>
                <strong>
                  {connected
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
                    This demo tap does not move or subtract from your real wallet balance.
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
            Link the public EVM address shown in Fomo so Tapmo can read its
            supported onchain holdings.
          </p>
        </div>
        <div>
          <span className="step">03</span>
          <h3>Tap</h3>
          <p>
            The payment card remains sandboxed until regulated off-ramp and card
            issuance integrations are connected.
          </p>
        </div>
      </section>

      <footer>
        <span>Tapmo · Beta</span>
        <span>
          Wallet authentication + supported onchain balances are live. Card activity is simulated.
        </span>
      </footer>
    </main>
  );
}
