export type UrlValidationResult =
  | {
      ok: true;
      url: string;
    }
  | {
      ok: false;
      error: string;
    };

export type ShortCodeValidationResult =
  | {
      ok: true;
      code: string;
    }
  | {
      ok: false;
      error: string;
    };
