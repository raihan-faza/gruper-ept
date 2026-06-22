import XlsxTemplate from "xlsx-template";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  GenerateReportRequest,
  GenerateReportResponse,
  UploadTemplateRequest,
  UploadTemplateResponse,
  DeleteTemplateRequest,
  DeleteTemplateResponse,
  ListTemplatesRequest,
  ListTemplatesResponse,
  TemplateInfo,
} from "../../../pb/report.js";

const s3 = new S3Client({
  endpoint: process.env.STORAGE_ENDPOINT,
  region: process.env.STORAGE_REGION,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.STORAGE_SECRET_KEY!,
  },
  forcePathStyle: true,
});

import {
  Expense,
  ExpenseServiceClient,
  ExpenseCategory,
  ExpenseItem,
  GetAllExpensesRequest,
  GetAllExpensesResponse,
  GetAllExpensesCategoryRequest,
  GetAllExpensesCategoryResponse,
} from "../../../pb/expense.js";
import {
  UserServiceClient,
  GetUserRequest,
  GetUserResponse,
} from "../../../pb/user.js";
import {
  type ExpenseRow,
  type XlsxTemplateData,
} from "../../interfaces/report_interface.js";
import { promisify } from "util";
import { Metadata } from "@grpc/grpc-js";

const BUCKET = process.env.STORAGE_BUCKET!;
const fallbackCategories: ExpenseCategory[] = [
  { id: 1, name: "Food & Groceries", description: "Food & Groceries" },
  { id: 2, name: "Transportation", description: "Transportation" },
  { id: 3, name: "Utilities", description: "Utilities" },
  { id: 4, name: "Entertainment", description: "Entertainment" },
  { id: 5, name: "Health", description: "Health" },
  { id: 6, name: "Shopping", description: "Shopping" },
  { id: 7, name: "Other", description: "Other" },
];
type GetAllExpensesFn = (
  req: GetAllExpensesRequest,
) => Promise<GetAllExpensesResponse>;

type GetAllExpenseCateogoriesFn = (
  req: GetAllExpensesCategoryRequest,
) => Promise<GetAllExpensesCategoryResponse>;

type GetUserFn = (req: GetUserRequest) => Promise<GetUserResponse>;

export function buildTemplateData(
  expenses: Expense[],
  categories: ExpenseCategory[],
  memberName: string,
): XlsxTemplateData {
  let grandTotal = 0;

  const categoryMap = new Map<number, ExpenseCategory>(
    categories.length > 0 ? categories.map((c) => [c.id, c]) : fallbackCategories.map((c) => [c.id, c]),
  );

  const rows: ExpenseRow[] = expenses.flatMap((expense) => {
    grandTotal += Number(expense.amount);

    const categoryName =
      categoryMap.get(expense.categoryId)?.name ?? String(expense.categoryId);

    const base = {
      member: memberName,
      date: expense.date,
      expense_name: expense.expenseName,
      expense_details: expense.expenseDetails,
      category: categoryName,
    };

    const amount = Number(expense.amount);
    const items = expense.expenseItems ?? [];

    // Case 1 & 2: no items at all
    if (items.length === 0) {
      return [{ ...base, item_name: "", item_quantity: 0, total_price: amount }];
    }

    // Separate "real" items (have at least a name or a price) from ghost items
    const realItems = items.filter(
      (it) => it.itemName?.trim() || Number(it.totalPrice) > 0 || Number(it.itemQuantity) > 0,
    );
    const realSum = realItems.reduce((sum, it) => sum + Number(it.totalPrice), 0);
    const remainder = amount - realSum;

    const rows = realItems.map((item: ExpenseItem) => ({
      ...base,
      item_name: item.itemName ?? "",
      item_quantity: Number(item.itemQuantity),
      total_price: Number(item.totalPrice),
    }));

    // If there were ghost items and there's a remainder, emit one extra row
    const hasGhosts = items.length > realItems.length;
    if (hasGhosts && remainder > 0) {
      rows.push({ ...base, item_name: "", item_quantity: 0, total_price: remainder });
    }

    return rows;
  });

  return {
    expenses: rows,
    total_price: grandTotal,
  };
}

export class ReportUsecase {
  constructor(
    private expenseGrpcClient: ExpenseServiceClient,
    private userGrpcClient: UserServiceClient,
  ) { }

