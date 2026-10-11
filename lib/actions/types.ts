export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
  /** Optional redirect path the client should navigate to after success. */
  redirectTo?: string;
}

export interface DuplicateClient {
  id: string;
  name: string;
  email: string | null;
}
