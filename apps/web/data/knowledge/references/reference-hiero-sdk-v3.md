---
id: reference-hiero-sdk-v3
title: Example LFX proposal / cover letter: Hiero SDK V3 multi-language PoC (LF Decentralized Trust)
kind: reference
tags: hiero, lfdt, sdk, typescript, python, go, api design, cover letter example, proposal example
sources: Reference proposal shared by the OpenSourceX owner (personal details removed)
---

## X

Hiero: Next-Generation SDK Architecture
SDK V3 - Multi-Language PoC & Roadmap
Building future-ready, developer-friendly SDK architecture for the Hiero ecosystem.
Mentor : [name removed] GitHub : hiero-ledger/sdk-collaboration-hub
Name and Contact Information

Name

:

GitHub :

Email

:

University :

College

:

Year

:

Loaction :

[name removed] [handle removed] [email removed] [name removed] [university] [university] 1st Year (2ndSemester) India (GMT+5:30)

How I Found this Project
I found the Hiero collaboration hub while browsing the Linux Foundation Decentralized Trust GitHub organization. When I found v3-sandbox/prototype-api/, the gap was clear: V2 SDKs were designed for a single Hedera network; V3 needs to work across arbitrary Hiero networks. Writing a language-agnostic meta-language first and then building per-language PoCs against it is the right approach. I started with guides/api-guideline.md, read the prototype-api files alongside the Java PoC, and started filing spec PRs. I noticed client.md was missing entirely - transactions references client.HieroClient throughout but no spec file existed. I drafted one in PR #230. From there I moved into building actual PoC implementations. This mentorship is a direct continuation of work i have already started .
Why I Want to Work on This
This project interests me because SDK V3 is not just about writing code. It is about designing APIs that can work across multiple languages while still feeling natural to developers in each language. At the time of my exploration, the Java PoC gave the clearest working reference, while TypeScript, Python, and Go still had important gaps to explore. That matters because open design questions stay theoretical until someone tries to implement them. I experienced this directly while working on the TypeScript PoC. For example, while exploring configuration and mirror node handling, I tested different approaches and documented the reasoning in PR discussions. This feedback loop is what makes the project exciting to me: design, implement, test, document, and improve.
Experience and Skills Applicable to This Program
I'm [name removed], a B.Tech CSE (AI & ML) student at [university]. I've been contributing to Hiero since early 2026: 12 PRs in sdk-collaboration-hub covering spec gaps, open question resolutions, and PoC implementations; 9 PRs in hiero-sdk-python with 6 merged, covering documentation, workflow maintenance, and code quality. I've already built a working TypeScript PoC covering keys, common, config, and client namespaces with 24 passing Vitest tests (PR #253), and opened the Python PoC for keys in PR #251.

## X (continued)

I know how @@immutable becomes readonly fields in TypeScript and @dataclass(frozen=True) in Python. I also learned that HbarUnit.GIGABAR tinybars exceeds 2^53 and JavaScript number silently loses precision. I hit that bug and switched to BigInt. For Go, I have studied the Harbor Satellite codebase, a CNCF Go project, and Jaeger UI in TypeScript/React. Both depend on the exact Go and TypeScript patterns this mentorship needs. The first two language deliverables are already partially in progress before the program begins.

3 PRs That Show I Can Do This

PR

What I Did

#230
docs(v3): define client namespace

transactions references client.HieroClient throughout but no client.md existed. I drafted the spec: HieroClient with @@immutable ledger and operatorAccount, getNetworkSetting(), and OperatorAccount with accountId and privateKey.

#247
docs(v3): resolve mir- ror node decision
#253
feat(v3):TypeScript PoC, 4 namespaces

config.md had an open question: unify or separate mirror node config? I built both options in the TypeScript PoC, found the unified approach worked because ConsensusCall/MirrorCall handle the separation at the request layer, and documented the resolution in [handle removed]'s open-question format.
Four-namespace TypeScript PoC: keys, common, config, client. PrivateKey/PublicKey Ed25519 and secp256k1, Hbar with bigint precision, HieroClient with OperatorAccount. PEM/DER round-trips. 24 passing tests.

Why It Matters
Mentorship explicitly lists client.md as a gap. Shows I can identify a missing spec and fill it in the correct metalanguage format, not just write prose.
Every prototype-api file has open questions blocking PoC decisions. Shows I can trace a spec ambiguity through a real implementation and produce a proper resolution.
Shows spec-to-code execution across a complete namespace set, not just one type. Building it exposed two real annotation decisions that feed directly into the Python and Go PoCs.

## X (continued)

