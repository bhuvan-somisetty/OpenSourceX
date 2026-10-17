---
id: reference-kyverno-integration-testing
title: Example LFX proposal: Kyverno code-level integration testing framework (CNCF)
kind: reference
tags: kyverno, testing, integration tests, envtest, go, kubernetes, proposal example
sources: Reference proposal shared by the OpenSourceX owner (personal details removed)
---

## Overview

LFX Mentorship 2026 Spring Term
Kyverno Test Enhancements: Code-Level Integration Testing Framework
Mentors: [name removed], [name removed]
GitHub Issue: kyverno/kyverno#14725
Name and Contact Information

How I Found Kyverno & the LFX Mentorship
I found Kyverno while exploring cloud-native projects on GitHub. The policy engine architecture caught my attention (admission webhooks, background scan controllers, a full policy cache) and it was exactly the kind of complex distributed system I wanted to learn by contributing to. I started with small bug fixes, then bigger ones, and eventually started writing tests for entire subsystems. When I saw the LFX Mentorship listing for #14725 (Integration Testing Framework), it felt like a natural fit. I'd built test infrastructure from scratch in PR #15006, tested the background controller in PR #14975, and I knew firsthand how slow the E2E feedback loop was.
Why I'm Interested in This Program
I've waited 30+ minutes for Chainsaw E2E tests to tell me something I could've known in 5 seconds. While debugging namespace-scoped audit policy behavior, I had to spin up a Kind cluster, deploy Kyverno, apply policies, create resources, and wait, just to verify a one-line cache lookup fix. That feedback loop is painful, and it slows down every contributor. I like working on Kyverno. The codebase is complex enough to be interesting (admission webhooks, background scan controllers, a policy cache, CEL expressions) but organized well enough that I can find my way around. The maintainers have been incredibly supportive throughout my contributions, and [name removed] in particular has guided me a lot through the process. Kyverno has hundreds of unit tests and close to a thousand Chainsaw E2E tests, but nothing in between. The infrastructure for integration tests (envtest) is already in the codebase. It just needs someone to build the framework, and I want to be that person.
Experience & Skills Applicable to This Program
I'm [name removed], a first-year B.Tech CSE(specialization in AI/ML) student at [university], [university]. I've spent the last few months deep inside Kyverno's codebase, writing tests, fixing bugs, and learning how policy engines actually work under the hood. So far I've shipped 20 merged PRs (8 test suites + 12 bug/feature fixes), with 5 cherry-picked to release branches. I have 10 open PRs currently in review, including a working envtest PoC.

## Overview (continued)

3 PRs That Prove I'm Ready

PR

What I Did

Why It Matters for #14725

#15006: CEL validation handler tests (XL, 20 tests)
#14975: Background controller tests (L)

Built a fakeClient implementing engineapi.Client and a buildCELContext helper from scratch. Broke it 3 times before realizing the fakeClient needed the full interface, not just the methods I was testing. 20 tests covering exceptions, namespace resolution, DELETE handling, multi-expression evaluation.

Phase 1 is the same kind of work: building client factories, helpers, setup utilities. I've already made the mistakes and know what to watch for.

Tested the UpdateRequest controller's state machine: nil errors, retryable errors triggering requeue, completed/skip states, maxRetries validation. Spent a full day just figuring out which of the 27 constructor params could be nil without panicking.

The background scan controller is the hardest part of this project (27 params, 15+ informers). I already know which ones are nil-safe and which ones will blow up.

#14812: Context propagation fix + test (M, cherry-picked)

Found that context.TODO() was silently replacing live contexts in the engine, causing zombie goroutines. Took me 4 days to trace through the call chain. 3-line fix. The mock-injection test I wrote for it has already caught 2 regressions since merging.

Same mock-injection pattern I want for the integration framework: swap in real envtest clients where fakes currently live. Already proven in production.

