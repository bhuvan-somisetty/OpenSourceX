---
id: reference-gittuf-tui
title: Example LFX proposal: gittuf TUI enhancement and temporary approvals (OpenSSF)
kind: reference
tags: gittuf, openssf, security, tui, bubbletea, go, proposal example
sources: Reference proposal shared by the OpenSourceX owner (personal details removed)
---

## Overview

LFX 2026 Proposal: gittuf
TUI Enhancement and Temporary/Time-Limited Approvals
Organization:OpenSSF | Project:ImprovegittufUI/UX andEnableTemporaryApprovals Difficulty: Medium | Upstream: github.com/gittuf/gittuf
Table of Contents
1. About Me 2. Abstract 3. Detailed Project Description
3.1 Background: gittuf Architecture 3.1.2 Reference State Log (RSL) 3.1.5 Current CLI Structure 3.2 Current TUI State Analysis
3.2.1 Screen Inventory 3.2.2 Architecture Strengths 3.2.3 Identified Gaps 3.3 Temporary Approvals: Requirements Analysis 3.3.1 Use Case: Emergency Security Patch 3.3.2 Use Case: Deferred Review 3.3.3 Design Constraints

4. Proposed Solution
4.0 Pre-Work: Proof of Concept 4.1 Workstream 1: TUI Enhancement
4.1.1 New Screen Architecture 4.1.2 Dashboard Screen 4.1.3 RSL Viewer 4.1.4 Verification Screen 4.1.5 Visual Design System -Color Palette 4.2Temporary / Time-Limite Approvals 4.2.1 Attestation Type: TemporaryReferenceAuthorization 4.2.2 Policy Extensions - New Fields 4.2.3 Verification Logic - Three-Phase Flow 4.2.4 TUI Integration - Attestation Badges States 4.2.5 Storage and Indexing - Query Methods
5. Testing Strategy
5.1 TUI Testing Approaches
5.2 Temporary Approval Testing 5.3 CLI commands refrences
6. Timeline and Milestones 7. Risk Analysis and Mitigation 8. Deliverables Summary 9. Communication Plan 10. Why I Am a Good Fit 11. References

1. About Me

## Field Name Email GitHub Degree Year Focus Timezone