Proof of Concept: TypeScript SDK V3 PoC
PR #253 implements a complete four-namespace TypeScript PoC with 24 Vitest tests. The PrivateKey factory uses Node.js crypto with no external dependencies:
// poc/v3-typescript/src/keys/PrivateKey.ts static generate(algorithm: KeyAlgorithm): PrivateKey {
if (algorithm === KeyAlgorithm.ED25519) { const { privateKey } = generateKeyPairSync("ed25519"); return new PrivateKey(privateKey, algorithm);
} const { privateKey } = generateKeyPairSync("ec", { namedCurve: "secp256k1" }); return new PrivateKey(privateKey, algorithm); }
Full-cycle test discipline : every key type must survive a generate, export, reimport, sign and verify before the PR opens.
// poc/v3-typescript/tests/keys/PrivateKey.test.ts it("ed25519: PEM export and reimport round-trip", () => {
const key = PrivateKey.generate(KeyAlgorithm.ED25519); const imported = PrivateKey.fromStringPEM(key.toStringPEM()); const msg = Buffer.from("round-trip"); expect(key.createPublicKey().verify(msg, imported.sign(msg))).toBe(true);G });
Two real decisions emerged building this. First: HbarUnit.GIGABAR tinybars is 100_000_000_000_000_000, exceeding 2^53 - number silently returned the wrong value by orders of magnitude, bigint fixed it. Second: @@immutable must be readonly fields on the class itself, not just a const binding the Java PoC uses final fields and readonly is the exact TypeScript equivalent.

## Contribution History in the Hiero Ecosystem

hiero-ledger/sdk-collaboration-hub

PR

Description

#230

docs(v3):define client namespace with Hiero Client and Opera-Open tor

#231 #241 #242
#244

docs(v3): add requests namespace architecture overview docs(v3): clarify MethodDescriptor portability in grpc names-pace docs(v3): resolve Ledger vs Network naming in common namespace docs(v3): document TransactionStatus to protobuf enum conversion

#245

docs(v3): define ContractCallResult in contract service spec

#246

docs(v3): fix conflicting Param factory method signatures

#247 #250

docs(v3): resolve mirror node inclusion decision in NetworkSetting feat(v3): TypeScript PoC for keys namespace

#251

feat(v3): Python PoC for keys namespace

#253

feat(v3): TypeScript PoC - keys, common, config, client (24 tests)

## Status Open Open Open

hiero-ledger/hiero-sdk-python #2163 chore: move bot PR auto draft workflow from archived to archive #2176 docs: add code_of_conduct for python sdk #2218 refactor: standardize GoodFirst Issue label usage #2220 chore: update spam list #2223 docs: fix broken markdown links #2226 chore: update spam list #2238 feat: add SLSA provenance attestations to publish workflow #2246 docs: add SDK error handling guide #2249 docs: add user-facing error handling guide to docs/sdk_users/

Merged
Merged Merged Merged Merged Merged Open Closed Open

sdk-collaboration-hub PRs are open/under review; hiero-sdk-python includes 6 merged PRs and additional open work.