Proof of Concept: PR #15142
I've already tried out the envtest approach in PR #15142 (draft). It implements:
- envtest bootstrap with Kyverno CRD installation from config/crds/ - Client factories replacing fake.NewSimpleClientset() with real API server-backed clients - Test helpers for namespace isolation and policy lifecycle management - A make test-integration Makefile target

## Overview (continued)

My first envtest attempt panicked because I registered the CRDs wrong. Took a day to realize the path resolution was off and the scheme needed all the apiextensions types too. That's the kind of learning I'm bringing into this project.
All 4 smoke tests (bootstrap, ClusterPolicy CRUD, namespace isolation, policy listing) pass in under 30 seconds with zero cluster dependency. The core setup:
// func SetupEnvTest(t *testing.T) (*rest.Config, *runtime.Scheme) {
t.Helper() scheme := runtime.NewScheme() =_ clientgoscheme.AddToScheme(scheme) =_ kyvernov1.Install(scheme) test_/i=natpeigerxatteinosni/ofnrsavm1e.wAodrdkT/osSecthuepm.eg(oscheme)

testEnv := &envtest.Environment{

## CRDDirectoryPaths: []string{

"../../../config/crds/kyverno", },

Scheme: scheme,

} cfg, err := testEnv.Start()

if err != nil {

t.Fatalf("failed to start envtest: %v", err)

} t.Cleanup(func() {

if err := testEnv.Stop(); err != nil {

t.Errorf("failed to stop
} envtest: })

%v", err)

return cfg, scheme

}

Full Contribution History (30 PRs)

PR

Description

#15142 envtest integration test framework PoC

#15080 Fix namespace-scoped enforce policies in audit query path

#15062 Make generate permissions opt-in in Helm charts

#15026 Tests for pkg/utils/engine/response

#15025 Tests for pkg/utils/report/metadata

#15013 Return error response when PolicyException lookup fails

#15006 Unit tests for CEL validation handler (20 tests)

#14979 UpdateRequest state transition tests

#14978 ValidationFailureAction override tests

#14977 Validation handler unit tests

#14976 Exception selector matching tests

#14975 Unit tests for background controller

#14974 Merge engine responses tests

#14952 Auto-generate PolicyExceptions for existing violations

#14922 Return error response when forEach list evaluation fails

#14919 Error response on namespace label fetch failure

#14894 Skip exception on condition error instead of discarding all

#14867 Add missing break in namespace selector override matching

#14862 Check all VerifyImages entries for FailureAction

#14812 Propagate context in background checks and generate

#14770 Stop image registry calls from hanging the webhook

#14735 Use DeepCopy in WatchManager to prevent cache mutation

#14721 Deny request on mpol handler errors instead of allowing

#14712 Fix generate() returning nil error on failure

#14684 Add missing lock in GetDownstreams to prevent data race

#14638 Prevent nil pointer panic in cleanup controller

#14624 Fix WarmUp only caching first policy due to early returns

#14598 CEL-based ValidatingPolicy support for Pod Security Standards

## CRDDirectoryPaths: []string{ (continued)

#14582 Prevent audit cancellation by HTTP request context

#14572 Skip nil and invalid policies in policycache to prevent panics

Status Draft (PoC) Open Open Merged (1.18.0) Merged (1.18.0) Merged cherry-picked Merged (1.18.0) Merged (1.18.0) Merged (1.18.0) Merged (1.18.0) Merged (1.18.0) Merged (1.18.0) Open Open Open Open Open Merged cherry-picked Open Merged cherry-picked Open Merged cherry-picked Merged(1.17.0) Merged (1.17.0) Merged (1.17.0) Merged (1.17.0) Merged (1.17.0) Merged cherry-picked
Merged (1.17.0) Merged (1.16.2)

