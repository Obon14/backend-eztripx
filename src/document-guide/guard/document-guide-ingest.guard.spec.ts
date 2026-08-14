import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentGuideIngestGuard } from "./document-guide-ingest.guard";

function mockContext(headers: Record<string, string | undefined>) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) => headers[name.toLowerCase()],
      }),
    }),
  } as never;
}

describe("DocumentGuideIngestGuard", () => {
  it("rejects when ingest key is not configured", () => {
    const guard = new DocumentGuideIngestGuard({
      get: () => "",
    } as unknown as ConfigService);

    expect(() => guard.canActivate(mockContext({ "x-api-key": "anything" }))).toThrow(
      UnauthorizedException,
    );
  });

  it("rejects missing or wrong key", () => {
    const guard = new DocumentGuideIngestGuard({
      get: () => "secret-key",
    } as unknown as ConfigService);

    expect(() => guard.canActivate(mockContext({}))).toThrow(UnauthorizedException);
    expect(() =>
      guard.canActivate(mockContext({ "x-api-key": "wrong" })),
    ).toThrow(UnauthorizedException);
  });

  it("allows matching key", () => {
    const guard = new DocumentGuideIngestGuard({
      get: () => "secret-key",
    } as unknown as ConfigService);

    expect(guard.canActivate(mockContext({ "x-api-key": "secret-key" }))).toBe(
      true,
    );
  });
});
