---
id: reference-kthena-autoscaling
title: Example LFX proposal: Kthena HPA/KEDA autoscaler integration (Volcano, CNCF)
kind: reference
tags: kthena, volcano, autoscaling, hpa, keda, controller, go, kubernetes, proposal example
sources: Reference proposal shared by the OpenSourceX owner (personal details removed)
---

## Overview

Kthena HPA/KEDA Autoscaler Integration
Mentors: [name removed], [name removed] GitHub: volcano-sh/kthena
Name and Contact Information

How I Found Kthena & This Project

I found Kthena a few months back while looking through Volcano's repos on GitHub. The architecture caught my attention pretty quickly--role-based pod management, state machines handling scale-down protection, a custom autoscaler working with the scheduler. It was the kind of system that looked complex but interesting enough to dive into.
Started small with bug fixes, then moved to bigger stuff. Fixed a data race in the ServingGroup datastore (#713), debugged a panic in the scheduler when prefill pods went missing (#714), got scale-down protection working again by fixing how role states transition (#706). When I saw this HPA/KEDA integration project listed, it just made sense--I'd already been working in the autoscaler code, dealing with state validation, fixing controller bugs. This felt like a natural next step.
Why I Want to Work on This

Here's the thing: Kthena's autoscaler works fine, but it doesn't play nice with HPA or KEDA. And that's a problem. I've seen people ask about this on Slack and in GitHub issues. They want what Kthena offers--the disaggregated serving model, smart scheduling, proper scale-down protection. But most teams are already using HPA for basic CPU scaling or KEDA for queue-based stuff. Making them choose between Kthena and their existing setup just creates friction they don't need. The technical part is what makes it interesting though. How do you let HPA or KEDA tell you "scale to 5 replicas" while still keeping Kthena's safety checks? HPA has no idea about role states. It doesn't know when pods are stuck in Pending or just transitioned to Running. Can't enforce that 2-minute stability window before allowing scale-down. That's where the integration logic comes in-- take the external scaling request, validate it against what Kthena knows about pod states, then decide if it's actually safe to apply. I like working on Kthena. The codebase is complicated but not messy. Maintainers respond quickly and are pretty helpful when I have questions. And this integration gap is real--fixing it would actually unblock people who want to use Kthena but can't justify abandoning their autoscaling setup.
Why I'm a Good Fit for This

## Overview (continued)

I'm [name removed], based in India. Been spending the last few months deep in Kthena's code--mostly fixing bugs and learning how the autoscaling and scheduling pieces work when things go wrong. So far I've got 10 merged PRs (5 critical fixes + 5 improvements), with 3 cherry-picked into release branches. Currently have 6 PRs open in review.
Once I start something, I complete it anyhow. Even if it's beyond my capability, then the only focus is to get the job done. That's how I approached every bug in Kthena--didn't stop until it was fixed and tested properly.

3 PRs That Show I Can Do This

PR #706 Role state bug
#714 Scheduler panic
#723 Math bug

What I Fixed
Roles weren't transitioning to Running even when all their pods were ready. This completely broke scale-down protection--the au-toscaler couldn't tell healthy roles from failing ones. I added the missing state update in handleReadyPod and wrote tests to make sure it works.
PD scheduler was crashing with "index out of range" when scoring returned zero results. Happened during normal K8s stuff--pod evictions, cache going stale. I added a bounds check so it logs and skips instead of panicking. The LeastRequest.Score function was dividing by zero when all pods were idle, giving NaN scores. Fixed it with a simple guard--if all pods have the same load, they get the same score.

Why It Matters Here This is exactly the validation pattern HPA needs. When HPA says "scale down," we check: are the roles even safe? If Pending/Termi-nating block. If just became Running wait for stability. I already built this exact logic.
HPA/KEDA metrics can disappear or lag. Prometheus goes down. Metrics-server gets behind. Controllers need to handle missing data without falling over. This PR shows I know how to build that resilience. Autoscaling is just math with metrics. HPA will hit edge cases-- zero CPU, equal load, traffic drops. Integration has to handle these boundary conditions correctly.

## PR #738 #723 #714 #706 #703 #697

Description Don't delete ServingGroup when pod lookup fails Fix divide-by-zero in LeastRequest scoring Fix scheduler panic when no prefill pods Fix role state transitions (scale-down protection) Fix nil panic when NetworkTopology removed Fix pods not recovering after controller restart

Open PRs (6)

PR #754 #739 #734 #733 #730 #727

Description Add mutex protection for PodInfo metrics Fix PD scheduler silent failures Prevent phantom autoscaler history entries Add narrow accessor for ServingGroup revision Fix router dropping tombstone delete events Fix router panic with zero model weights

Status Merged Merged Merged Merged Merged Merged
Status Open Open Open Open Open Open

## What I Know

- Go -- It's what I use for everything now, all my contributions and side projects - Kubernetes internals -- Controllers, informers, CRDs, reconciliation loops. Learned most of this
by fixing bugs in Kthena - Debugging distributed systems -- Race conditions, state machines that break, caches that get
out of sync, schedulers that panic 4 - Controller patterns -- Debugged and fixed issues in webhooks, background controllers,
recon-cilers
The Plan -- 12 Weeks

What's the Problem
Kthena has its own autoscaler but it doesn't work with HPA or KEDA. That blocks adoption.

What Teams Want Use HPA for CPU/memory scaling Use KEDA for event-driven stuff Keep their existing autoscaling

What They Get Now Have to use Kthena's custom autoscaler No KEDA support at all Have to throw it away and switch

People have to choose: Kthena's features OR their autoscaling tools. That's not great. The fix is to let HPA/KEDA provide the scaling intent ("go to 5 replicas"), have Kthena validate it's safe (check role states, stability), then apply the change.
Handling Conflicts: HPA vs Kthena Autoscaler
Quick answer: when you enable HPA integration (autoscaling.enabled=true), Kthena's built-in autoscaler steps aside for that ServingGroup. No race conditions, no fighting over replicas. Here's how it works: the existing autoscaler checks if spec.autoscaling.enabled is true. If yes, it skips that ServingGroup entirely and lets HPA make the decisions. If false or not set, it works exactly like it does today. Clean separation--one controller per ServingGroup, user picks which one. Why this design? Trying to run both simultaneously gets messy fast. HPA says "scale to 3" based on CPU, Kthena says "scale to 5" based on queue depth--who wins? Rather than building complicated arbitration logic, just let teams choose. If someone wants both CPU and queue-based scaling, they can use KEDA with multiple triggers instead. Edge case: if you manually run kubectl scale, the webhook catches it and applies the same safety checks (role states, stability windows). So you can't accidentally bypass protection by going around HPA.
How Kthena's Autoscaler Works Now
The Model Serving Controller handles autoscaling. Scale-down protection depends on tracking role state correctly:
Listing 1: From my PR #706 fix
// pkg/model-serving-controller/controller.go
func (c *controller) handleReadyPod(...) {

## What I Know (continued)

roleReady , err := c.checkRoleReady(...) if err != nil {
klog.Warningf("Failedtocheckreadiness:%v", err) } else if roleReady {
currentState := c.store.GetRoleStatus(...)
// This was the bug - state never updated to Running
if currentState != RoleRunning && currentState != RoleDeleting { c.store.UpdateRoleStatus(..., RoleRunning)
} } }

Roles go through states: Creating Running Deleting. You can only safely scale down when roles are in Running and have been stable for 2+ minutes.
HPA doesn't know any of this. It just looks at CPU and calculates "need 3 replicas" without checking if those pods are actually stable or still starting up. That's the gap we're filling.

Technical Design
HPA Integration
Step 1: Update the CRD
// apis/serving/v1alpha1/types.go
type ServingGroupSpec struct {
// ... existing stuff
"`Autoscaling *AutoscalingSpec `json:"autoscaling ,omitempty }

type AutoscalingSpec struct {

## Enabled

bool

"``json:"enabled

HPARef

"`string `json:"hpaRef,omitempty

MinReplicas int32

"``json:"minReplicas

MaxReplicas int32

"``json:"maxReplicas

}

It's opt-in. If you don't set autoscaling.enabled or set it to false, nothing changes. What this looks like in practice:

Listing 2: User workflow example

apiVersion: serving.volcano.sh/v1alpha1 kind: ServingGroup

metadata:

name: my-llm-service spec:

replicas: 3

autoscaling:

enabled: true

hpaRef: llm-hpa

minReplicas: 2

maxReplicas: 10

--apiVersion: autoscaling/v2

kind: HorizontalPodAutoscaler

metadata:

name: llm-hpa spec:

scaleTargetRef:

apiVersion: apps/v1

kind: Deployment

name: my-llm-service

# Targets the Deployment Kthena creates

minReplicas: 2

maxReplicas: 10 metrics: - type: Resource
resource: name: cpu target: type: Utilization averageUtilization: 70

Key detail: HPA targets the Deployment (created by Kthena), not the ServingGroup directly. The HPAReconciler watches HPA changes and updates ServingGroup.Spec.Replicas, which then triggers Kthena's normal reconciliation.
Step 2: HPA Controller

// pkg/controllers/autoscaling/hpa_controller.go
func (r *HPAReconciler) Reconcile( ctx context.Context , req ctrl.Request) error {

sg := &servingv1alpha1.ServingGroup{} if err := r.Get(ctx, req.NamespacedName , sg);
err != nil { return err
}

// Skip if HPA isn't enabled

if sg.Spec.Autoscaling

== nil ||

!sg.Spec.Autoscaling.Enabled {

return nil

}

// Get the HPA object
hpa := &autoscalingv2.HorizontalPodAutoscaler{} if err := r.Get(ctx, types.NamespacedName{
Name: sg.Spec.Autoscaling.HPARef, Namespace: sg.Namespace , }, hpa); err != nil { return err }

desiredReplicas := hpa.Status.DesiredReplicas

// Check if it's actually safe to scale right now

if !r.canScale(sg, desiredReplicas)

{

return nil // not safe yet, we'll retry

}

sg.Spec.Replicas = desiredReplicas return r.Update(ctx, sg) }

Step 3: Validation with Observability
// Same pattern from PR #706, extended for HPA
func (r *HPAReconciler) canScale( sg *ServingGroup , desired int32) bool {
// Don't scale if any role is transitioning
for _, role := range sg.Status.Roles { if role.State == "Pending" || role.State == ""Terminating{ klog.V(3).Infof( "Can'tscale:role%sisin%s", role.Name, role.State)

## Enabled (continued)

// Users see why scaling blocked in kubectl describe
r.recorder.Event(sg, "Warning", "ScalingBlocked", fmt.Sprintf("Role%sin%s", role.Name, role.State))
return false } }
// Scale-down needs extra checks
if desired < sg.Status.Replicas { for _, role := range sg.Status.Roles { timeSinceTransition := time.Since(role.LastTransitionTime) if timeSinceTransition < 2*time.Minute { klog.V(3).Infof( "Role%sonlystablefor%v,waiting", role.Name, timeSinceTransition)
""r.recorder.Event(sg, Warning", ScalingDelayed", fmt.Sprintf("Role%sstable%v", role.Name, timeSinceTransition))
return false } } }
return true }
Added: Events so kubectl describe servinggroup shows why scaling is blocked. HPA retries every 15 seconds automatically, so blocked requests get retried until safe. Step 4: Webhook for Direct Scale Requests
// pkg/webhooks/servinggroup_scale_validator.go
func (v *ServingGroupScaleValidator) ValidateScale( ctx context.Context , oldObj, newObj *ServingGroup ,
) error { if newObj.Spec.Replicas == oldObj.Spec.Replicas {
return nil // no change, allow it
}
// For scale-down, check role states
if newObj.Spec.Replicas < oldObj.Spec.Replicas { for _, role := range oldObj.Status.Roles { if role.State != "Running" { return fmt.Errorf( "can'tscaledown:role%sis%s,notRunning", role.Name, role.State) } }
}
return nil }
Files I'll work on: - pkg/controllers/autoscaling/hpa controller.go (new)
- pkg/webhooks/servinggroup scale validator.go (new)
- apis/serving/v1alpha1/types.go (extend)

KEDA Integration
KEDA works through "external scalers"--basically a gRPC service it calls to check if it should scale:
// pkg/keda/external_scaler.go
type KthenaExternalScaler struct { client client.Client
}
// Tells KEDA if this scaler should be active right now
func (s *KthenaExternalScaler) IsActive( ctx context.Context , scaledObject *keda.ScaledObjectRef ,
) (*keda.IsActiveResponse , error) { sg := &servingv1alpha1.ServingGroup{} err := s.client.Get(ctx, types.NamespacedName{ Name: scaledObject.ScaleTargetRef.Name, Namespace: scaledObject.Namespace , }, sg) if err != nil { return &keda.IsActiveResponse{Result: false}, err }
// Only say "active" if all roles are Running // This stops KEDA from scaling during startup
allRunning := true for _, role := range sg.Status.Roles {
if role.State != "Running" { allRunning = false break
} }
return &keda.IsActiveResponse{Result: allRunning}, nil }
// Returns current metric values
func (s *KthenaExternalScaler) GetMetrics( ctx context.Context , req *keda.GetMetricsRequest ,
) (*keda.GetMetricsResponse , error) { sg := &servingv1alpha1.ServingGroup{} err := s.client.Get(ctx, types.NamespacedName{ Name: req.ScaledObjectRef.ScaleTargetRef.Name, Namespace: req.ScaledObjectRef.Namespace, }, sg) if err != nil { return nil, err }
// Kthena populates sg.Status.Metrics from its collectors // KEDA queries: kthena_queue_depth , kthena_request_rate , etc
metricValue := sg.Status.Metrics[req.MetricName] if metricValue == 0 {
klog.V(3).Infof("Metric%snotfound,returning0", req.MetricName)
}
return &keda.GetMetricsResponse{ MetricValues: []*keda.MetricValue{{ MetricName: req.MetricName , MetricValue: metricValue , }},
}, nil }

## Enabled (continued)

Metrics come from ServingGroup.Status.Metrics which Kthena's existing collectors populate. KEDA can also query Prometheus directly if needed--Week 8 will test both approaches. New files for KEDA:
- pkg/keda/external scaler.go - pkg/keda/server.go - cmd/keda-scaler/main.go - manifests/keda-external-scaler.yaml
Week-by-Week Breakdown
Phase 1 -- HPA Foundation (Weeks 1-3) Goal: Build the basic HPA integration -- CRD extension, controller setup, validation framework. - Create pkg/controllers/autoscaling/ directory structure - Extend the ServingGroup CRD with AutoscalingSpec (enabled, hpaRef, minReplicas,
maxRepli-cas) and register schema - Build HPAReconciler controller with canScale() validation - Write 8-10 foundational integration tests for CRD operations - Add make test-autoscaling target to the Makefile - Document setup in docs/autoscaling/HPA.md
Milestone: make test-autoscaling passes in <2 seconds, basic HPA scaling works.
Phase 2 -- Safety Validation (Weeks 4-6) Goal: Implement state-aware validation -- role state checks, stability windows, scale-down protection. - Week 4 -- Role State Validation: Wire canScale() with role state checks, blocking scale
requests during Pending/Terminating states. Write 6+ validation tests covering role transitions, namespace-scoped indexing. - Week 5 -- Stability Windows: Implement 2-minute stability check for scale-down operations. Test edge cases: rapid metric changes, pod crashes during stability window, conflicting HPA/manual scale requests. - Week 6 -- Admission Webhook: Build webhook validator to catch direct kubectl scale commands, enforce validation at API level. Test end-to-end enforcement, webhook failure scenarios, certificate rotation.
Milestone: Full validation pipeline (HPA canScale webhook) blocks unsafe scaling. Cumulative: 20 integration tests.
Phase 3 -- KEDA External Scaler (Weeks 7-8) Goal: Implement KEDA integration -- gRPC server, metric queries, active state management. - Week 7 -- gRPC Server: The core piece -- implement KthenaExternalScaler with IsActive()
and GetMetrics() methods. Strategy: start with role state checking, then add metric queries from Kthena's internal collectors. Test with mock KEDA client, verify gRPC protocol compliance. - Week 8 -- KEDA Integration: Wire the external scaler with actual KEDA ScaledObjects. Configure deployment manifests, test with Prometheus metrics, verify metric value accuracy. Add fallback handling when metrics unavailable.
Milestone: KEDA successfully triggers Kthena scaling based on external metrics. Cumulative: 35+ integration tests.

## Enabled (continued)

Note: KEDA tests depend on ScaledObject support, which may need cluster setup. If blocked, will test with KEDA mocks and document manual verification steps.
Phase 4 -- Hardening & Documentation (Weeks 9-12)
Goal: Production-readiness -- chaos testing, edge case coverage, documentation.
- Week 9 -- Chaos Testing: Test controller behavior during failures -- Prometheus down, metrics-server lag, pod evictions during scaling, network partitions. Auto-handle metric gaps with exponential backoff.
- Week 10 -- Race Conditions: Fix any race conditions between HPA and Kthena autoscaler. Test concurrent scale requests, metric update races, cache staleness scenarios. Add rate limiting if needed (100 req/min per ServingGroup).
- Week 11 -- Documentation: Write docs/autoscaling/INTEGRATION.md with step-by-step setup guide, troubleshooting runbook, migration path from custom autoscaler. Add example YAMLs for common use cases.
- Week 12 -- CI & Polish: Integrate tests into CI pipeline (.github/workflows/autoscaling.yaml), add coverage reporting, fix linter warnings. Framework hardening: proper error messages, logging levels, metrics collection.

Milestone: Production-ready integration, fully tested and documented. Cumulative: 55-60 integration tests.
Testing Strategy
Tools: Go native testing + controller-runtime/envtest for real API server without full cluster. All tests run with go test -race to catch concurrency bugs. Example tests (Week 4):
- TestHPAReconciler BlocksScaleDown WhenRolePending - TestCanScale EnforcesStabilityWindow - TestWebhook RejectsDirectScale WhenRoleNotRunning
Integration test approach: Create ServingGroup with autoscaling.enabled=true, create mock HPA with DesiredReplicas=5, simulate role state transitions (Pending Running), verify HPARec-onciler blocks/allows based on state, check events emitted correctly.
Timeline Summary

## Tests 8-10

Key Deliverable pkg/controllers/autoscaling/ + basic HPA scaling State validation + webhook + scale-down protection gRPC external scaler + KEDA integration Chaos tests + docs + CI integration Production-ready HPA/KEDA integration

Target Metrics
- HPA decision latency: <500ms (validation + role state check + apply) - KEDA response time: <100ms for IsActive() and GetMetrics() calls - Test coverage: 80%+ on new autoscaling code paths - Integration test speed: <2 minutes for full suite (vs 5+ min for E2E)

What Could Go Wrong

Risk

Impact

KEDA's gRPC protocol is Weeks 7-8 take

harder than expected

longer

Webhook setup gets tricky Testing delays

## Bugs after merge Can't merge

How I'll Handle It Start reading KEDA docs in week 1, look at their example scalers, budget extra time Test the validation logic at the engine level first, treat webhook as a stretch goal if needed
Do chaos testing in weeks 9-10, start collecting edge cases early Make it opt-in and disabled by default, write extensive tests, roll out slowly

Personal stuff:
- Timezone: I'm in India (IST) but can adjust meeting times - Exams: Don't have any major conflicts, I'll give 2 weeks notice if something comes up

What I Want Out of This

I'm fully committed -- 25-30 hours per week, with weekly 30-minute syncs, async Friday updates, and small reviewable PRs (1-2 per week). This isn't ending at 12 weeks for me though. What I actually want:
- Keep contributing to Kthena -- I've already got 16 PRs, I'm not planning to stop - Own this integration -- Maintain it, improve it, help people use it - Help new contributors -- The codebase was confusing when I started, want to make it easier for
the next person - Get better at systems work -- Learn more about building distributed controllers, designing
frameworks, making things production-ready
I want the HPA/KEDA integration to actually get used long-term. Not just merge it and forget about it.
What I Haven't Done Before

Being real about the gaps:
KEDA external scaler: I get the concept, read about how it works, but haven't actually built one. Going to need to dig into the gRPC protocol and look at their reference implementations. That's why I'm budgeting extra time in weeks 7-8. Admission webhooks: Understand the pattern, debugged webhook issues before, but never written one from scratch. Plan is to follow how Volcano does it in their existing webhooks and test the hell out of it. What I'm solid on: Controllers, reconciliation, state machines, CRDs--worked with all of these. The learning curve is in the KEDA and webhook specifics, not the overall architecture. The 12-week plan is based on code I've already read, patterns I've already used, problems I've already seen. I want to build this because I know it's needed and I'm ready to actually do it.

## Bugs after merge Can't merge (continued)

[name removed]

GitHub: [handle removed] Email: [email removed]
