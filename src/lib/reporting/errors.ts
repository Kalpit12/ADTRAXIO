export type ReportingErrorCode =
  | "not_found"
  | "forbidden"
  | "invalid_input"
  | "invalid_date_range"
  | "workspace_required"
  | "snapshot_required"
  | "already_archived"
  | "database_error";

export class ReportingError extends Error {
  code: ReportingErrorCode;
  status: number;

  constructor(code: ReportingErrorCode, message: string, status = 400) {
    super(message);
    this.name = "ReportingError";
    this.code = code;
    this.status = status;
  }
}
