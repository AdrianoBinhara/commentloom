import { describe, expect, it } from "vitest";
import { getPublicAppConfig, registerAppConfigRoute } from "./appConfig";

describe("public app configuration endpoint", () => {
  it("serves the configured CommentLoom title through the lightweight config route", () => {
    let registeredPath = "";
    let handler: ((req: unknown, res: { status: (code: number) => { json: (payload: unknown) => void } }) => void) | undefined;
    const app = {
      get: (path: string, callback: typeof handler) => { registeredPath = path; handler = callback; },
    };
    registerAppConfigRoute(app as never);
    let receivedStatus = 0;
    let receivedPayload: unknown;
    handler?.({}, { status: code => { receivedStatus = code; return { json: payload => { receivedPayload = payload; } }; } });

    expect(registeredPath).toBe("/api/app-config");
    expect(receivedStatus).toBe(200);
    expect(receivedPayload).toMatchObject({ appTitle: "CommentLoom", appLogo: "/manus-storage/commentloom-logo_9f622f4b.svg" });
    expect(getPublicAppConfig()).toMatchObject({ appTitle: "CommentLoom", appLogo: "/manus-storage/commentloom-logo_9f622f4b.svg" });
  });
});
