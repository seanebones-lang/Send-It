# Iteration 5: E2E Testing & Performance Optimization — Plan

## Plan Overview

This iteration focuses on:
1. **E2E Testing Setup** (High Priority)
2. **React Component Tests** (High Priority)
3. **IPC Communication Tests** (Medium Priority)
4. **Performance Optimization** (Medium Priority)
5. **Comprehensive Documentation** (Medium Priority)

## Phase 1: Performance Optimization (Start Here - Foundation)

### 1.1 Queue Processing Optimization (High Impact)
**Issue**: 100ms delay on every iteration, worker array growth
**Solution**:
- Replace fixed delay with event-driven approach
- Use `activeWorkers` Set only (remove workers array)
- Optimize Promise.race with filtered active workers
- Add backpressure mechanism for worker management

**Files to Modify**:
- `src/services/QueueService.ts` (lines 221-254)

**Expected Impact**:
- 50%+ faster queue processing
- Reduced CPU usage during idle periods
- Memory leak fix

### 1.2 Database Query Caching (Medium Impact)
**Issue**: No query result caching for frequently accessed data
**Solution**:
- Add query result cache with TTL (30 seconds default)
- Cache `getAllDeployments()` and `getDeploymentsByStatus()` results
- Invalidate cache on write operations
- Add cache statistics for monitoring

**Files to Modify**:
- `src/services/DatabaseService.ts` (add caching layer)

**Expected Impact**:
- 90%+ faster repeated queries
- Reduced database load
- Better scalability

### 1.3 Lazy Queue Recovery (Low Impact)
**Issue**: Loads all pending deployments on startup
**Solution**:
- Load only queued deployments on startup
- Lazy-load processing deployments when queue is accessed
- Add recovery flag to track initialization

**Files to Modify**:
- `src/services/QueueService.ts` (loadPendingDeployments method)

**Expected Impact**:
- Faster app startup
- Reduced memory usage on startup

## Phase 2: React Component Tests (High Priority)

### 2.1 Setup React Testing Library
**Dependencies**: Already installed (`@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`)

### 2.2 Component Tests

#### StepRepo Component
**Test Cases**:
- Renders correctly with default state
- Validates repository URL input
- Handles form submission (success and failure)
- Displays error messages correctly
- Shows loading state during clone/analysis
- Displays clone result and analysis result
- Calls Electron API correctly
- Handles Electron API errors

**File**: `src/renderer/components/StepRepo.test.tsx`

#### StepAnalysis Component
**Test Cases**:
- Renders correctly with analysis result
- Displays framework detection results
- Shows platform compatibility scores
- Handles platform selection
- Calls Electron API for deployment
- Displays deployment status
- Handles deployment errors

**File**: `src/renderer/components/StepAnalysis.test.tsx`

#### StepEnv Component
**Test Cases**:
- Renders correctly with env vars
- Adds new environment variables
- Edits existing environment variables
- Removes environment variables
- Validates environment variable format
- Handles form submission

**File**: `src/renderer/components/StepEnv.test.tsx`

#### App Component
**Test Cases**:
- Renders wizard correctly
- Handles step navigation (next/prev)
- Displays correct step component
- Handles dark mode toggle
- Manages wizard state correctly

**File**: `src/renderer/App.test.tsx`

### 2.3 Hook Tests

#### useElectron Hook
**Test Cases**:
- Detects Electron API availability
- Returns all required methods
- Handles API unavailability gracefully

**File**: `src/renderer/hooks/useElectron.test.ts`

### 2.4 Context Tests

#### WizardContext
**Test Cases**:
- Provides correct initial state
- Updates state correctly on actions
- Handles step navigation
- Manages error state
- Resets state correctly

**File**: `src/renderer/contexts/WizardContext.test.tsx`

## Phase 3: IPC Communication Tests (Medium Priority)

