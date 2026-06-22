package dto

import (
	"encoding/json"
	"fmt"
	"strings"
)

// validCategories holds the accepted category_id uint64 values as defined in the prompt schema.
// 1=food, 2=transport, 3=utilities, 4=entertainment, 5=health, 6=shopping, 7=other
var validCategories = map[uint64]bool{
	1: true, // food
	2: true, // transport
	3: true, // utilities
	4: true, // entertainment
	5: true, // health
	6: true, // shopping
	7: true, // other
}

// validStatuses holds the accepted status values as defined in the prompt schema.
var validStatuses = map[string]bool{
	"completed": true,
	"pending":   true,
}

// ParseAndValidateLLMResponse parses raw JSON produced by the LLM, validates it against
// the expected expense schema, and returns the structured result.
//
// Returns an error if:
//   - The JSON is malformed or cannot be unmarshalled.
//   - The JSON is an empty object "{}" (LLM rejection signal).
//   - The "expenses" array is missing or empty.
//   - Any individual expense or its items fail field-level validation.
func ParseAndValidateLLMResponse(raw string) (*ExtractedExpenses, error) {
	raw = strings.TrimSpace(raw)

	// The LLM returns "{}" to signal rejection (no expense data, prompt injection, etc.)
	if raw == "{}" {
		return nil, fmt.Errorf("llm returned rejection signal: no expense data found in input")
	}

	var result ExtractedExpenses
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return nil, fmt.Errorf("failed to parse llm response as json: %w", err)
	}

	if err := ValidateExtractedExpenses(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

// ValidateExtractedExpenses validates a decoded ExtractedExpenses struct against the
// expense schema rules. Use this when you have already unmarshalled the JSON.
func ValidateExtractedExpenses(e *ExtractedExpenses) error {
	if len(e.Expenses) == 0 {
		return fmt.Errorf("validation failed: 'expenses' array is missing or empty")
	}

	for i, exp := range e.Expenses {
		if err := validateExpense(i, &exp); err != nil {
			return err
		}
	}

	return nil
}

// validateExpense validates a single Expense entry.
func validateExpense(idx int, e *Expense) error {
	prefix := fmt.Sprintf("expenses[%d]", idx)

	if strings.TrimSpace(e.ExpenseName) == "" {
		return fmt.Errorf("%s: 'expense_name' must not be empty", prefix)
	}

	if strings.TrimSpace(e.ExpenseDetails) == "" {
		return fmt.Errorf("%s: 'expense_details' must not be empty", prefix)
	}

	if !validCategories[e.CategoryID] {
		return fmt.Errorf(
			"%s: 'category_id' has invalid value %d — must be one of: 1 (food), 2 (transport), 3 (utilities), 4 (entertainment), 5 (health), 6 (shopping), 7 (other)",
			prefix, e.CategoryID,
		)
	}

	if e.Amount < 0 {
		return fmt.Errorf("%s: 'amount' must be a non-negative integer, got %d", prefix, e.Amount)
	}

	// 'date' may be empty string (null inferred as "") — that is acceptable per schema.
	// Validate ISO 8601 format only when a value is actually present.
	if e.Date != "" {
		if err := validateISO8601Date(e.Date); err != nil {
			return fmt.Errorf("%s: 'date' %w", prefix, err)
		}
	}

	statusKey := strings.ToLower(strings.TrimSpace(e.Status))
	if !validStatuses[statusKey] {
		return fmt.Errorf(
			"%s: 'status' has invalid value %q — must be 'completed' or 'pending'",
			prefix, e.Status,
		)
	}

	// Validate expense items and cross-check total against amount when items are present.
	if err := validateExpenseItems(prefix, e); err != nil {
		return err
	}

	return nil
}

// validateExpenseItems validates each item and checks that their total_price sum
// equals the parent amount when items are present.
func validateExpenseItems(prefix string, e *Expense) error {
	if len(e.ExpenseItems) == 0 {
		// Empty items array is allowed per schema rule 3.
		return nil
	}

	var itemsTotal int64
	for j, item := range e.ExpenseItems {
		itemPrefix := fmt.Sprintf("%s.expense_items[%d]", prefix, j)

		if strings.TrimSpace(item.ItemName) == "" {
			return fmt.Errorf("%s: 'item_name' must not be empty", itemPrefix)
		}
		if item.ItemQty <= 0 {
			return fmt.Errorf("%s: 'item_quantity' must be a positive integer, got %d", itemPrefix, item.ItemQty)
		}
		if item.TotalPrice < 0 {
			return fmt.Errorf("%s: 'total_price' must be a non-negative integer, got %d", itemPrefix, item.TotalPrice)
		}

		itemsTotal += item.TotalPrice
	}

	// Schema rule 2: amount must equal sum of all expense_items[].total_price when items exist.
	if itemsTotal != e.Amount {
		return fmt.Errorf(
			"%s: 'amount' (%d) must equal the sum of all expense_items[].total_price (%d)",
			prefix, e.Amount, itemsTotal,
		)
	}

	return nil
}

// validateISO8601Date checks that a date string matches YYYY-MM-DD format.
func validateISO8601Date(date string) error {
	const layout = "2006-01-02" // Go reference time for YYYY-MM-DD
	parts := strings.Split(date, "-")
	if len(parts) != 3 || len(parts[0]) != 4 || len(parts[1]) != 2 || len(parts[2]) != 2 {
		return fmt.Errorf("invalid ISO 8601 date format %q — expected YYYY-MM-DD", date)
	}
	// Verify the values are all digits
	for _, p := range parts {
		for _, c := range p {
			if c < '0' || c > '9' {
				return fmt.Errorf("invalid ISO 8601 date format %q — expected YYYY-MM-DD", date)
			}
		}
	}
	_ = layout
	return nil
}
