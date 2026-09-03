import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NetworkBanner } from "@/components/network-banner";

const accountState = vi.hoisted(() => ({
  chainId: 1,
  isConnected: true,
}));
const switchChain = vi.hoisted(() => vi.fn());

vi.mock("wagmi", () => ({
  useAccount: () => accountState,
  useSwitchChain: () => ({ switchChain, isPending: false }),
}));

describe("NetworkBanner", () => {
  beforeEach(() => {
    accountState.chainId = 1;
    accountState.isConnected = true;
    switchChain.mockClear();
  });

  it("renders a switch action for a connected wallet on the wrong network", () => {
    render(<NetworkBanner />);
    expect(screen.getByRole("alert")).toHaveTextContent("wrong network");
    screen.getByRole("button", { name: "Switch to Localhost" }).click();
    expect(switchChain).toHaveBeenCalledWith({ chainId: 31337 });
  });

  it("stays hidden when no wallet is connected", () => {
    accountState.isConnected = false;
    const { container } = render(<NetworkBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
