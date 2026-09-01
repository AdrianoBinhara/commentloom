import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const INSTAGRAM_OAUTH_URL = "https://www.instagram.com/oauth/authorize";
const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const GRAPH_URL = "https://graph.instagram.com";
const REQUIRED_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
];

type InstagramProfile = {
  user_id: string;
  username: string;
  account_type?: string;
};

type TokenResponse = { access_token: string; user_id?: string; expires_in?: number };

export type InstagramReel = {
  id: string;
  caption: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  timestamp: string | null;
};

export type InstagramCommentDetails = {
  commentText: string;
  commenterId: string | null;
  reelId: string | null;
  createdAt: Date | null;
};

function config() {
  const appId = process.env.META_INSTAGRAM_APP_ID;
  const appSecret = process.env.META_INSTAGRAM_APP_SECRET;
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!appId || !appSecret || !verifyToken) throw new Error("Meta integration is not configured");
  return { appId, appSecret, verifyToken };
}

function encryptionKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Server encryption key is unavailable");
  return createHash("sha256").update(`replyline:instagram-token:${secret}`).digest();
}

export function createOAuthState() {
  const plainState = randomBytes(32).toString("base64url");
  return { plainState, stateHash: hashState(plainState) };
}

export function hashState(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function encryptToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map(part => part.toString("base64url")).join(".");
}

export function decryptToken(value: string) {
  const [ivPart, tagPart, ciphertextPart] = value.split(".");
  if (!ivPart || !tagPart || !ciphertextPart) throw new Error("Stored token has an invalid format");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextPart, "base64url")), decipher.final()]).toString("utf8");
}

export function isValidMetaSignature(rawBody: Buffer, signatureHeader: string | undefined) {
  const secret = process.env.META_INSTAGRAM_APP_SECRET;
  if (!secret || !signatureHeader?.startsWith("sha256=")) return false;
  const received = signatureHeader.slice("sha256=".length);
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (received.length !== expected.length) return false;
  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function verifyWebhookToken(token: string | undefined) {
  try {
    const expected = config().verifyToken;
    const tokenBuffer = token ? Buffer.from(token) : null;
    const expectedBuffer = Buffer.from(expected);
    if (!tokenBuffer || tokenBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(tokenBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export function getAuthorizationUrl(redirectUri: string, state: string) {
  const { appId } = config();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: REQUIRED_SCOPES.join(","),
    state,
    enable_fb_login: "false",
    force_reauth: "true",
  });
  return `${INSTAGRAM_OAUTH_URL}?${params.toString()}`;
}

async function parseResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: { message?: string }; error_message?: string };
  if (!response.ok) {
    const message = payload.error?.message || payload.error_message || "Meta API request failed";
    throw new Error(message);
  }
  return payload;
}

export async function exchangeAuthorizationCode(code: string, redirectUri: string) {
  const { appId, appSecret } = config();
  const form = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const shortLived = await parseResponse<TokenResponse>(await fetch(INSTAGRAM_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form }));
  if (!shortLived.access_token) throw new Error("Meta did not return an access token");

  const extension = new URL(`${GRAPH_URL}/access_token`);
  extension.searchParams.set("grant_type", "ig_exchange_token");
  extension.searchParams.set("client_secret", appSecret);
  extension.searchParams.set("access_token", shortLived.access_token);
  const longLived = await parseResponse<TokenResponse>(await fetch(extension));
  if (!longLived.access_token) throw new Error("Meta did not return a long-lived access token");
  return longLived;
}

export async function getInstagramProfile(accessToken: string) {
  const endpoint = new URL(`${GRAPH_URL}/me`);
  endpoint.searchParams.set("fields", "user_id,username,account_type");
  endpoint.searchParams.set("access_token", accessToken);
  const profile = await parseResponse<InstagramProfile>(await fetch(endpoint));
  const rawAccountType = profile.account_type?.toUpperCase();
  const accountType = rawAccountType === "MEDIA_CREATOR" || rawAccountType === "CREATOR" ? "creator" : rawAccountType === "BUSINESS" ? "business" : null;
  if (!profile.user_id || !profile.username || !accountType) {
    throw new Error("Only eligible Instagram professional accounts can be connected");
  }
  return { instagramUserId: profile.user_id, username: profile.username, accountType } as const;
}

