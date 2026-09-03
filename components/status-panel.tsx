import type { ReactNode } from "react";
import { AlertCircle, Boxes, LoaderCircle, Settings2, Wallet } from "lucide-react";

type StatusKind = "empty" | "error" | "loading" | "config" | "wallet";

const icons: Record<StatusKind, ReactNode> = {
  empty: <Boxes size={28} />,
  error: <AlertCircle size={28} />,
  loading: <LoaderCircle className="spin" size={28} />,
  config: <Settings2 size={28} />,
  wallet: <Wallet size={28} />,
};

export function StatusPanel({
  kind,
  title,
  children,
  action,
}: {
  kind: StatusKind;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`status-panel status-${kind}`}>
      <span className="status-icon">{icons[kind]}</span>
      <h2>{title}</h2>
      <div className="status-copy">{children}</div>
      {action ? <div className="status-action">{action}</div> : null}
    </div>
  );
}
