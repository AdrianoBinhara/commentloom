export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const OAUTH_STATE_COOKIE = "__Host-commentloom-oauth-state";
export const encodeOAuthState = (value: { redirectUri: string; nonce: string }) => btoa(JSON.stringify(value));
export const decodeOAuthState = (state: string) => JSON.parse(Buffer.from(state, "base64url").toString()) as { redirectUri: string; nonce: string };
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
