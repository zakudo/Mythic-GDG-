import { BaseError, UserRejectedRequestError } from "viem";

export function readableWalletError(error: unknown) {
  if (error instanceof UserRejectedRequestError) {
    return "The wallet request was declined. Nothing was changed.";
  }
  if (error instanceof BaseError) {
    return error.shortMessage || "The transaction could not be completed.";
  }
  if (error instanceof Error) return error.message;
  return "Something unexpected interrupted the request.";
}