Technical Skills
- Go: My primary language for all contributions and personal projects. 5 - Kubernetes internals: Controllers, informers, CRDs, admission webhooks. I learned all of
this by contributing to Kyverno. - Testing at scale: I've built test frameworks from scratch (PR #15006), used mock injection
patterns (PR #14812), and tested complex controller behavior (PR #14975). - controller-runtime & envtest: I've already built a working PoC (PR #15142) with scheme
registration, client factories, and CRD installation.
Project Proposal: 12-Week Implementation Plan

## Chainsaw E2E tests 950+

30-60 min Yes (Kind cluster)

cases Unit tests use fake.NewSimpleClientset(), so they can test individual functions but cannot

exercise controller reconciliation loops, informer cache syncing, CRD schema validation, or any

cross-component interaction that needs a real API server. Chainsaw tests do cover these things,

but you need a full Kind cluster for them, and they take 30-60 minutes to run in CI.

There's nothing in between. That's the gap. The controller-runtime/pkg/envtest package (already in go.mod at v0.23.1) can fill it by spinning up a lightweight local API server + etcd.

Architecture Context
I've spent a lot of time reading through Kyverno's internals while writing my PRs. There are 3 controllers under cmd/, and each one needs different kinds of testing:

1. Admission Controller (cmd/kyverno)
This is the main webhook handler. I traced through the Validate() flow in pkg/webhooks/ resource/handlers.go while working on PR #14812 (the context propagation bug). It pulls policies from the cache, runs enforce rules synchronously, and then kicks off audit evaluation async in a goroutine pool:

// this is the main entry point in handlers.go (around line 112) func (h *resourceHandlers) Validate(
ctx context.Context, ..., ) handlers.AdmissionResponse { policies, mutatePolicies, generatePolicies,
_, auditWarnPolicies, err := h.retrieveAndCategorizePolicies(
ctx, logger, request, failurePolicy, false) vh := validation.NewValidationHandler(
logger, h.kyvernoClient, h.engine, h.pCache, ...) ok, msg, warnings, enforceResponses =
vh.HandleValidationEnforce( ctx, request, policies, ...)
// audit runs async in goroutine pool go h.auditPool.Submit(func() {
auditCtx, cancel := context.WithTimeout( context.Background(), 30*time.Second)
defer cancel() auditResponses :=
vh.HandleValidationAudit(auditCtx, request)

## Chainsaw E2E tests 950+ (continued)

}) }
2. Background Controller (cmd/background-controller)
This one processes generate/mutate UpdateRequest resources async. I got fairly deep into it while writing the UpdateRequest state transition tests (PR #14979). The constructor takes 27 parameters, which makes it one of the trickiest parts to set up for integration testing.
3. Reports Controller (cmd/reports-controller)
This runs the background scan. The main logic lives in pkg/controllers/report/background/ controller.go. It loads policies, filters them, and evaluates them against existing cluster resources to generate compliance reports. I haven't tested this one directly yet, but it shares a lot of the same informer wiring as the background controller.
Key Subsystem: Policy Cache
I spent the most time on the policy cache. It's at pkg/policycache/cache.go and stores policies indexed by type (ValidateEnforce, ValidateAudit, Mutate, etc.) and GVR. In Get-Policies(), when you query for audit policies, it also pulls in enforce policies. A single policy can have mixed per-rule failure actions, so you need both:
// cache.go around line 47 -notice the enforce->audit fallback func (c *cache) GetPolicies(
pkey PolicyType, gvr schema.GroupVersionResource, subresource string, namespace *corev1.Namespace, ) []kyvernov1.PolicyInterface { var result []kyvernov1.PolicyInterface result = append(result,
c.store.get(pkey, gvr, subresource, "")...) if namespace != nil {
result = append(result, c.store.get( pkey, gvr, subresource, namespace.Name)...)
} if pkey == ValidateAudit {
result = append(result, c.store.get( ValidateEnforce, gvr, subresource, "")...)
if namespace != nil { result = append(result, c.store.get(ValidateEnforce, gvr, subresource, namespace.Name)...)
} } if pkey == ValidateAudit || pkey == ValidateEnforce {
result = filterPolicies(pkey, result, namespace) } return result }
I spent a while figuring this out: a policy is stored under one category based on whether any rule is enforce (see store.go:183--184). So mixed enforce/audit rules end up under Validate-Enforce, and audit-only rules are only reachable through that fallback above. This is exactly the kind of behavior I want to cover with integration tests, because it's easy to break with a one-line change.
Existing Fake Handler Pattern (The Blueprint)
When I was looking for how to wire everything together for integration tests, I found pkg/web-hooks/resource/fake.go. It shows how all of Kyverno's components connect to each other. My plan is to follow the same wiring but swap fake.NewSimpleClientset() with clients backed

