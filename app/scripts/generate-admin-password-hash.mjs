import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

function readHiddenPassword() {
  if (!process.stdin.isTTY) throw new Error("Run this script in an interactive terminal");
  return new Promise((resolve, reject) => {
    let value = "";
    process.stdout.write("Administrator password (minimum 12 characters): ");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      resolve(value);
    };
    process.stdin.on("data", chunk => {
      const key = chunk.toString("utf8");
      if (key === "\u0003") {
        process.stdin.setRawMode(false);
        reject(new Error("Password entry cancelled"));
      } else if (key === "\r" || key === "\n") {
        finish();
      } else if (key === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += key;
      }
    });
  });
}

const password = await readHiddenPassword();
if (password.length < 12) {
  console.error("The password must be at least 12 characters long.");
  process.exit(1);
}
const salt = randomBytes(16).toString("base64url");
const derived = await scrypt(password, salt, 64);
console.log(`ADMIN_PASSWORD_HASH=scrypt$${salt}$${Buffer.from(derived).toString("base64url")}`);
