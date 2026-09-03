"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ImagePlus,
  LoaderCircle,
  Shield,
  Sparkles,
  Swords,
  Upload,
} from "lucide-react";
import { parseEventLogs } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { localChain } from "@/lib/chain";
import {
  CONTRACTS_CONFIGURED,
  NFT_ADDRESS,
  cardsAbi,
} from "@/lib/contracts";
import { readableWalletError } from "@/lib/errors";
import { uploadToLocalIpfs } from "@/lib/ipfs";
import { buildCardMetadata, validateMintInput } from "@/lib/metadata";
import {
  ELEMENTS,
  RARITIES,
  type Element,
  type MintCardInput,
  type Rarity,
} from "@/lib/types";

type MintStage =
  | "idle"
  | "image"
  | "metadata"
  | "wallet"
  | "confirming"
  | "complete"
  | "error";

const stages: Array<{ key: MintStage; label: string }> = [
  { key: "image", label: "Artwork to IPFS" },
  { key: "metadata", label: "Metadata to IPFS" },
  { key: "wallet", label: "Wallet signature" },
  { key: "confirming", label: "Chain confirmation" },
];

const initialInput: MintCardInput = {
  name: "",
  description: "",
  rarity: "Rare",
  element: "Astral",
  attack: 50,
  defense: 50,
};

