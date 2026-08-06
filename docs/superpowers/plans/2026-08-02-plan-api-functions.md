# Plan API Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three plan-related API functions to `src/api/insforgeService.ts` for the professional pricing feature.

**Architecture:** Extend existing service file with specialized plan management functions that follow established patterns and use the existing `Professional` type definition.

**Tech Stack:** TypeScript, InsForge database client, existing project patterns

## Global Constraints

- Follow existing code patterns in `src/api/insforgeService.ts`
- Use existing `Professional` type from `src/types.ts`
- No new dependencies required
- Maintain consistency with existing error handling patterns

---

### Task 1: Add Plan API Functions

**Files:**
- Modify: `src/api/insforgeService.ts` (add functions at end of file)

**Interfaces:**
- Consumes: Existing `insforge.database` client and `Professional` type
- Produces: Three new exported functions: `updateProfessionalPlan`, `incrementRequestCount`, `canCreateRequest`

- [ ] **Step 1: Add `updateProfessionalPlan` function**

```typescript
export async function updateProfessionalPlan(
  id: string,
  plan: string,
  planStatus: string,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<Professional> {
  const updates: Record<string, unknown> = {
    plan,
    plan_status: planStatus,
  }
  if (stripeCustomerId) updates.stripe_customer_id = stripeCustomerId
  if (stripeSubscriptionId) updates.stripe_subscription_id = stripeSubscriptionId

  const { data, error } = await insforge.database
    .from('professionals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Professional
}
```

- [ ] **Step 2: Add `incrementRequestCount` function**

```typescript
export async function incrementRequestCount(professionalId: string): Promise<void> {
  const { data: pro, error: fetchError } = await insforge.database
    .from('professionals')
    .select('requests_this_month, requests_reset_at')
    .eq('id', professionalId)
    .single()

  if (fetchError) throw fetchError

  const now = new Date()
  const resetAt = pro.requests_reset_at ? new Date(pro.requests_reset_at) : null
  const needsReset = !resetAt || resetAt.getMonth() !== now.getMonth() || resetAt.getFullYear() !== now.getFullYear()

  const newCount = needsReset ? 1 : (pro.requests_this_month || 0) + 1

  const { error: updateError } = await insforge.database
    .from('professionals')
    .update({
      requests_this_month: newCount,
      requests_reset_at: needsReset ? now.toISOString() : pro.requests_reset_at,
    })
    .eq('id', professionalId)

  if (updateError) throw updateError
}
```

- [ ] **Step 3: Add `canCreateRequest` function**

```typescript
export async function canCreateRequest(professionalId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const { data: pro, error } = await insforge.database
    .from('professionals')
    .select('plan, requests_this_month, requests_reset_at')
    .eq('id', professionalId)
    .single()

  if (error) throw error

  const now = new Date()
  const resetAt = pro.requests_reset_at ? new Date(pro.requests_reset_at) : null
  const needsReset = !resetAt || resetAt.getMonth() !== now.getMonth() || resetAt.getFullYear() !== now.getFullYear()

  if (pro.plan === 'completo') {
    return { allowed: true, current: needsReset ? 0 : pro.requests_this_month || 0, limit: Infinity }
  }

  const current = needsReset ? 0 : pro.requests_this_month || 0
  return { allowed: current < 10, current, limit: 10 }
}
```

- [ ] **Step 4: Run build verification**

Run: `npm run build`
Expected: No type errors, successful build

- [ ] **Step 5: Commit changes**

```bash
git add src/api/insforgeService.ts
git commit -m "feat: add plan-related API functions for professional pricing"
```

## Verification

After implementation, verify:
1. All three functions are exported and properly typed
2. Build completes without errors
3. Functions follow existing patterns in the file
4. No linting issues introduced