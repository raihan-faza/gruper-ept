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
        expect(result.expenses).toHaveLength(1);
        const row = result.expenses[0];
        expect(row?.member).toBe("Alice");
        expect(row?.date).toBe("2026-05-01");
        expect(row?.expense_name).toBe("Makan Siang");
        expect(row?.expense_details).toBe("Makan bareng tim");
        expect(row?.category).toBe("Food & Beverage");
        expect(row?.expense_item).toHaveLength(2);
        expect(row?.expense_item[0]).toEqual({ item_name: "Nasi Ayam", item_quantity: 3, total_price: 75_000 });
        expect(row?.expense_item[1]).toEqual({ item_name: "Es Teh", item_quantity: 3, total_price: 15_000 });
      },
    },
    {
      name: "sums amounts into total_price",
      mockSetup: () => { },
      input: {
        expenses: [
          baseExpense({ id: "exp-001", amount: 90_000, categoryId: 1 }),
          baseExpense({ id: "exp-002", amount: 25_000, categoryId: 2 }),
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
        expect(result.expenses[0]?.expense_item).toHaveLength(0);
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