  generateReport = async (
    request: GenerateReportRequest,
  ): Promise<GenerateReportResponse> => {
    // 1. Fetch the template from object storage
    let templateKey = `templates/test_template.xlsx`;
    if (request.templateName && request.templateName !== "default" && request.templateName !== "test_template") {
      templateKey = `templates/${request.walletId}/${request.templateName}.xlsx`;
    }
    const templateObject = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: templateKey,
      }),
    );
    const templateBuffer = Buffer.from(
      await templateObject.Body!.transformToByteArray(),
    );

    // 2. Fetch expense + user data
    const data = await this.fetchExpenseData(
      request.walletId,
      request.userId,
      request.dateStart,
      request.dateEnd,
    );
    console.dir(data, { depth: null, colors: true })

    // 3. Load template and substitute placeholders
    const template = new XlsxTemplate(templateBuffer);
    template.substitute("Sheet1", data);

    // 4. Generate output buffer
    const output = template.generate({ type: "nodebuffer" }) as Buffer;

    // 5. Upload generated report to object storage
    const reportKey = `reports/${request.walletId}/${request.userId}_${Date.now()}.xlsx`;
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: reportKey,
        Body: output,
        ContentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );

    // 6. Generate a pre-signed download URL (expires in 1 hour)
    const expiresIn = 3600;
    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: BUCKET, Key: reportKey }),
      { expiresIn },
    );

    const filename = `expense-report-${request.dateStart}-${request.dateEnd}.xlsx`;

    return {
      downloadUrl,
      filename,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  };

  private getAllExpenses(
    request: any,
    metadata: Metadata,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.expenseGrpcClient.getAllExpenses(
        request,
        metadata,
        (err: any, res: any) => {
          if (err) return reject(err);
          resolve(res);
        },
      );
    });
  }

  private getAllCategories(
    request: any,
    metadata: Metadata,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.expenseGrpcClient.getAllExpensesCategory(
        request,
        metadata,
        (err: any, res: any) => {
          if (err) return reject(err);
          resolve(res);
        },
      );
    });
  }

  private getUser(request: any, metadata: Metadata): Promise<any> {
    return new Promise((resolve, reject) => {
      this.userGrpcClient.getUser(
        request,
        metadata,
        (err: any, res: any) => {
          if (err) return reject(err);
          resolve(res);
        },
      );
    });
  }


  private fetchExpenseData = async (
    walletId: string,
    userId: string,
    dateStart: string,
    dateEnd: string,
  ): Promise<XlsxTemplateData> => {
    const metadata = new Metadata();
    metadata.set("user_id", userId);

    const expensesResponse = await this.getAllExpenses(
      {
        userId,
        walletId,
      },
      metadata,
    );

    const expenses: Expense[] = expensesResponse.expenses;
    console.log("expenses: ", expenses)
    const categoriesResponse = await this.getAllCategories(
      {
        userId,
      },
      metadata,
    );

    const categories: ExpenseCategory[] = categoriesResponse.expenseCategories;
    console.log("categories:", categories)
    const memberName = await this.getMemberName(userId);

    // const getAllExpenses = promisify(
    //   this.expenseGrpcClient.getAllExpenses.bind(this.expenseGrpcClient),
    // ) as unknown as GetAllExpensesFn;

    // const expenses: Expense[] = (
    //   await getAllExpenses({
    //     userId: userId,
    //     walletId: walletId,
    //   }, metadata)
    // ).expenses;

    // const getAllCategories = promisify(
    //   this.expenseGrpcClient.getAllExpensesCategory.bind(
    //     this.expenseGrpcClient,
    //   ),
    // ) as unknown as GetAllExpenseCateogoriesFn;

    // const categories: ExpenseCategory[] = (
    //   await getAllCategories({
    //     userId: userId,
    //   })
    // ).expenseCategories;

    // const memberName = await this.getMemberName(userId);

    return buildTemplateData(expenses, categories, memberName);
  };

  /** Resolves the user's display name via the user service gRPC call. */
  private getMemberName = async (userId: string): Promise<string> => {
    const metadata = new Metadata();
    metadata.set("user_id", userId);
    // const getUser = promisify(
    //   this.userGrpcClient.getUser.bind(this.userGrpcClient),
    // ) as unknown as GetUserFn;

    // const response = await getUser({ userId });
    const memberResponses = await this.getUser({ userId }, metadata);
    const user = memberResponses.user;
    if (!user) {
      return userId;
    }

    const fullName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    // Prefer firstName + lastName; fall back to `username`; last resort: userId
    return fullName || user.username || userId;
  };

  private getMetadataList = async (walletId: string): Promise<TemplateInfo[]> => {
    try {
      const response = await s3.send(
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: `templates/${walletId}/metadata.json`,
        })
      );
      const content = await response.Body!.transformToString();
      return JSON.parse(content);
    } catch (e: any) {
      if (e.name === "NoSuchKey") {
        return [];
      }
      console.error("Error reading metadata list:", e);
      return [];
    }
  };

  private saveMetadataList = async (walletId: string, list: TemplateInfo[]): Promise<void> => {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: `templates/${walletId}/metadata.json`,
        Body: JSON.stringify(list),
        ContentType: "application/json",
      })
    );
  };

  uploadTemplate = async (
    request: UploadTemplateRequest,
  ): Promise<UploadTemplateResponse> => {
    if (!request.walletId || !request.templateName || !request.fileContent) {
      throw new Error("Missing required parameters for upload");
    }

    const templateKey = `templates/${request.walletId}/${request.templateName}.xlsx`;
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: templateKey,
        Body: Buffer.from(request.fileContent),
        ContentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    );

    const list = await this.getMetadataList(request.walletId);
    const existingIndex = list.findIndex(t => t.templateName === request.templateName);
    const item = {
      templateName: request.templateName,
      description: request.description || "Custom template",
    };
    if (existingIndex > -1) {
      list[existingIndex] = item;
    } else {
      list.push(item);
    }
    await this.saveMetadataList(request.walletId, list);

    return {
      templateName: request.templateName,
      status: "success",
    };
  };

  deleteTemplate = async (
    request: DeleteTemplateRequest,
  ): Promise<DeleteTemplateResponse> => {
    if (!request.walletId || !request.templateName) {
      throw new Error("Missing required parameters for delete");
    }

    const templateKey = `templates/${request.walletId}/${request.templateName}.xlsx`;
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: templateKey,
        })
      );
    } catch (e) {
      console.warn("Template file not found or couldn't be deleted:", e);
    }

    const list = await this.getMetadataList(request.walletId);
    const updated = list.filter(t => t.templateName !== request.templateName);
    await this.saveMetadataList(request.walletId, updated);

    return {
      status: "success",
    };
  };

  listTemplates = async (
    request: ListTemplatesRequest,
  ): Promise<ListTemplatesResponse> => {
    if (!request.walletId) {
      throw new Error("Missing wallet_id for list templates");
    }
    const templates = await this.getMetadataList(request.walletId);
    return {
      templates,
    };
  };
}