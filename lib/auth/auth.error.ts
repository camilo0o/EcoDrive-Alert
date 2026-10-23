export class AuthError extends Error {
  constructor(
    public readonly code: "EMAIL_TAKEN",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}