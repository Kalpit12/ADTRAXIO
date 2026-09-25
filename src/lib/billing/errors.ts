export class BillingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = "BillingError";
  }
}

export class EntitlementError extends Error {
  constructor(
    message: string,
    public readonly feature: string,
    public readonly status: number = 403
  ) {
    super(message);
    this.name = "EntitlementError";
  }
}