Beyond Hiero, I've explored Harbor Satellite (CNCF, Go) and Jaeger UI (CNCF, TypeScript/React), studying their codebases and raising issues - Harbor Satellite uses the same unexported-field + getter pattern the Go PoC will need, and Jaeger UI uses the same strict TypeScript toolchain.
Problem i Want to Solve
The Hiero SDK V3 vision is clear: one meta-language spec, idiomatic implementations across TypeScript, Python, and Go. But four concrete gaps block progress today. The TypeScript PoC (PR #253) has 24 passing tests but no CI and no merged review every design decision inside it stays speculative until it does. The Python PoC covers only the keys namespace; common, config, and client are unimplemented and untested. The Go PoC does not exist at all the unexported-field-plus-getter pattern for @@immutable is theoretically sound but unproven against the actual spec. And there is no single entry point for new contributors: client.md lives only in PR #230, resolved open questions are buried in PR descriptions, and the roadmap referenced in issue #71 is unwritten. These four gaps follow a dependency order. TypeScript must merge first its review surfaces annotation decisions that Python and Go will inherit. Python comes next because @dataclass(frozen=True) is faster to validate than Go's struct patterns. Go follows, informed by both. The roadmap is written last, because a roadmap written before implementation is a guess, not a guide. When this mentorship ends, a new contributor should be able to clone the repo, read one file, run npm test / pytest / go test ./..., and understand exactly where V3 stands without asking the mentor.

## Status Open Open Open (continued)

Technical Plan
The goal is to map every SDK V3 annotation into patterns that feel native to each target language not just correct, but idiomatic. Annotation mapping:
 @@immutable readonly fields in TypeScript, @dataclass(frozen=True) in Python, unexported
fields with public getters in Go
 @@nullable T | undefined in TypeScript, Optional[T] in Python, (*T, error) return tuple in Go Static factories static generate() / fromStringPEM() in TypeScript, @staticmethod in Python,
package-level functions in Go
 Numeric precision bigint in TypeScript (JavaScript's number silently loses precision above
2^53, caught during the PoC), native int in Python, int64 / math/big in Go Implementation discipline:
 Every key type must pass a full generate export reimport sign verify cycle before any
PR opens Every @@immutable type must have a test confirming mutation is rejected at compile time or runtime CI workflow added alongside each PoC tests run on every push, not just locally Design decisions are recorded permanently: Every resolved open question is written back into the correct prototype-api/*.md file, not left buried in a PR description Where two approaches were valid, both are prototyped and the chosen one is justified with evidence as done in PR #247

## Phase 1 - TypeScript finalization (Weeks 1-4)

Address review feedback on PRs #247, #250, #253 and add GitHub Actions CI. The existing 24-test suite covers sign/verify, PEM/DER round-trips, AccountId checksum, and frozen NetworkSetting. CI workflow added alongside the PoC:

# poc/v3-typescript/.github/workflows/ci.yml name: CI on: [push, pull_request]

jobs:

test:

runs-on: ubuntu-latest

steps:

- uses: actions/checkout@v4

with: { node-version: '20' }

- run: npm ci && npm test

Milestone: TypeScript PoC merged, CI green, language choices confirmed with [handle removed].

Phase 2 - Python PoC: keys + common (Weeks 5-10)
Finalize PR #251 (keys), extend to full PEM/DER round-trips, add common namespace. @@immutable maps directly to frozen=True - attempted mutation raises FrozenInstanceError at runtime, matching the Java final field behavior:
# poc/v3-python/src/keys/private_key.py
@dataclass(frozen=True) class PrivateKey:
_raw: bytes algorithm: KeyAlgorithm
@staticmethod def generate(algorithm: KeyAlgorithm) -> "PrivateKey":
if algorithm == KeyAlgorithm.ED25519: sk = Ed25519PrivateKey.generate() return PrivateKey(sk.private_bytes(Raw, Raw, NoEncryption()), algorithm) sk = generate_private_key(SECP256K1()) return PrivateKey(sk.private_bytes(DER, EC, NoEncryption()), algorithm)
def sign(self, message: bytes) -> bytes: key = load_der_private_key(self._raw, password=None) return key.sign(message)

Tests: generate/sign/verify, PEM/DER round-trips, AccountId parsing, invalid input
handling, and frozen mutation behavior. Milestone: pytest tests pass locally and in CI.

Phase 3 - Go PoC: keys + common (Weeks 11-16)
Go module setup with Key, PrivateKey, PublicKey interfaces and KeyAlgorithm constants. Ed25519 via crypto/ed25519 (stdlib); ECDSA via github.com/decred/dcrd/dcrec/secp256k1/v4. @@immutable maps to unexported fields - nothing outside the package can set them:

## Phase 1 - TypeScript finalization (Weeks 1-4) (continued)

// poc/v3-go/keys/private_key.go

type PrivateKey struct {

raw

[]byte

algorithm KeyAlgorithm

}

func GeneratePrivateKey(algorithm KeyAlgorithm) (*PrivateKey, error) { switch algorithm { case ED25519: _, priv, err := ed25519.GenerateKey(rand.Reader) if err != nil { return nil, fmt.Errorf("generate ed25519: %w", err) } return &PrivateKey{raw: priv, algorithm: ED25519}, nil case SECP256K1: priv, err := secp256k1.GeneratePrivateKey() if err != nil { return nil, fmt.Errorf("generate secp256k1: %w", err) } return &PrivateKey{raw: priv.Serialize(), algorithm: SECP256K1}, nil } return nil, fmt.Errorf("unknown algorithm: %v", algorithm)
}

Table-driven tests for AccountId parsing will cover valid inputs, checksum-only inputs, shard/realm variants, and invalid inputs in a single test structure. I will also add the CI workflow, README -

updates, and keep the PR open for mentor review. Milestone: go test ./... passes locally and in CI.
Phase 4 - Roadmap + transactions stretch (Weeks 17-22)
YI owuirllpacraeagrteapvh3t-esxatndbox/ROADMAP.md with a namespace status table, language PoC status, open question resolutions from Phases 1-3, and a proposed order for transaction and SPT layer work. As a stretch goal, I will add a TypeScript TransactionBuilder generic skeleton to show the pattern without requiring a live network.raph text
// poc/v3-typescript/src/transactions/TransactionBuilder.ts abstract class TransactionBuilder<T extends TransactionBuilder<T>> { protected operator?: OperatorAccount; setOperator(op: OperatorAccount): T {
this.operator = op; return this as unknown as T;
} abstract build(): Transaction; async buildAndExecute(client: HieroClient): Promise<TransactionResponse> { if (!this.operator) throw new Error("operator required before execute"); return client.execute(this.build()); } }
Milestone: ROADMAP.md merged. All PoC PRs in final review round.
Phase 5 - Hardening (Weeks 23-24)
I will add CI badges to v3-sandbox/README.md for all three language PoCs. Each PoC README will include a clear "Getting Started" section so a new contributor can clone, install, and run npm test, pytest tests, or go test ./... without reading every spec file first. I will also do a final documentation pass across all three PoCs. Each public type should have a short comment explaining which SDK V3 annotation it implements and why the language-specific choice was made.

## Phase 1 - TypeScript finalization (Weeks 1-4) (continued)

Final sweep: I confirm that every open question resolved during the program is recorded in the correct format in the relevant prototype-api/*.md file, not just in PR descriptions that get harder to find over time. Update mentorship issue #71 with a structured summary of all resolved questions and namespace PoC status, so the next contributor has a single entry point.
Milestone: All deliverables merged. CI green on all three language PoCs. Issue #71 updated with final summary, and v3-sandbox/ usable by a new contributor without mentor guidance.
Timeline and Risk

Phase 1 - TypeScript finalization

Weeks 1-4

2 - Python PoC
3 - Go PoC 4 - Roadmap +
transacations 5 - Hardening
Total

5-10 11-16 17-22
23-24 24

## Tests 24

Deliverable PoC PRs merged, CI added
Python keys + common merged Go keys + common merged ROADMAP.mdmerged All PRs merged, issue #71 closed 3-language PoC + roadmap

Risk Spec ambiguity blocks PoC
Review cycle delays Go learning curve Exam conflicts (November)

Mitigation
Build both options (proven in PR #247), document resolution, never blocked
Keep PRs open in parallel; Phase 5 buffer absorbs one full review round
Harbor Satellite Go codebase studied; Java PoC study front loaded weeks 1-2
Flag exact dates to [handle removed] two weeks ahead; heavier work in Phases 2-3

Communication
I will keep communication clear, consistent, and transparent throughout the mentorship.
- I will share weekly progress updates on the mentorship issue or relevant GitHub discussions - I will discuss design decisions early before implementing larger changes - I will submit PRs in a clear and reviewable way, with proper context and testing notes - I will actively take mentor feedback and update my work quickly - I will use GitHub and the LF Decentralized Trust Discord, including relevant Hiero channels, for regular communication.
Availability
Timezone : IST, GMT+5:30 Commitment : 45 to 50 hours per week Availability : I am flexible with meeting times and can adjust based on my mentor's schedule.
Personal risk :
- Exams: No major conflicts expected; I'll notify my mentor atleast two weeks in advance and front-load work if needed
Focus Areas During the 24-Week Mentorship
During this 24-week mentorship, I want to focus on a few clear goals:
* Understand how a multi-language SDK is designed across TypeScript, Python, Go, and Java
* Learn how maintainers think about future-proof and non-breaking API design * Build useful SDK V3 PoCs that are simple to understand and easy to extend * Improve examples, documentation, and API guidelines for future contributors * Learn how to turn open design questions into clear decisions through mentor feedback * Contribute through small, reviewable PRs and active issue discussions

## Tests 24 (continued)

What I Hope To Get Out of This Mentorship
I want this mentorship to help me grow from a student contributor into a stronger open-source engineer who can understand real SDK architecture, make clean API decisions, and contribute work that other developers can actually use.
For me, Hiero SDK V3 is not only a coding task. It is about designing APIs that work across languages, building useful PoCs, improving documentation, and making the V3 sandbox easier for future contributors.
I want to use this mentorship to: * Build and improve SDK V3 PoCs across multiple languages * Make the V3 sandbox easier for the next contributor to understand * Improve documentation, examples, and API guidelines * Learn how maintainers think about long-term SDK design decisions * Get better at system design, testing, and developer-focused engineering * Keep contributing to Hiero SDK V3 even after the 24-week mentorship ends * Help new contributors understand the project faster through docs and examples
I have already started contributing to Hiero before applying, and I want to continue that momentum during and after the mentorship. My goal is not only to complete the planned work, but to leave SDK V3 in a better state than I found it.
What I expect from this mentorship is guidance, feedback, and real open-source learning. What I will bring is consistency, honest effort, fast learning, and full commitment to the Hiero SDK V3 journey.
[name removed] Email : [email removed] Github : github.com/[handle removed]
