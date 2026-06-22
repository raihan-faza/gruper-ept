import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import { status } from "@grpc/grpc-js";
import type { ServerUnaryCall, sendUnaryData } from "@grpc/grpc-js";
import type {
  GenerateReportRequest,
  GenerateReportResponse,
} from "../../pb/report.js";

// ---------------------------------------------------------------------------
// Mock the usecase module so the handler is tested in complete isolation.
// jest.unstable_mockModule must be called before any dynamic import().
// ---------------------------------------------------------------------------

const mockGenerateReport = jest.fn<() => Promise<GenerateReportResponse>>();

jest.unstable_mockModule("../../src/application/usecases/report.js", () => ({
  ReportUsecase: jest.fn().mockImplementation(() => ({
    generateReport: mockGenerateReport,
  })),
}));

// Dynamically import AFTER registering the mock — ESM requirement
const { ReportHandler } = await import(
  "../../src/application/handler/report_handler.js"
);
const { ReportUsecase } = await import(
  "../../src/application/usecases/report.js"
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_TOKEN = "super-secret-token";

const makeCall = (
  token: string | undefined,
  request: Partial<GenerateReportRequest> = {},
) => ({
  request: {
    userId: "user-123",
    walletId: "wallet-abc",
    dateStart: "2026-05-01",
    dateEnd: "2026-05-31",
    templateName: "template.xlsx",
    ...request,
  },
  metadata: {
    get: (key: string) =>
      key === "access_token" && token !== undefined ? [token] : [],
  },
});

// ---------------------------------------------------------------------------
// ReportHandler.generateReport
// ---------------------------------------------------------------------------

describe("ReportHandler.generateReport", () => {
  let handler: InstanceType<typeof ReportHandler>;

  beforeEach(() => {
    process.env.WALLET_SERVICE_TOKEN = VALID_TOKEN;
    // ReportUsecase constructor is mocked; the handler receives the mocked instance
    const usecase = new ReportUsecase({} as any);
    handler = new ReportHandler(usecase as any);
  });

  afterEach(() => { jest.clearAllMocks(); });

  test.each([
    {
      name: "calls callback with the usecase response on success",
      mockSetup: () => {
        mockGenerateReport.mockResolvedValueOnce({
          downloadUrl: "https://example.com/report.xlsx",
          filename: "expense-report-2026-05-01-2026-05-31.xlsx",
          expiresAt: "2026-05-01T01:00:00.000Z",
        });
      },
      input: makeCall(VALID_TOKEN),
      expected: async (callbackSpy: ReturnType<typeof jest.fn>) => {
        await new Promise((r) => setTimeout(r, 10));
        expect(callbackSpy).toHaveBeenCalledTimes(1);
        const [err, resp] = callbackSpy.mock.calls[0] as [
          null,
          GenerateReportResponse,
        ];
        expect(err).toBeNull();
        expect(resp.downloadUrl).toBe("https://example.com/report.xlsx");
        expect(resp.filename).toBe(
          "expense-report-2026-05-01-2026-05-31.xlsx",
        );
      },
    },
    {
      name: "returns UNAUTHENTICATED error when access_token is missing",
      mockSetup: () => {
        // generateReport must NOT be called
      },
      input: makeCall(undefined),
      expected: async (callbackSpy: ReturnType<typeof jest.fn>) => {
        await new Promise((r) => setTimeout(r, 10));
        expect(callbackSpy).toHaveBeenCalledTimes(1);
        const [err, resp] = callbackSpy.mock.calls[0] as [
          { code: number; message: string },
          null,
        ];
        expect(err).toMatchObject({
          code: status.UNAUTHENTICATED,
          message: "invalid token",
        });
        expect(resp).toBeNull();
      },
    },
    {
      name: "returns UNAUTHENTICATED error when access_token is wrong",
      mockSetup: () => {},
      input: makeCall("wrong-token"),
      expected: async (callbackSpy: ReturnType<typeof jest.fn>) => {
        await new Promise((r) => setTimeout(r, 10));
        const [err] = callbackSpy.mock.calls[0] as [{ code: number }];
        expect(err).toMatchObject({ code: status.UNAUTHENTICATED });
      },
    },
    {
      name: "does not call generateReport when token is invalid",
      mockSetup: () => {},
      input: makeCall("bad-token"),
      expected: async (_callbackSpy: ReturnType<typeof jest.fn>) => {
        await new Promise((r) => setTimeout(r, 10));
        expect(mockGenerateReport).not.toHaveBeenCalled();
      },
    },
    {
      name: "forwards usecase errors to the gRPC callback",
      mockSetup: () => {
        mockGenerateReport.mockRejectedValueOnce(new Error("S3 failure"));
      },
      input: makeCall(VALID_TOKEN),
      expected: async (callbackSpy: ReturnType<typeof jest.fn>) => {
        await new Promise((r) => setTimeout(r, 10));
        const [err, resp] = callbackSpy.mock.calls[0] as [Error, null];
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe("S3 failure");
        expect(resp).toBeNull();
      },
    },
  ])("$name", async ({ mockSetup, input, expected }) => {
    mockSetup();

    const callbackSpy = jest.fn();
    await handler.generateReport(
      input as unknown as ServerUnaryCall<
        GenerateReportRequest,
        GenerateReportResponse
      >,
      callbackSpy as unknown as sendUnaryData<GenerateReportResponse>,
    );

    await expected(callbackSpy);
  });
});
