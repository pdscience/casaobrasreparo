# Plan API Functions Design

## Overview

Add three plan-related API functions to `src/api/insforgeService.ts` for the professional pricing feature.

## Functions

### 1. `updateProfessionalPlan`

Updates a professional's plan, status, and optional Stripe identifiers.

**Parameters:**
- `id: string` - Professional ID
- `plan: string` - Plan type ('essencial' | 'completo')
- `planStatus: string` - Plan status ('active' | 'past_due' | 'canceled')
- `stripeCustomerId?: string` - Optional Stripe customer ID
- `stripeSubscriptionId?: string` - Optional Stripe subscription ID

**Returns:** `Promise<Professional>`

### 2. `incrementRequestCount`

Increments the monthly request count for a professional, with automatic monthly reset logic.

**Parameters:**
- `professionalId: string` - Professional ID

**Returns:** `Promise<void>`

**Logic:**
- Fetches current `requests_this_month` and `requests_reset_at`
- Checks if month has changed since last reset
- If month changed: resets count to 1, updates reset timestamp
- If same month: increments count by 1

### 3. `canCreateRequest`

Checks if a professional can create a request based on plan limits.

**Parameters:**
- `professionalId: string` - Professional ID

**Returns:** `Promise<{ allowed: boolean; current: number; limit: number }>`

**Logic:**
- Fetches professional's plan, current count, and reset date
- Checks for monthly reset
- 'completo' plan: unlimited requests (limit = Infinity)
- 'essencial' plan: limit of 10 requests per month

## Implementation

Add functions to the end of `src/api/insforgeService.ts` following existing patterns.

## Dependencies

- Existing `Professional` type in `src/types.ts` (already has required fields)
- `insforge.database` client already imported in the file

## Verification

Run `npm run build` to ensure no type errors.