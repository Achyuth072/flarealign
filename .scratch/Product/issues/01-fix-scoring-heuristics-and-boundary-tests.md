# 01: Fix Scoring Heuristics and Boundary Tests

**What to build:**
Accurate, calibrated multi-dimensional fit scoring and complete unit test coverage. The scoring logic calculates weighted composite scores across Skills (35%), Experience (30%), Domain (20%), and Trajectory (15%), derives correct categorical recommendations ("Strong Fit" >= 80, "Potential Fit" 60–79, "Low Fit" < 60), exports strict Zod schemas for validation, and passes a comprehensive suite covering all edge and boundary conditions.

Type: task

**Blocked by:** None (can start immediately)

**Status:** resolved

## Acceptance criteria

- [x] `computeCompositeFitScore` accurately calculates weighted scores and correctly handles all-zero (0) and all-100 (100) sub-dimension values without NaN or overflow
- [x] `deriveRecommendation` correctly returns:
  - "Strong Fit" for scores >= 80 (verifying exact boundary at 80 vs 79)
  - "Potential Fit" for scores 60..79 (verifying exact boundary at 60 vs 59)
  - "Low Fit" for scores < 60
- [x] Zod schemas `SubDimensionsSchema` and `FitScoreResultSchema` are exported from `src/lib/scoring.ts` and verified with unit tests
- [x] `validateWeights` enforces total sum of 100% (1.0) and non-negative bounds
- [x] Inverted experience scoring heuristic in `tailoring-workflow.ts` is fixed so higher seniority requirements appropriately match candidate experience level (3 YOE)
- [x] `npm test` runs vitest and passes all scoring tests with 100% branch coverage

