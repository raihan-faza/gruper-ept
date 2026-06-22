import { Expense, ExpenseCategory, ExpenseItem } from "../../pb/expense.js";

export interface GenerateReportRequest {
  userId: string;
  walletId: string;
  dateStart: string;
  dateEnd: string;
}

export interface GenerateReportResponse {
  downloadUrl: string;
  filename: string;
  expiresAt: string;
}

export interface ReportInterface {
  generateReport(
    request: GenerateReportRequest,
  ): Promise<GenerateReportResponse>;
}

export interface ExpenseRow {
  member: string;
  date: string;
  expense_name: string;
  expense_details: string;
  category: string;
  item_name: string;
  item_quantity: number | string;
  total_price: number;
}


export interface XlsxTemplateData {
  expenses: ExpenseRow[];
  total_price: number;
}
