import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import type { GenerateReportRequest } from "../../pb/report.js";

// ---------------------------------------------------------------------------
// Mock external dependencies BEFORE any module that imports them.
// jest.unstable_mockModule is the ESM-safe API; it is hoisted automatically.
//
// Because report.ts instantiates S3Client at module scope, we expose the
// `send` mock via the module factory so tests can configure return values.
// ---------------------------------------------------------------------------

const mockSend = jest.fn<() => Promise<unknown>>();
const mockGetSignedUrl = jest.fn<() => Promise<string>>();

jest.unstable_mockModule("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  GetObjectCommand: jest.fn().mockImplementation((args: unknown) => args),
  PutObjectCommand: jest.fn().mockImplementation((args: unknown) => args),
}));

jest.unstable_mockModule("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

const mockSubstitute = jest.fn();
const mockXlsxGenerate = jest.fn<() => Buffer>().mockReturnValue(Buffer.from("xlsx"));

jest.unstable_mockModule("xlsx-template", () => ({
  default: jest.fn().mockImplementation(() => ({
    substitute: mockSubstitute,
    generate: mockXlsxGenerate,
  })),
}));

// Dynamic import — resolves AFTER mocks are registered
const mockExpenseClient = {
  getAllExpenses: jest.fn(),
  getAllExpensesCategory: jest.fn(),
};

const mockUserClient = {
  getUser: jest.fn(),
};

const { ReportUsecase } = await import(
  "../../src/application/usecases/report.js"
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeTemplateBody = () => ({
  Body: {
    transformToByteArray: jest
      .fn<() => Promise<Uint8Array>>()
      .mockResolvedValue(new Uint8Array([1, 2, 3])),
  },
});

const baseRequest = (
  overrides: Partial<GenerateReportRequest> = {},
): GenerateReportRequest => ({
  userId: "user-123",
  walletId: "wallet-abc",
  dateStart: "2026-05-01",
  dateEnd: "2026-05-31",
  templateName: "test_template.xlsx",
  ...overrides,
});

// ---------------------------------------------------------------------------
// ReportUsecase.generateReport
// ---------------------------------------------------------------------------

describe("ReportUsecase.generateReport", () => {
  beforeEach(() => {
    mockExpenseClient.getAllExpenses.mockImplementation((req: any, cb: any) => {
      cb(null, { expenses: [] });
    });
    mockExpenseClient.getAllExpensesCategory.mockImplementation((req: any, cb: any) => {
      cb(null, { expenseCategories: [] });
    });
    mockUserClient.getUser.mockImplementation((req: any, cb: any) => {
      cb(null, { user: { username: "testuser" } });
    });
  });

  afterEach(() => { jest.clearAllMocks(); });

  test.each([
    {
      name: "returns downloadUrl, filename, and expiresAt on success",
      mockSetup: () => {
        mockSend
          .mockResolvedValueOnce(fakeTemplateBody()) // GetObject
          .mockResolvedValueOnce({}); // PutObject
        mockGetSignedUrl.mockResolvedValueOnce(
          "https://signed-url.example.com/report.xlsx",
        );
      },
      input: baseRequest(),
      expected: async (
        promise: ReturnType<InstanceType<typeof ReportUsecase>["generateReport"]>,
      ) => {
        const result = await promise;
        expect(result.downloadUrl).toBe("https://signed-url.example.com/report.xlsx");
        expect(result.filename).toBe("expense-report-2026-05-01-2026-05-31.xlsx");
        expect(result.expiresAt).toBeTruthy();
      },
    },
    {
      name: "filename encodes dateStart and dateEnd from the request",
      mockSetup: () => {
        mockSend
          .mockResolvedValueOnce(fakeTemplateBody())
          .mockResolvedValueOnce({});
        mockGetSignedUrl.mockResolvedValueOnce("https://url.example.com/r.xlsx");
      },
      input: baseRequest({ dateStart: "2026-01-01", dateEnd: "2026-01-31" }),
      expected: async (
        promise: ReturnType<InstanceType<typeof ReportUsecase>["generateReport"]>,
      ) => {
        const result = await promise;
        expect(result.filename).toBe("expense-report-2026-01-01-2026-01-31.xlsx");
      },
    },
    {
      name: "expiresAt is roughly 1 hour in the future",
      mockSetup: () => {
        mockSend
          .mockResolvedValueOnce(fakeTemplateBody())
          .mockResolvedValueOnce({});
        mockGetSignedUrl.mockResolvedValueOnce("https://url.example.com/r.xlsx");
      },
      input: baseRequest(),
      expected: async (
        promise: ReturnType<InstanceType<typeof ReportUsecase>["generateReport"]>,
      ) => {
        const before = Date.now();
        const result = await promise;
        const expiresMs = new Date(result.expiresAt).getTime();
        expect(expiresMs).toBeGreaterThanOrEqual(before + 3_595_000);
        expect(expiresMs).toBeLessThanOrEqual(before + 3_605_000);
      },
    },
    {
      name: "rejects when fetching the template from S3 fails",
      mockSetup: () => {
        mockSend.mockRejectedValueOnce(new Error("S3 read error"));
      },
      input: baseRequest(),
      expected: async (
        promise: ReturnType<InstanceType<typeof ReportUsecase>["generateReport"]>,
      ) => {
        await expect(promise).rejects.toThrow("S3 read error");
      },
    },
    {
      name: "rejects when uploading the generated report to S3 fails",
      mockSetup: () => {
        mockSend
          .mockResolvedValueOnce(fakeTemplateBody())
          .mockRejectedValueOnce(new Error("S3 write error"));
        mockGetSignedUrl.mockResolvedValueOnce("https://url.example.com/r.xlsx");
      },
      input: baseRequest(),
      expected: async (
        promise: ReturnType<InstanceType<typeof ReportUsecase>["generateReport"]>,
      ) => {
        await expect(promise).rejects.toThrow("S3 write error");
      },
    },
  ])("$name", async ({ mockSetup, input, expected }) => {
    const usecase = new ReportUsecase(mockExpenseClient as any, mockUserClient as any);
    mockSetup();
    const promise = usecase.generateReport(input);
    await expected(promise);
  });
});