### 3.1 IPC Channel Tests
**Test Cases**:
- `repo:clone` - Tests repository cloning
- `repo:analyze` - Tests framework analysis
- `deploy:queue` - Tests deployment queuing
- `deploy:status` - Tests deployment status retrieval
- `deploy:logs` - Tests log retrieval
- `deploy:queueList` - Tests queue list retrieval
- `token:get` - Tests token retrieval
- `token:set` - Tests token storage
- `token:oauth` - Tests OAuth flow (mocked)
- Error handling for all channels

**File**: `src/test/ipc/ipc.channels.test.ts`

### 3.2 Preload Script Tests
**Test Cases**:
- Exposes all required APIs
- Handles missing Electron APIs gracefully
- Type definitions are correct

**File**: `src/preload.test.ts`

## Phase 4: E2E Testing Setup (High Priority)

### 4.1 Setup Playwright for Electron
**Note**: Playwright doesn't have native Electron support. Consider alternatives:
- **Option A**: Use Spectron (deprecated, not recommended)
- **Option B**: Use Playwright with custom setup (complex)
- **Option C**: Use `@testing-library/react` with mocked Electron APIs (recommended for now)
- **Option D**: Use Electron's built-in testing utilities

**Decision**: Start with **Option C** (component tests with full integration), add true E2E later if needed.

### 4.2 E2E Test Scenarios (Using Component Tests + Mocked APIs)

#### Complete Deployment Wizard Flow
**Test Cases**:
- Step 1: Repository URL input → Clone → Analysis
- Step 2: Framework detection → Platform selection → Deployment
- Step 3: Environment variables → Final deployment
- Error recovery at each step
- Navigation (next/prev/goTo)

**File**: `src/test/e2e/deployment-wizard.e2e.test.tsx`

## Phase 5: Documentation (Medium Priority)

### 5.1 README.md
**Sections**:
- Project overview and description
- Features list
- Installation instructions
- Usage guide
- Development setup
- Testing instructions
- Architecture overview
- Contributing guidelines
- License information

### 5.2 API Documentation
**Tool**: TypeDoc
**Coverage**:
- All services and methods
- All utilities
- Type definitions
- Usage examples

**File**: `docs/api/` (generated)

### 5.3 Contributing Guide
**Sections**:
- Development setup
- Code style guidelines
- Testing requirements
- Pull request process
- Issue reporting

**File**: `CONTRIBUTING.md`

### 5.4 Architecture Documentation
**Sections**:
- System overview
- Service architecture
- Data flow diagrams
- Database schema
- IPC communication patterns

**File**: `docs/ARCHITECTURE.md`

## Execution Order

1. **Phase 1**: Performance Optimization (foundation for better tests)
2. **Phase 2**: React Component Tests (core UI functionality)
3. **Phase 3**: IPC Communication Tests (integration layer)
4. **Phase 4**: E2E Testing (complete workflows)
5. **Phase 5**: Documentation (final polish)

## Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1 | Performance Optimization | 3-4 hours |
| Phase 2 | Component Tests | 4-6 hours |
| Phase 3 | IPC Tests | 2-3 hours |
| Phase 4 | E2E Setup | 4-6 hours |
| Phase 5 | Documentation | 4-6 hours |
| **Total** | | **17-25 hours** |

## Success Criteria

1. ✅ Queue processing 50%+ faster
2. ✅ Database queries cached (90%+ hit rate)
3. ✅ All React components tested (80%+ coverage)
4. ✅ All IPC channels tested
5. ✅ E2E wizard flow tested
6. ✅ Comprehensive documentation (README, API docs, contributing guide)
7. ✅ System score: 98/100

## Risks and Mitigations

### Risk 1: Performance Optimization May Introduce Bugs
**Mitigation**: 
- Write tests first (TDD approach)
- Thorough testing after optimization
- Performance benchmarks before/after

### Risk 2: E2E Testing Complexity
**Mitigation**:
- Start with component tests (easier)
- Use mocked Electron APIs (simpler)
- Add true E2E later if needed

### Risk 3: Documentation Maintenance
**Mitigation**:
- Auto-generate API docs (TypeDoc)
- Keep documentation close to code
- Review during code reviews
