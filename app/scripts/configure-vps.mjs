import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const target = resolve(process.cwd(), "deploy/runtime");

function ask(prompt, hidden = false) {
  if (!process.stdin.isTTY) throw new Error("Run this script in an interactive terminal on the VPS");
  return new Promise((resolveAnswer, reject) => {
    let answer = "";
    process.stdout.write(prompt);
    if (!hidden) {
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      process.stdin.once("data", value => resolveAnswer(value.trim()));
      return;
    }
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const onData = chunk => {
      const key = chunk.toString("utf8");
      if (key === "\u0003") {
        process.stdin.setRawMode(false);
        process.stdin.off("data", onData);
        reject(new Error("Configuration cancelled"));
      } else if (key === "\r" || key === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.off("data", onData);
        process.stdout.write("\n");
        resolveAnswer(answer);
      } else if (key === "\u007f") {
        answer = answer.slice(0, -1);
      } else {
        answer += key;
      }
    };
    process.stdin.on("data", onData);
  });
}

function runtimeValue(value) {
  if (/\r|\n/.test(value)) throw new Error("Configuration values cannot contain line breaks");
  return value;
}

async function required(prompt, hidden = false) {
  const value = await ask(prompt, hidden);
  if (!value) throw new Error("All requested values are required");
  return value;
}

async function environmentOrPrompt(key, prompt, hidden = false) {
  const value = process.env[key]?.trim();
  if (value) {
    console.log(`${key} found in the supplied local environment; reusing it without displaying the value.`);
    return value;
  }
  return required(prompt, hidden);
}

async function main() {
  if (existsSync(target)) {
    const replace = await ask(`${target} already exists. Replace it? [y/N] `);
    if (replace.toLowerCase() !== "y") throw new Error("Configuration was not changed");
  }

  const email = await required("Administrator email: ");
  const password = await required("Administrator password (minimum 12 characters, hidden): ", true);
  if (password.length < 12) throw new Error("Administrator password must be at least 12 characters long");
  const publicBaseUrl = await required("Public HTTPS URL (for example https://app.your-domain.example): ");
  if (!/^https:\/\/[^/]+/i.test(publicBaseUrl)) throw new Error("Public HTTPS URL must start with https://");
  const appId = await environmentOrPrompt("META_INSTAGRAM_APP_ID", "Meta Instagram App ID: ", true);
  const appSecret = await environmentOrPrompt("META_INSTAGRAM_APP_SECRET", "Meta Instagram App Secret (hidden): ", true);
  const verifyToken = await environmentOrPrompt("META_WEBHOOK_VERIFY_TOKEN", "Meta webhook Verify Token (hidden): ", true);
  const salt = randomBytes(16).toString("base64url");
  const passwordHash = `scrypt$${salt}$${Buffer.from(await scrypt(password, salt, 64)).toString("base64url")}`;
  const databasePassword = randomBytes(32).toString("base64url");
  const rootPassword = randomBytes(32).toString("base64url");
  const jwtSecret = randomBytes(48).toString("base64url");
  const runtime = [
    "NODE_ENV=production",
    "PORT=3000",
    `PUBLIC_BASE_URL=${runtimeValue(publicBaseUrl.replace(/\/$/, ""))}`,
    `ADMIN_EMAIL=${runtimeValue(email.trim().toLowerCase())}`,
    `ADMIN_PASSWORD_HASH=${runtimeValue(passwordHash)}`,
    `JWT_SECRET=${runtimeValue(jwtSecret)}`,
    "MYSQL_DATABASE=commentloom",
    "MYSQL_USER=commentloom",
    `MYSQL_PASSWORD=${runtimeValue(databasePassword)}`,
    `MYSQL_ROOT_PASSWORD=${runtimeValue(rootPassword)}`,
    `DATABASE_URL=${runtimeValue(`mysql://commentloom:${databasePassword}@commentloom-db:3306/commentloom`)}`,
    `META_INSTAGRAM_APP_ID=${runtimeValue(appId)}`,
    `META_INSTAGRAM_APP_SECRET=${runtimeValue(appSecret)}`,
    `META_WEBHOOK_VERIFY_TOKEN=${runtimeValue(verifyToken)}`,
    "META_GRAPH_API_VERSION=v25.0",
    "",
  ].join("\n");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, runtime, { mode: 0o600 });
  console.log(`Saved ${target} with restrictive permissions. Do not commit or share this file.`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Configuration failed");
  process.exit(1);
});