## Chainsaw E2E tests 950+ (continued)

by a real envtest API server:
// fpukng/cwNeebwhFoaokesH/arnedsloeursc(e/fake.go
ctx context.Context, policyCache policycache.Cache, ) *resourceHandlers { client := fake.NewSimpleClientset() informers :=
kubeinformers.NewSharedInformerFactory(client, 0) informers.Start(ctx.Done()) kyvernoclient :=
fakekyvernov1.NewSimpleClientset() kyvernoInformers :=
kyvernoinformers.NewSharedInformerFactory( kyvernoclient, 0)
dclient := dclient.NewEmptyFakeClient() // ...rest of the wiring for resourceHandlers }
What envtest Gives Us
controller-runtime/pkg/envtest gives you a real API server + etcd running locally and it boots in a couple of seconds. Kyverno already has it as a dependency (v0.23.1 in go.mod), so there's nothing new to add. Take the same wiring from fake.go, point the clients at the envtest API server instead of in-memory fakes. Real Kubernetes behavior, no cluster. I already tried this out in PR #15142 (draft). It boots envtest, installs Kyverno CRDs, and runs ClusterPolicy CRUD + namespace isolation tests. All 4 tests pass in under 30 seconds, no cluster needed.
Phase 1: Framework Foundation (Weeks 1-3)
I already have a working PoC (PR #15142), so the first three weeks are about turning that into a proper reusable framework.
- Set up the test/integration/framework/ directory structure - Expand the PoC to register all Kyverno API types (kyvernov1, kyvernov2, reportsv1,
policiesv1beta1) and install all 22 CRDs across all 4 directories - Build informer startup wrappers with WaitForCacheSync() - Write 5-8 foundational integration tests for CRD CRUD operations - Add make test-integration target to the Makefile - Write setup docs in test/integration/README.md
Milestone: make test-integration passes in -10 seconds, no cluster needed.
Phase 2: Policy Processing Tests (Weeks 4-6)
With the framework in place, I can start testing the actual policy evaluation pipeline with real informers instead of stubs.
- Week 4, Policy Cache: Wire PolicyCacheController with real envtest informers instead of the hardcoded TestResourceFinder stub. Write 6+ tests for cache population, eviction, that mixed enforce/audit lookup I described above, and namespace-scoped indexing.
- Week 5, Validation: Wire the engine (pkg/engine/engine.go) to envtest for real context resolution. Test enforce blocking, audit allowing, ConfigMap context loading, namespace isolation, PolicyExceptions, and CEL-based ValidatingPolicy evaluation.
- Week 6, Mutation: Test strategic merge patch, JSON patch (RFC 6902), conditional

## Chainsaw E2E tests 950+ (continued)

mutation with preconditions, foreach over containers, and mixed validate+mutate policies. Milestone: Full policy evaluation pipeline (cache engine result) tested without any cluster. Should be around 20 integration tests by this point.
Phase 3: Controller & Advanced Tests (Weeks 7-9)
This is the hardest phase. I'm going after the controller reconciliation loops, background scan behavior, and the edge cases I've been finding in my bug-fix PRs.
- Week 7, Background Scan Controller: NewController() takes 27 parameters including 15+ informers, so I'll build incrementally. The good news is the controller already nil-checks unused informers (controller.go:169--198), so I can pass nil for the ones I don't need yet. Tests: ephemeral report generation, non-background policy skipping, policy update re-reconciliation, report cleanup on resource deletion.
- Week 8, Webhook Handlers: Configure envtest WebhookInstallOptions to register Kyverno's validating/mutating webhook configurations. Test end-to-end enforce rejection, audit allowing with async reporting, mutate patching, policy cache integration, and excluded-namespace skipping.
- Week 9, Exceptions & Regressions: PolicyException matching and namespace isolation, that namespace-scoped enforce/audit edge case I mentioned (cache.go:57--61), failure-ActionOverrides, auto-gen rules for Deployment/DaemonSet/StatefulSet, concurrent policy create/delete cache consistency.
Milestone: Full controller lifecycle tested. Should be at 40+ integration tests total. Heads up: Webhook tests depend on envtest webhook support, which can be flaky. If I get blocked here, I'll focus on engine-level tests (same logic underneath) and treat webhooks as a stretch goal.
Phase 4: CI, Migration & Documentation (Weeks 10-12)
Last three weeks are about making everything production-ready so other contributors can actually use it.
- Week 10, CI/CD Pipeline: Add an integration-tests job to .github/workflows/ tests.yaml. Cache the envtest binary via actions/cache, set up separate Codecov coverage flags, and make tests parallel with t.Parallel() and namespace isolation.
- Week 11, Chainsaw Migration: Pick 8-12 representative Chainsaw tests and migrate them (3 from validate/, 2 from mutate/, 2 from exceptions/, 1-2 from reports/, 1- 2 from background-only/). Write before/after guides (Chainsaw YAML Go integration test) as migration templates for other contributors.
- Week 12, Documentation & Hardening: Write test/integration/README.md and CONTRIBUTING.md. Harden the framework: context.WithTimeout on all API calls, retry logic for envtest flakiness, golangci-lint compliance, -race flag verification.
Milestone: Production-ready framework running in CI, with docs so anyone can write new integration tests. Final count: 45-55 integration tests.

## Weeks 1-3

Tests Key Deliverable 5-8 test/integration/framework/ + make test-integration
17-20 Cache + validation + mutation integration tests 15+ Background scan, webhook, exception, regression
tests 8-12 CI pipeline, migration guide, documentation 45-55 Production-ready integration test framework

Target Metrics
- CI time for integration tests: -30 seconds (vs 30-60 min for Chainsaw E2E) - Framework startup: -2 seconds (envtest boot + CRD install) - Per-test overhead: -100 ms - Coverage improvement: Cover more controller/webhook code paths than before

Risks & Mitigation

Risk
Background controller has 27 constructor params
envtest webhook support is flaky
envtest binary download slow in CI
CRD schema changes during mentorship
PoC PR #14869 overlaps

## Phase 3 Week 8 delays

Engine-level tests cover same logic; webhooks are stretch goal
Cache via actions/cache with version-pinned key

Tests break

CRDs auto-generated by controller-gen; make test-integration always uses latest

Merge conflicts

Build on it if merged; my Phase 1 delivers the same foundation independently

Personal risks:
- Timezone: Based in IST, happy to adjust meeting times for my mentor's schedule. - Exams: No major conflicts expected; I'll notify my mentor two weeks in advance and
front-load work if anything comes up.

What I Hope to Get Out of This Mentorship

I'm fully committed. 45-50 hours per week, with weekly 30-minute syncs, async Friday updates, and small reviewable PRs (1-2 per week).

I plan to stick around after the 12 weeks. Specifically: - Keep contributing to Kyverno. I have 19 merged PRs and 10 open right now, and I don't see that slowing down. 10 - Own the integration test framework long-term, improve it, and help other contributors write tests using it. - Help new contributors. I remember how intimidating the codebase was when I started. I want to make that easier for others. - Get better at systems engineering: testing distributed controllers, designing frameworks used by 100+ contributors, learning CI/CD at scale.
I have a one-line fix sitting in a branch right now, waiting for Chainsaw. I want to run make test-integration and know in 10 seconds. That's what I'm building.
[name removed] GitHub: [handle removed] -- Email: [email removed]
