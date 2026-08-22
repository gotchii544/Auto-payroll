export interface LookupResult {
  input: string;
  defaultCountry: string | null;
  valid: boolean;
  possible: boolean;
  reason?: string;
  numberType: string | null;
  numberTypeLabel: string;
  country: string | null;
  countryName: string | null;
  countryCallingCode: string | null;
  formats: {
    e164: string | null;
    international: string | null;
    national: string | null;
    rfc3966: string | null;
  };
  location: string | null;
  carrier: string | null;
  timezones: string[];
  enrichment: Enrichment | null;
  providers: {
    numverify: boolean;
    twilio: boolean;
  };
}

export interface Enrichment {
  source: "twilio" | "numverify";
  lineType?: string | null;
  carrier?: string | null;
  callerName?: string | null;
  location?: string | null;
  raw?: Record<string, unknown>;
  error?: string;
}

export interface LookupError {
  error: string;
}