export async function listInstagramReels(input: { instagramUserId: string; encryptedAccessToken: string }) {
  const version = process.env.META_GRAPH_API_VERSION || "v25.0";
  const endpoint = new URL(`${GRAPH_URL}/${version}/${input.instagramUserId}/media`);
  endpoint.searchParams.set("fields", "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp");
  endpoint.searchParams.set("limit", "50");
  const token = decryptToken(input.encryptedAccessToken);
  const payload = await parseResponse<{ data?: Array<{
    id?: string;
    caption?: string;
    media_product_type?: string;
    media_url?: string;
    thumbnail_url?: string;
    permalink?: string;
    timestamp?: string;
  }> }>(await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } }));
  return (payload.data ?? [])
    .filter(media => media.id && media.media_product_type === "REELS")
    .map(media => ({ id: media.id!, caption: media.caption || null, permalink: media.permalink || null, thumbnailUrl: media.thumbnail_url || null, mediaUrl: media.media_url || null, timestamp: media.timestamp || null })) satisfies InstagramReel[];
}

export async function getInstagramCommentDetails(input: { commentId: string; encryptedAccessToken: string }) {
  const version = process.env.META_GRAPH_API_VERSION || "v25.0";
  const endpoint = new URL(`${GRAPH_URL}/${version}/${input.commentId}`);
  endpoint.searchParams.set("fields", "id,text,timestamp,from,media");
  const token = decryptToken(input.encryptedAccessToken);
  const payload = await parseResponse<{ text?: string; timestamp?: string; from?: { id?: string }; media?: { id?: string } }>(await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } }));
  const createdAt = payload.timestamp ? new Date(payload.timestamp) : null;
  return {
    commentText: payload.text || "",
    commenterId: payload.from?.id || null,
    reelId: payload.media?.id || null,
    createdAt: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null,
  } satisfies InstagramCommentDetails;
}

export async function subscribeAccountToComments(instagramUserId: string, accessToken: string) {
  const version = process.env.META_GRAPH_API_VERSION || "v25.0";
  const endpoint = `${GRAPH_URL}/${version}/${instagramUserId}/subscribed_apps`;
  await parseResponse(await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "subscribed_fields=comments" }));
}

export async function sendPrivateReply(input: {
  instagramUserId: string;
  encryptedAccessToken: string;
  commentId: string;
  message: string;
  quickReplies?: Array<{ title: string; payload: string }>;
}) {
  const version = process.env.META_GRAPH_API_VERSION || "v25.0";
  const endpoint = `${GRAPH_URL}/${version}/${input.instagramUserId}/messages`;
  const token = decryptToken(input.encryptedAccessToken);
  const message = input.quickReplies?.length
    ? { text: input.message, quick_replies: input.quickReplies.map(reply => ({ content_type: "text", title: reply.title, payload: reply.payload })) }
    : { text: input.message };
  return parseResponse<{ recipient_id: string; message_id: string }>(
    await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { comment_id: input.commentId }, message }),
    }),
  );
}

export async function sendDirectMessage(input: { instagramUserId: string; encryptedAccessToken: string; recipientId: string; message: string }) {
  const version = process.env.META_GRAPH_API_VERSION || "v25.0";
  const endpoint = `${GRAPH_URL}/${version}/${input.instagramUserId}/messages`;
  const token = decryptToken(input.encryptedAccessToken);
  return parseResponse<{ recipient_id: string; message_id: string }>(await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: input.recipientId }, message: { text: input.message } }),
  }));
}

export async function replyToInstagramComment(input: { commentId: string; encryptedAccessToken: string; message: string }) {
  const version = process.env.META_GRAPH_API_VERSION || "v25.0";
  const endpoint = `${GRAPH_URL}/${version}/${input.commentId}/replies`;
  const token = decryptToken(input.encryptedAccessToken);
  return parseResponse<{ id: string }>(await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: input.message }),
  }));
}
