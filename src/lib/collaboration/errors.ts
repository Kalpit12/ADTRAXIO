export class CollaborationError extends Error {
  constructor(
    message: string,
    public readonly code: string = "collaboration_error",
    public readonly status: number = 400
  ) {
    super(message);
    this.name = "CollaborationError";
  }
}
