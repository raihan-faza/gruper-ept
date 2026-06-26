import { afterEach, describe, expect, jest, test } from "@jest/globals";
import {
  buildTemplateData,
} from "../../src/application/usecases/report.js";
import type { Expense, ExpenseCategory } from "../../pb/expense.js";
import type { XlsxTemplateData } from "../../src/interfaces/report_interface.js";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const baseCategory = (overrides: Partial<ExpenseCategory> = {}): ExpenseCategory => ({
  id: 1,
  userId: "user-123",
  name: "Food & Beverage",
  description: "Meals and drinks",
  createdAt: undefined,
  updatedAt: undefined,
  ...overrides,
});

const baseExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "exp-001",
  userId: "user-123",
  walletId: "wallet-abc",
  categoryId: 1,
  expenseName: "Makan Siang",
  expenseDetails: "Makan bareng tim",
  expenseItems: [
    { itemName: "Nasi Ayam", itemQuantity: 3, totalPrice: 75_000 },
    { itemName: "Es Teh", itemQuantity: 3, totalPrice: 15_000 },
  ],
  amount: 90_000,
  status: "completed",
  date: "2026-05-01",
  idempotencyKey: "",
  createdAt: undefined,
  updatedAt: undefined,
  ...overrides,
});

// ---------------------------------------------------------------------------
// buildTemplateData
// ---------------------------------------------------------------------------

describe("buildTemplateData", () => {
  afterEach(() => { jest.clearAllMocks(); });

  test.each([
    {
      name: "maps a single expense to one row with correct fields",
      mockSetup: () => { },
      input: {
        expenses: [baseExpense()],
        categories: [baseCategory()],
        memberName: "Alice",
      },
      expected: (result: XlsxTemplateData) => {
        expect(result.expenses).toHaveLength(2);
        const row1 = result.expenses[0];
        expect(row1?.member).toBe("Alice");
        expect(row1?.date).toBe("2026-05-01");
        expect(row1?.expense_name).toBe("Makan Siang");
        expect(row1?.expense_details).toBe("Makan bareng tim");
        expect(row1?.category).toBe("Food & Beverage");
        expect(row1?.item_name).toBe("Nasi Ayam");
        expect(row1?.item_quantity).toBe(3);
        expect(row1?.total_price).toBe(75_000);

        const row2 = result.expenses[1];
        expect(row2?.member).toBe("Alice");
        expect(row2?.date).toBe("2026-05-01");
        expect(row2?.expense_name).toBe("Makan Siang");
        expect(row2?.expense_details).toBe("Makan bareng tim");
        expect(row2?.category).toBe("Food & Beverage");
        expect(row2?.item_name).toBe("Es Teh");
        expect(row2?.item_quantity).toBe(3);
        expect(row2?.total_price).toBe(15_000);
      },
    },
    {
      name: "sums amounts into total_price",
      mockSetup: () => { },
      input: {
        expenses: [
          baseExpense({ id: "exp-001", amount: 90_000, categoryId: 1, expenseItems: [] }),
          baseExpense({ id: "exp-002", amount: 25_000, categoryId: 2, expenseItems: [] }),
        ],
        categories: [
          baseCategory({ id: 1, name: "Food & Beverage" }),
          baseCategory({ id: 2, name: "Transport" }),
        ],
        memberName: "Bob",
      },
      expected: (result: XlsxTemplateData) => {
        expect(result.total_price).toBe(115_000);
        expect(result.expenses).toHaveLength(2);
      },
    },
    {
      name: "falls back to categoryId string when category is not in the map",
      mockSetup: () => { },
      input: {
        expenses: [baseExpense({ categoryId: 99 })],
        categories: [],
        memberName: "Carol",
      },
      expected: (result: XlsxTemplateData) => {
        expect(result.expenses[0]?.category).toBe("99");
      },
    },
    {
      name: "returns zero total_price and empty rows when expenses are empty",
      mockSetup: () => { },
      input: {
        expenses: [],
        categories: [baseCategory()],
        memberName: "Dave",
      },
      expected: (result: XlsxTemplateData) => {
        expect(result.expenses).toHaveLength(0);
        expect(result.total_price).toBe(0);
      },
    },
    {
      name: "handles an expense with no items",
      mockSetup: () => { },
      input: {
        expenses: [baseExpense({ expenseItems: [] })],
        categories: [baseCategory()],
        memberName: "Eve",
      },
      expected: (result: XlsxTemplateData) => {
        expect(result.expenses).toHaveLength(1);
        const row = result.expenses[0];
        expect(row?.item_name).toBe("");
        expect(row?.item_quantity).toBe(0);
        expect(row?.total_price).toBe(90_000);
      },
    },
    {
      name: "converts numeric amount strings (via Number()) correctly",
      mockSetup: () => { },
      input: {
        // Amount typed as number but simulate a string value coming over the wire
        expenses: [baseExpense({ amount: "50000" as unknown as number })],
        categories: [baseCategory()],
        memberName: "Frank",
      },
      expected: (result: XlsxTemplateData) => {
        expect(result.total_price).toBe(50_000);
      },
    },
  ])("$name", ({ mockSetup, input, expected }) => {
    mockSetup();
    const result = buildTemplateData(input.expenses, input.categories, input.memberName);
    expected(result);
  });
});
