export type UrlValidationResult =
  | {
      ok: true;
      url: string;
    }
  | {
      ok: false;
      error: string;
    };