export function MintCardForm() {
  const { isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const fileInput = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState<MintCardInput>(initialInput);
  const [file, setFile] = useState<File>();
  const [stage, setStage] = useState<MintStage>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [mintedTokenId, setMintedTokenId] = useState<bigint>();
  const [errors, setErrors] = useState<ReturnType<typeof validateMintInput>>({});

  const activeStage = stages.findIndex((item) => item.key === stage);
  const busy = !["idle", "error", "complete"].includes(stage);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const previewDescription = useMemo(
    () => input.description.trim() || "Your card lore will appear here.",
    [input.description],
  );

  function update<K extends keyof MintCardInput>(key: K, value: MintCardInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateMintInput(input, file);
    setErrors(validationErrors);
    setErrorMessage("");
    setMintedTokenId(undefined);

    if (Object.keys(validationErrors).length) return;
    if (!CONTRACTS_CONFIGURED) {
      setStage("error");
      setErrorMessage("Deploy the contracts and configure their addresses before minting.");
      return;
    }
    if (!isConnected) {
      setStage("error");
      setErrorMessage("Connect a browser wallet before minting your card.");
      return;
    }
    if (chainId !== localChain.id) {
      setStage("error");
      setErrorMessage("Switch your wallet to Mythic Localhost before minting.");
      return;
    }

    try {
      setStage("image");
      const imageCid = await uploadToLocalIpfs(file!);

      setStage("metadata");
      const metadata = buildCardMetadata(input, imageCid);
      const metadataFile = new File([JSON.stringify(metadata)], "metadata.json", {
        type: "application/json",
      });
      const metadataCid = await uploadToLocalIpfs(metadataFile);

      setStage("wallet");
      const hash = await writeContractAsync({
        address: NFT_ADDRESS,
        abi: cardsAbi,
        functionName: "mintCard",
        args: [`ipfs://${metadataCid}`],
      });

      setStage("confirming");
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      const events = parseEventLogs({
        abi: cardsAbi,
        logs: receipt.logs,
        eventName: "CardMinted",
        strict: false,
      });
      const tokenId = events[0]?.args.tokenId;
      setMintedTokenId(tokenId);
      setStage("complete");
    } catch (mintError) {
      setStage("error");
      setErrorMessage(readableWalletError(mintError));
    }
  }

  return (
    <section className="mint-layout section-shell">
      <div className="mint-form-column">
        <div className="page-heading">
          <span className="eyebrow">
            <Sparkles size={14} /> The astral forge
          </span>
          <h1>Mint a singular arcana.</h1>
          <p>
            Your image and lore are saved to the local IPFS block store first. Your
            wallet then creates one unique ERC-721 token on the local chain.
          </p>
        </div>

        <form className="mint-form" onSubmit={submit} noValidate>
          <fieldset disabled={busy}>
            <legend>Card artwork</legend>
            <button
              type="button"
              className={errors.image ? "upload-dropzone has-error" : "upload-dropzone"}
              onClick={() => fileInput.current?.click()}
            >
              <span className="upload-icon">
                <Upload size={22} />
              </span>
              <span>
                <strong>{file ? file.name : "Choose your card artwork"}</strong>
                <small>
                  {file
                    ? `${(file.size / 1024 / 1024).toFixed(2)} MB selected`
                    : "JPG, PNG, or WebP · up to 10 MB"}
                </small>
              </span>
            </button>
            <input
              ref={fileInput}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                setFile(event.target.files?.[0]);
                setErrors((current) => ({ ...current, image: undefined }));
              }}
            />
            {errors.image ? <span className="form-error">{errors.image}</span> : null}
          </fieldset>

          <fieldset disabled={busy}>
            <legend>Identity & lore</legend>
            <label className="form-field">
              <span>Card name</span>
              <input
                value={input.name}
                maxLength={50}
                placeholder="e.g. The Astral Keeper"
                onChange={(event) => update("name", event.target.value)}
              />
              <small>{input.name.length}/50</small>
              {errors.name ? <em className="form-error">{errors.name}</em> : null}
            </label>
            <label className="form-field">
              <span>Description</span>
              <textarea
                value={input.description}
                maxLength={500}
                rows={5}
                placeholder="Tell the legend carried by this card…"
                onChange={(event) => update("description", event.target.value)}
              />
              <small>{input.description.length}/500</small>
              {errors.description ? (
                <em className="form-error">{errors.description}</em>
              ) : null}
            </label>
          </fieldset>

          <fieldset disabled={busy}>
            <legend>Arcana attributes</legend>
            <div className="form-grid-two">
              <label className="form-field">
                <span>Rarity</span>
                <select
                  value={input.rarity}
                  onChange={(event) => update("rarity", event.target.value as Rarity)}
                >
                  {RARITIES.map((rarity) => (
                    <option key={rarity}>{rarity}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Element</span>
                <select
                  value={input.element}
                  onChange={(event) => update("element", event.target.value as Element)}
                >
                  {ELEMENTS.map((element) => (
                    <option key={element}>{element}</option>
                  ))}
                </select>
              </label>
              <label className="form-field stat-input">
                <span>
                  <Swords size={15} /> Attack
                </span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={input.attack}
                  onChange={(event) => update("attack", Number(event.target.value))}
                />
                {errors.attack ? <em className="form-error">{errors.attack}</em> : null}
              </label>
              <label className="form-field stat-input">
                <span>
                  <Shield size={15} /> Defense
                </span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={input.defense}
                  onChange={(event) => update("defense", Number(event.target.value))}
                />
                {errors.defense ? (
                  <em className="form-error">{errors.defense}</em>
                ) : null}
              </label>
            </div>
          </fieldset>

          {stage !== "idle" ? (
            <div className={`mint-progress progress-${stage}`} aria-live="polite">
              <div className="progress-steps">
                {stages.map((item, index) => (
                  <span
                    key={item.key}
                    className={
                      stage === "complete" || index < activeStage
                        ? "is-complete"
                        : index === activeStage
                          ? "is-active"
                          : undefined
                    }
                  >
                    <i>
                      {stage === "complete" || index < activeStage ? (
                        <Check size={13} />
                      ) : index === activeStage ? (
                        <LoaderCircle className="spin" size={13} />
                      ) : (
                        index + 1
                      )}
                    </i>
                    {item.label}
                  </span>
                ))}
              </div>
              {stage === "error" ? <p className="form-error">{errorMessage}</p> : null}
              {stage === "complete" ? (
                <div className="mint-success">
                  <Check size={20} />
                  <span>
                    <strong>Card minted successfully</strong>
                    <small>
                      {mintedTokenId ? `Token #${mintedTokenId}` : "Ownership confirmed"}
                    </small>
                  </span>
                  <Link href="/collection">
                    View collection <ArrowRight size={15} />
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          <button className="button button-gold mint-submit" type="submit" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}
            {busy ? "Forging your card…" : "Upload & mint card"}
          </button>
          <p className="form-footnote">
            Minting is fee-free; local test ETH pays the simulated gas.
          </p>
        </form>
      </div>

      <aside className="mint-preview-column">
        <div className="preview-sticky">
          <span className="preview-label">Live card preview</span>
          <article className={`mint-preview-card rarity-${input.rarity.toLowerCase()}`}>
            <div className="mint-preview-art">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Selected card preview" />
              ) : (
                <div>
                  <ImagePlus size={38} />
                  <span>Your artwork</span>
                </div>
              )}
              <span className="rarity-pill">
                <Sparkles size={12} /> {input.rarity}
              </span>
            </div>
            <div className="mint-preview-body">
              <span className="card-element">{input.element} arcana</span>
              <h2>{input.name.trim() || "Unnamed Arcana"}</h2>
              <p>{previewDescription}</p>
              <div className="card-stats">
                <span>
                  <Swords size={15} />
                  <small>Attack</small>
                  <strong>{input.attack || "—"}</strong>
                </span>
                <span>
                  <Shield size={15} />
                  <small>Defense</small>
                  <strong>{input.defense || "—"}</strong>
                </span>
              </div>
            </div>
          </article>
          <p className="preview-note">
            The token ID is assigned on-chain after your transaction confirms.
          </p>
        </div>
      </aside>
    </section>
  );
}
