import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPanel } from "@/components/status-panel";

describe("StatusPanel", () => {
  it("renders loading and failure guidance accessibly", () => {
    const { rerender } = render(
      <StatusPanel kind="loading" title="Confirming transaction">
        <p>Waiting for Sepolia.</p>
      </StatusPanel>,
    );
    expect(screen.getByRole("heading", { name: "Confirming transaction" })).toBeVisible();

    rerender(
      <StatusPanel kind="error" title="Transaction failed">
        <p>The wallet request was rejected.</p>
      </StatusPanel>,
    );
    expect(screen.getByText("The wallet request was rejected.")).toBeVisible();
  });
});