Details [name removed]
[email removed] [handle removed]
B.Tech Computer Science (AI & ML)( Undergraduate (current) Software Engineering, System Programming IST (UTC+5:30)

1. How did you find out about our mentorship program? I came across this mentorship while browsing the LFX mentorship portal for Summer 2026. I was going through different projects and gittuf stood out to me because it combined security, Git internals, and developer tooling. I ended up spending quite a bit of time reading about it, which eventually led me to explore the repository and start contributing.
2. Why are you interested in this program? What attracted me most is that gittuf solves a real and important problem around repository security and trust. It is not just theoretical, it has practical implications for how developers work with Git. I am especially interested in improving the TUI because I enjoy building developer-facing tools and making them easier to use. This felt like a good opportunity to work on something meaningful while also improving my skills.
3. What experience and knowledge/skills do you have that are applicable to this program? I primarily work in Go and have experience building terminal applications using Bubbletea. I am comfortable with the Model Update View pattern, handling state, and designing user flows. I have also already explored the gittuf codebase, built a TUI POC, and contributed tests through a PR. Along with that, I have a basic understanding of Git internals and TUF concepts, which helps me understand how the system works beyond just the surface.

4. What do you hope to get out of this mentorship experience? I want to learn how to work closely with maintainers on a real open source project and understand how good design decisions are made in practice. I am also looking to improve how I write production level code, especially around usability and testing. More than anything, I want to grow into someone who can contribute consistently and take ownership of parts of a project over time.
2. Abstract
Gittuf is a security layer for Git repositories that enforces cryptographic security policies independent of hosting platforms like GitHub, GitLab, and Bitbucket. Built on The Update Framework (TUF) principles and in-toto attestations, gittuf provides a Reference State Log (RSL) that records the cryptographic history of all reference updates, enabling verifiable policy enforcement for any Git workflow.
This proposal addresses two areas that are critical for gittuf's adoption. First, the TUI: gittuf ships a basic TUI built on Charm's Bubbletea framework covering policy rules and global trust rules, but it lacks screens for RSL inspection, verification, attestation management, and repository initialization. Before writing this proposal, I built a working proof of concept that adds a full-width status bar, mode indicator, rounded screen borders, styled keybinding hints, empty state messages, and a dedicated help screen. The full mentorship work builds on this POC to complete the functional gaps and ship a TUI that can replace the CLI for day-to-day gittuf operations. Second, temporary/time-limited approvals: gittuf's current policy model requires approval thresholds to be met permanently with no mechanism for time-scoped exceptions. A critical security patch at 4 AM may need a single available developer to approve a change that normally requires the full team. This proposal introduces a new attestation type for temporary approvals with configurable expiry, deferred review tracking, and automatic policy re-evaluation when approvals expire.
3. Detailed Project Description
3.1 Background: gittuf Architecture
Understanding gittuf's architecture is essential for both workstreams. The system operates through several interacting components:

## Location

Description
Trusted principals, roles, threshold signatures. Supports schema versioning (v01, v02).
State struct with Metadata, ControllerMetadata, Hooks. Rules define protected namespaces with
principal IDs and thresholds.

Global Rules RSL
Attestations PolicyVerifier

internal/tuf/tuf.go internal/rsl/rsl.go
internal/attestations/ internal/policy/verify.go

Two types: threshold (N signatures) and block-force-pushes (prevent force pushes).
Append-only log at refs/gittuf/reference-state-log. Entry
types: ReferenceEntry, AnnotationEntry, PropagationEntry.
in-toto attestation framework. Reference Authorizations with targetRef, fromID, toID.
Stored in refs/gittuf/attestations.
Core verification: VerifyRef, VerifyMergeable. Walks RSL and evaluates rules using SignatureVerifier.

3.1.2 Reference State Log (RSL)
The RSL is an append-only log stored at refs/gittuf/reference-state-log. It records every reference update as a signed Git commit. Key entry types:
- ReferenceEntry: Records a ref update with fields: ref (target reference name), targetID (new commit/tree hash), and a sequential number. Each entry is a PEM-encoded block in a Git commit message. - AnnotationEntry: Attaches metadata to existing entries including messages and skip markers. When an entry is marked as skip, verification ignores it, which is useful for revocations.
- PropagationEntry: Records upstream repository state for federated/network repository setups, tracking upstreamRepository and upstreamEntryID.

3.1.5 Current CLI Structure gittuf's CLI is built on spf13/cobra . The command tree includes:

Command gittuf policy
gittuf trust
gittuf rsl gittuf attest gittuf verify-ref
gittuf verify-mergeable
gittuf clone gittuf sync
gittuf tui

Description Policy management: init, add-rule, remove-rule, list-rules,
apply, sign Root of trust management: init, add-principal,
remove-principal, add-global-rule RSL operations: record, annotate, skip, log
Create attestations: authorize Verify a reference against policy Check if a merge is policy-compliant
Clone with gittuf verification Synchronize gittuf metadata Launch the Terminal User Interface

## Location (continued)

3.2 Current TUI State Analysis
The existing TUI consists of 6 Go files implementing a Bubbletea application.
3.2.1 Screen Inventory The TUI defines 10 screens (model.go:29-40):

Screen screenLoading screenChoice screenPolicy

Description Spinner shown during async repo initialization Main menu with Policy and Trust options Sub-menu with View Rules option

screenPolicyRules
screenPolicyAddRule screenPolicyEditRule screenTrust screenTrustGlobalRules screenTrustAddGlobalRule screenTrustEditGlobalRule

List

of

policy

add/edit/delete/reorder

rules

with

Form: rule name, pattern, principal IDs, threshold

Pre-filled form for editing existing rules

## Pre-filled form for editing global rules

3.2.2 Architecture Strengths

Strength

Details

Async Initialization Separated Concerns Read-Only Mode

Heavy work deferred to loadRepoCmd() via Bubbletea commands, keeping UI responsive during startup. View rendering (view.go), state updates (update.go), policy ops (policyhelpers.go), trust ops (trusthelpers.go) cleanly separated. Automatically enters read-only mode when no signing key is available, preventing unauthorized modifications.

Reusable Components

Helper functions renderFormScreen, construction.

(initInputs, newMenuList, newDelegate, renderListScreen) enable consistent UI

3.2.3 Identified Gaps
Missing Screens (Critical): No RSL viewer: Users cannot inspect the reference state log through the TUI
 No verification screen: Cannot run verify-ref or verify-mergeable from the TUI No attestation management: Cannot create, view, or manage reference authorizations No repository initialization: Cannot run gittuf init or policy init from the TUI No principal management: Cannot add/remove signing keys through the TUI No sync/clone operations: Cannot synchronize gittuf metadata

UX Deficiencies: No breadcrumb navigation: Users lose track of where they are in the menu hierarchy

No status bar: No persistent display of repository name, policy state, signing key status
 No help overlay: No F1/? help showing available keybindings per screen No search/filter: Rule lists have filtering disabled (SetFilteringEnabled(false)) No confirmation for destructive actions beyond delete: No confirmation for rule
reordering No undo/redo: Changes are immediately staged with no way to revert within the TUI Limited color palette: Only 6 colors defined (view.go:17-22), no theming support No responsive layout: Lists don't adapt content density to terminal size
Visual Gaps: No borders or panels: Content floats without visual grouping No styled headers: Title style is plain bold white text No icons or Unicode indicators: No checkmarks, warnings, or status indicators No table view for rules: Rules are displayed as list items, not structured tables No syntax highlighting for patterns: Glob patterns not visually distinguished
3.3 Temporary Approvals: Requirements Analysis 3.3.1 Use Case: Emergency Security Patch
Scenario: A critical CVE is discovered at 4 AM. The policy requires 2 approvals from the security team (Alice, Bob, Charlie). Only Alice is available. Current behavior: Alice cannot approve the patch because the threshold of 2 is not met. Desired behavior: Alice can create a temporary approval that satisfies the policy for a limited duration (e.g., 24 hours), during which the patch can be merged and deployed. After expiry, the approval is no longer valid, and the change must be retroactively reviewed by a second team member.
3.3.2 Use Case: Deferred Review Scenario: A developer pushes a change to a feature branch that requires review. The reviewer is in a different timezone and will not be available for 8 hours. Current behavior: The change can be pushed but will fail verification until reviewed. Desired behavior: The change can be submitted with a pending review marker. It is not consumed by downstream processes until the deferred review is completed, but it does not block the repository's policy state.

## Pre-filled form for editing global rules (continued)

3.3.3 Design Constraints - Cryptographic Integrity: Temporary approvals must be cryptographically signed and verifiable, consistent with gittuf's security model. - Append-Only Compatibility: The RSL is append-only. Expired approvals cannot be deleted; they must be invalidated through additional entries or metadata. - Policy Transparency: Temporary approvals must be visible in the audit trail. It should be clear which changes were approved under emergency conditions. - Configurable Scope: Administrators should be able to control who can issue temporary approvals, for which refs, and with what maximum duration. - Backward Compatibility: Existing verification workflows must continue to work. Temporary approvals are an additive feature.
4. Proposed Solution
4.0 Pre-Work: Proof of Concept
Before writing this proposal, I spent time reading through the existing TUI code in internal/cmd/tui/ and running it locally to understand what was working and what was not. I then built a working proof of concept implementing several of the visual and structural improvements described in this proposal.

What the TUI looked like before
The original TUI had no status bar, no indication of which mode the user was in, no visual borders separating content from the terminal background, and plain unstyled text for keybinding hints. When there were no rules in the list, the screen just showed No items with no guidance on what to do next.
What I built in the POC

1. Full-Width Status Bar with Mode Indicator
Every screen now has a persistent status bar at the top showing the current screen name on the left and the current mode on the right. In edit mode the badge shows "EDIT MODE" in blue. In read-only mode it shows "READ ONLY" in a salmon/red color so it is immediately visible. Home Screen (READ ONLY mode):
Home Screen navigating to Trust:

## Pre-filled form for editing global rules (continued)

ViewSourceCode The status bar width is set dynamically based on the actual terminal width stored in the model, so it always fills the full terminal regardless of window size. This required adding width and height fields to the model struct and updating the WindowSizeMsg handler in update.go to store dimensions on every resize event.
2. Styled Keybinding Help Bar
The original help bar was plain unstyled text at the bottom of list screens. The POC replaces this with styled key-description pairs where each key is highlighted with a dark background and blue foreground, making it easy to scan available actions at a glance. Policy Operations Screen with styled help bar:

Trust Operations Screen with styled help bar:
ViewSourceCode TherenderStyledHelp() function takes a slice of key-description pairs and renders themas joined horizontal elements. A single renderActionHints() function

handles context-aware help bars for both Policy Rules and Trust Global Rules screens, keeping the logic DRY.
3. Rounded Screen Borders and Empty State Messages
Every content area now has a rounded border rendered using Lipgloss's RoundedBorder(). When a list is empty, instead of showing "No items.", the screen shows a meaningful empty state message centered in the content area telling the user exactly what to do next.
Policy Rules :- Empty State:
Trust Global Rules :- Empty State:

ViewSourceCode
4. Dynamic Terminal Size Handling
The original TUI used a hardcoded width of 80 for layout calculations. The POC fixes this by storing the actual terminal dimensions in the model and using them for all layout calculations, so the TUI renders correctly at any terminal size.
ViewSourceCode The WindowSizeMsg handler now stores msg.Width and msg.Height in the model. Inner list dimensions are calculated by subtracting border and padding space from the terminal dimensions, and all five list components are resized together on every terminal resize event.
5. Dedicated Help Screen
Pressing h on any screen now opens a dedicated help screen listing all available keybindings. The screen uses the same status bar and border structure as the rest of the TUI.
Help Screen:

## ViewSourceCode

Feature Full-width status bar with screen name READ ONLY / EDIT MODE badge Rounded borders on all content screens Styled keybinding help bar Empty state messages with guidance Dedicated help screen (h key)
Dynamic terminal size handling

Status Done Done Done Done Done Done
Done

Files Modified
view.go view.go view.go view.go view.go view.go, uo pdate.g model.go

4.1 Workstream 1:- TUI Enhancement 4.1.1 New Screen Architecture

, oupdate.g

Extend the screen enum (model.go) with the following new screens, bringing the total from 10 to approximately 22:-

Category Navigation RSL RSL RSL Verification Verification Attestation

Screen screenDashboard screenRSLLog screenRSLEntryDetail screenRSLAnnotate screenVerifyRef screenVerifyMergeable screenAttestations

Description
Repository overview: policy status, RSL head, signing key, recent activity Scrollable RSL entry list with entry type icons, ref names, timestamps Detailed view of a single RSL entry: signatures, ref, targetID, annotations Form to add an annotation to an RSL entry
Form + results: select a ref, run verification, display pass/fail with details
Form + results: check merge policy compliance List of reference authorizations with status (active, expired, pending review)

## Attestation Attestation Init Init Help

screenAttestCreate
screenAttestDetail
screenInit screenPrincipalManagem ent screenHelp

Form to create a new reference authorization Detailed view of an attestation: signers, ref, from/to, expiry Guided repository initialization wizard Add/remove/view signing principals
Full keybinding reference and TUI usage guide

4.1.2 Dashboard Screen
The dashboard replaces screenChoice as the landing screen after initialization. It provides an at-a-glance repository status using lipgloss panels:

Repository Status Panel:
Repo: my-project (refs/gittuf/policy) Policy: targets (3 rules, 2 global rules)

RSL Head: #47 (2025-04-05 14:23 UTC) Signing Key: [email removed] (ed25519) Mode: Read-Write
Implementation: The dashboard fetches data asynchronously using Bubbletea commands (similar to the existing loadRepoCmd pattern). RSL entries are loaded via rsl.GetLatestReferenceUpdaterEntry(), policy state via policy.LoadCurrentState(), and signing key status from the existing signer loading logic.
4.1.3 RSL Viewer
The RSL viewer is a scrollable list of RSL entries with rich formatting. Each entry displays the entry number, type icon, reference name, target ID, relative timestamp, and skip status.
RSL Entry Types

## Type

[R]

Reference

[A]

Annotation

[P]

Propagation

Description Standard reference entry pointing to a commit Human annotation attached to an entry Automatically propagated entry from upstream

Navigation Keybindings

Key
 j / k or /

Action Scroll through entries

Enter / a s

View entry detail Filter entries by ref name Add annotation to selected entry Mark entry as skipped (with confirmation)

4.1.4 Verification Screen The verification screen provides interactive policy verification in three steps.

Verification Flow Step
Step 1

Phase INPUT

Step 2

EXECUTION

Step 3

RESULTS

Verification Result Format

PASSED

Detail Text input for the target ref (with autocomplete from known refs) Spinner while PolicyVerifier.VerifyRef()
runs Styled PASS/FAIL display with full details
FAILED

## Found: 1 signature ([email removed])

4.1.5 Visual Design System :- Color Palette
The color palette is expanded from 6 to 12 to support a richer set of status indicators across all screens.

Name

Hex

Usage

Primary

#007AFF (Blue)

Interactive elements, selected items

Success

#28A745 (Green)

Verification passed, healthy status

Warning

#FFC107 (Yellow)

Temporary approvals, pending reviews

Error

#FF0000 (Red)

Verification failed, policy violations

Text

#FFFFFF (White)

Primary text

Subtext

#A0A0A0 (Light Gray)

Secondary text, hints

Muted

#555555 (Dark Gray)

Disabled items, timestamps

Border

#333333 (Very Dark Gray)

Panel borders

Accent 1

#9B59B6 (Purple)

RSL entries

Accent 2

#E67E22 (Orange)

## Footer

#11FF00 (Bright Green)

Status messages

4.2 Temporary / Time-Limited Approvals

4.2.1 Attestation Type:- TemporaryReferenceAuthorization Predicate Type:- "https://gittuf.dev/reference-authorization/temporary/v01" Predicate Fields

Field

Type

Description

targetRef

string

The reference being authorized (same as existing)

fromID

string

Previous state hash

toID

string

New state hash

expiresAt

string

RFC 3339 timestamp when the approval expires

reason

string

Human-readable justification for the temporary approval

deferredReview

boolean

Whether this change requires retroactive review

reviewDeadline

string

RFC 3339 timestamp by which deferred review must be completed

emergencyLevel

string

"critical", "high", "normal" - indicates urgency

4.2.2 Policy Extensions :- New Fields

## Description

allowTemporaryApprovals

boolean

Whether temporary approvals are permitted for this rule

maxTemporaryDuration

duration

Maximum allowed expiry duration (e.g., "24h", "72h")

temporaryThreshold

int

Minimum signatures for a

temporary approval (>= 1)

requireDeferredReview

boolean

Whether deferred review is mandatory for temporary approvals

deferredReviewDeadline

duration

Maximum time allowed for deferred review completion

Global Fields (RootMetadata) Field temporaryApprovalPrincipals

Type

Description

[]string

Principal IDs authorized to issue temporary approvals. If

empty, all rule principals can issue them.
4.2.3 Verification Logic :- Three-Phase Flow The PolicyVerifier is extended to handle temporary approvals in three phases.

4.2.4 CLI Commands
NewCLIcommandsfortemporary approvals:-

gittuf attest authorize-temporary \
--target-refrefs/heads/main \ --from-id abc1234 --to-id def5678 \ --expires-in 24h \ --reason "Critical CVE-2025-1234 patch"\ --deferred-review \ --emergency-level critical
gittuf attest review \
--target-refrefs/heads/main \ --from-id abc1234 --to-id def5678 (Createsapermanentauthorizationtosatisfydeferred review)
gittuf attest list-temporary \
--target-ref refs/heads/main \ --status active|expired|reviewed (Liststemporaryapprovalswithcurrentstatus)
gittuf verify-ref refs/heads/main --check-deferred-reviews (Verification that also reports deferred review status)

4.2.4 TUI Integration :- Attestation Badge States

## Condition

[ACTIVE]

Yellow

Countdown timer showing time until expiry

[EXPIRED]

Red

Strikethrough - approval has passed expiry

[REVIEWED]

Green

Deferred review has been completed

[OVERDUE]

Flashing Red

Review deadline has passed without completion

4.2.5 Storage and Indexing :- Query Methods

Method

Description

GetActiveTemporaryAuthorizations(refNam e)

Returns non-expired temporary approvals for the given ref

GetPendingReviews(refName)

Returns temporary approvals awaiting deferred review

GetExpiredUnreviewed(refName)

Returns expired temporary approvals without completed review

5. Testing Strategy
5.1 TUI Testing Approaches

Approach

## Unit Tests

Test individual components (helper functions, data formatting, style application) without the full Bubbletea runtime

Model Tests

Create a model with known state, send tea.KeyMsg/tea.WindowSizeMsg events via Update(), and assert resulting model state (screen transitions, field values, error messages)

Integration Tests

Use Bubbletea's teatest package to capture final View() output and
 assert content presence. Test full flow: initial load navigate add rule verify rule appears.

Golden File Tests Capture expected terminal output as golden files. Run TUI with known inputs, capture View() output, and compare against saved expectations.

5.2 Temporary Approval Testing

## Test Category

Scenarios Covered
NewTemporaryReferenceAuthorization(), Validate(), SetTemporaryReferenceAuthorization(),
GetActiveTemporaryAuthorizations() - verify structure, expiry, filtering
Standard verification still passes; expired approval does not satisfy; temporaryThreshold enforcement; maxTemporaryDuration enforcement;
deferred review completion; review overdue detection
 End-to-end: init repo create policy push create temp approval verify passes expiry verify fails. Deferred review flow. CLI integration
via exec.
Use github.com/jonboulle/clockwork (existing dependency) to inject a fake clock and control expiry behavior without real time delays

5.3 CLI Commands Reference

Command
gittuf attest authorize-temporary gittuf attest review
gittuf attest list-temporary gittuf verify-ref --check-deferred-reviews

Purpose
Create a temporary reference authorization with expiry, reason, and emergency level flags
Create a permanent authorization to satisfy a deferred review
List temporary approvals filtered by status: active | expired | reviewed
Verification that also reports deferred review status for audit purposes

6. Timeline and Milestones
Total duration: 12 weeks

Week 1-2: TUI Foundation :- Dashboard, Status Bar, Visual Design System
 Implement the visual design system: expanded color palette, Panel/StatusBar/Breadcrumb/Badge components
 Replace screenChoice with screenDashboard as the landing screen Add persistent status bar and breadcrumb navigation to all existing screens Enable filtering on rule list and global rule list screens Add help overlay (?) accessible from all screens Milestone: Existing TUI screens have new visual design, dashboard is functional 
Week 3-4: TUI :- RSL Viewer and Verification Screens
 Implement screenRSLLog with lazy-loading entry list, type icons, andfiltering Implement screenRSLEntryDetail with full entry details (signatures, annotations) Implement screenRSLAnnotate for adding annotations Implement screenVerifyRef and screenVerifyMergeable with async verification Write unit and model tests for all new screens Milestone: RSL inspection and verification fully functional in TUI
Week 5-6: TUI :- Attestations, Initialization Wizard, Principal Management
 ImplementscreenAttestations list with status badges ImplementscreenAttestCreate for reference authorization creation ImplementscreenInit (5-step initialization wizard) ImplementscreenPrincipalManagement for key management Write testsfor all new screens Milestone:TUI covers all major gittuf operations
Week 7-8:- Temporary Approvals :- Attestation Type and Policy Extensions
 DefineTemporaryReferenceAuthorization attestation type (v01) Implement NewTemporaryReferenceAuthorization() and Validate()

## Test Category (continued)

Extend Attestations struct with temporaryReferenceAuthorizations storage Extend policy model with temporary approval fields (allowTemporaryApprovals,
maxDuration, etc.) Write comprehensive unit tests for the new attestation type Milestone: Temporary approvals can be created, stored, and validated
Week 9-10:- Temporary Approvals :- Verification and CLI
 Extend PolicyVerifier with Phase 2 (temporary check) and Phase 3 (deferredreview) Implement new CLI commands: authorize-temporary, review, list-temporary Implement deferred review tracking and overdue detection Write verification tests covering all status paths (PASSED_TEMPORARY,
REVIEW_OVERDUE, etc.) Write CLI integration tests Milestone: Temporary approvals fully integrated into verification pipeline
Week 11-12 :- TUI Integration, Documentation, and Polish
 Integrate temporary approvals into TUI (attestation list badges, create form,dashboard pending reviews)
 Write TUI documentation: user guide with screenshots, keybinding reference Write temporary approval documentation: administrator guide, user guide, examples Final code review, address mentor feedback, polish edge cases Submit final PRs Milestone: All deliverables complete, documentation published
I am fullycommitted to dedicating 35-40 hours per week to this project throughout the mentorship period.Ihave planned my schedule to ensure consistent progress and active communication with mentors. There willbe a brief period towards the end of May due to my university end-semester exams, during which my availability may slightly reduce. However, I will plan my work in advance to minimize any impact and ensure continuity in progress.
Apart from that short period, I will be consistently available and focused on delivering high quality contributions.

Post Mentorship Commitment
1. Continue contributing to gittuf beyond the program
My goal is not limited to completing the Mentorship timeline. I plan to continue contributing to gittuf after the program, especially in areas like improving the TUI, expanding test coverage, and refining user workflows based on real feedback. 2. Long-term ownership of TUI improvements Since my proposal is focused on the TUI, I want to take long-term ownership of this area. This includes fixing issues, improving UX, adding missing features, and helping evolve the TUI into a stable and primary interface for users. 3. Improving testing and reliability I plan to continue working on expanding test coverage, particularly around user flows, edge cases, and stability. Reliable tests are important for long-term maintainability, and I want to keep contributing in this direction. 4. Helping new contributors get started Having gone through the onboarding process myself, I understand where new contributors struggle. I would like to help by improving documentation, writing guides, and assisting new contributors in the community. 5. Active participation in the community I will continue being active in discussions, Slack channels, and community meetings. Staying involved helps in understanding real user needs and aligning contributions with project direction. 6. Exploring deeper areas of the project Beyond the TUI, I am interested in contributing to other parts of gittuf such as policy verification, RSL workflows, and security-related features. This will help me grow as a contributor and add more value to the project. 7. Building in the open and sharing learnings
I plan to continue writing about my work and learnings around gittuf, similar to my blog post. This helps in spreading awareness and making the project more accessible to new developers.
7. Deliverables Summary

## TUI: Dashboard, persistent status

bar,

Navigation and Visual breadcrumb, expanded color palette, help

Design

overlay, filtering on all lists

D2

Enhanced TUI: New RSL viewer (log, detail, annotate), verification

Functional Screens screens, attestation management, init wizard,

principal management

D3

Temporary

Feature

Approvals New attestation type with expiry, policy

extensions,

extended

verification

(PASSED_TEMPORARY,

REVIEW_OVERDUE), deferred review

tracking

D4

CLI Commands for gittuf attest authorize-temporary, gittuf attest

Temporary Approvals review, gittuf attest list-temporary, gittuf

verify-ref --check-deferred-reviews

D5

Tests and Documentation TUI unit/model/integration tests, temporary

approval tests, TUI user guide, administrator

docs

8. Risk Analysis and Mitigation

## Low

compatibility with

Unicode and colors

Backward

Medium

compatibility

of

temporary approvals

Clock skew for Low expiry

Mitigation Use sub-model pattern where each
screen group is a separate Bubbletea model. Keeps each file under 200 lines.
Ugrsaecefulilpgloss AdaptiveColor for degradation. Test on iTerm2, GNOME Terminal, Windows Terminal, tmux.
New predicate type URL older versions will ignore. New policy fields default to false maintaining existing behavior.
ADdocdument NTP sync requirement. configurable grace period (default 5 min). Include approver timestamp in attestation.

Scope management High

Prioritize core TUI screens and core temporary approval functionality. Stretch goals attempted only if core completes early.

9. Communication Plan
- Weekly sync: 30-minute video call with mentors to review progress, discuss design decisions, and align on priorities.
- Async updates: Daily progress updates via GitHub issue comments or project Slack channel, including what was accomplished, what is planned next, and any blockers. - Code reviews: Submit PRs per deliverable or sub-deliverable. Design-level changes submitted as draft PRs early for feedback before full implementation. - Design discussions: For significant architectural decisions, write a brief design doc as a GitHub issue before implementation.

10. Why I Am a Good Fit
1. I primarily work in Go and enjoy building systems where I can understand what is happening under the hood. I am comfortable with type systems, interfaces, and error handling, and I try to write clean and maintainable code and I have an experience with 2.5 years approx in Golang.When I started exploring gittuf, I was able to read and understand the codebase without much friction, which helped me quickly move from reading to actually contributing.

2. Direct experience with Bubbletea and TUI development I have hands on experience building TUIs using Bubbletea and the Charm ecosystem. I understand the Model / Update / View architecture, state handling, and keyboard driven workflows.
Before even submitting this proposal, I built a working TUI POC for gittuf where I improved layout, added a status bar, help screen, empty states, and better visual structure. This shows I am not just proposing ideas, I have already started implementing them.

## Low (continued)

3. Real contributions to the project (not just theory) I opened PR 1232 in gittuf, where I added initial TUI tests using teatest and worked on making them deterministic and stable. I also contributed to RSTUF PR 935 which was merged by the maintainer. This shows I am already comfortable working in security focused open source projects and following contribution guidelines.
4. Understanding of Git internals and how gittuf uses them I understand how Git stores data, how refs work, and how objects are structured. This is important because gittuf stores policy and RSL data directly inside Git. Because of this, I am able to reason about how features like verification and policy enforcement actually work internally.
5. Clear understanding of TUF and security concepts I have read through the TUF specification and understand roles, delegations, threshold signatures, and metadata verification. I also completed the OpenSSF course "Securing Projects with OpenSSF Scorecard (LFEL1006)", which strengthens my understanding of supply chain security and best practices.

6. Active involvement in the community and genuine interest I regularly follow the project, attend community discussions, and stay active in the Slack channel. I also wrote a Blog explaining gittuf and why it is an important project, where I broke down the core idea and its impact in simple terms. This shows that I am not just coding, I am also trying to deeply understand and communicate the project.
7. Relevant practical experience through industry simulations I have completed multiple virtual job simulations including:
 J.P. Morgan (Investment Banking) Tata (AI-powered Data Analytics) Accenture and Deloitte (Data & analytics workflows) AWS (Solutions Architecture)

These helped me understand real world systems, data flows, and how engineering decisions impact production environments. This aligns well with my interest in DevOps and cloud computing, especially around reliability and system design.
8. Consistency and contribution mindset More than just technical skills, I have already invested time in this project before applying. I built a POC, contributed code, explored the codebase, and engaged with the community. My approach is simple: show up consistently, communicate early, and write code that maintainers can actually review and merge.

## Low (continued)

OpenSource Contributions:
In OpenSSF:

Project gittuf
gittuf

PR / Work PR 1232
POC Repo

RSTUF

PR 935

Community Slack +Meeting

Status Open Live
Merged
Active

Description
Adds TUI tests covering startup and quit behavior Status bar, borders, help screen, styled help bar, empty
states
SECURITY_INSIGHTS.yml following OpenSSF spec. Merged by [name removed].
Active in #gittuf channel, attended community
meeting,wrote Blog post

In Other Orgs:

Org Joplin Joplin
LFDT
LFDT LFDT

Pr/Work PR 148

Status Merged

PR 138

Merged

PR 165

Merged

PR 169

Approved

PR 168

Approved

Description
Adds improvements to plugin template setup and fixes minor configuration issues
Refactors template structure and updates documentation for better developer onboarding
Fixes CRLF issue in Postgres init script to ensure cross-platform compatibility
Improves configuration handling and minor fixes in service setup
Resolves script execution issues in database initialization flow

## Open

Cleans up configuration logic and improves stability of startup process

Adds enhancements to testing workflow and improves reliability of E2E tests

Fixes issues in test setup and improves test execution consistency

Refactors test logic and improves coverage for core networking components

Adds

research

contribution on

mainframe

modernization and

digital sovereignty

analysis

11. References
11. References
- gittuf Repository: https://github.com/gittuf/gittuf - gittuf Documentation: https://gittuf.dev/ - The Update Framework (TUF) Specification: https://theupdateframework.io/ - in-toto Attestation Framework: https://github.com/in-toto/attestation - DSSE (Dead Simple Signing Envelope): https://github.com/secure-systems-lab/dsse - Charm Bubbletea Framework: https://github.com/charmbracelet/bubbletea - Charm Lipgloss Styling: https://github.com/charmbracelet/lipgloss - Charm Bubbles Components: https://github.com/charmbracelet/bubbles - spf13/cobra CLI Framework: https://github.com/spf13/cobra - jonboulle/clockwork: https://github.com/jonboulle/clockwork - POC Repo:- [link removed] - PR #1232 (TUI tests): https://github.com/gittuf/gittuf/pull/1232 - RSTUF PR #935 (merged):
https://github.com/repository-service-tuf/repository-service-tuf/pull/935
