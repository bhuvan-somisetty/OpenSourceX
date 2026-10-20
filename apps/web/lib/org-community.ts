/**
 * Where each LFX (CNCF) organization talks, and its main repository.
 *
 * Curated on 2026-10-15 from each project's own published material: the README or community
 * file named in `source`, or the CNCF Landscape (cncf/landscape, `extra.slack_url` /
 * `extra.chat_channel`). Nothing here is inferred: a channel is only named when the source
 * names it, and orgs whose sources list no chat have `chats: []`.
 */

export type ChatPlatform =
  "slack" | "discord" | "matrix" | "irc" | "zulip" | "gitter" | "telegram" | "forum" | "other";

export interface OrgChat {
  platform: ChatPlatform;
  /** Human name of the workspace or server, e.g. "CNCF Slack". */
  workspace: string;
  /** Invite or sign-up link for the workspace. */
  joinUrl: string;
  /** Channel names as the source writes them, e.g. ["#volcano"]. */
  channels?: string[];
  /** Direct link to the project's channel, when the source gives one. */
  channelUrl?: string;
}

export interface OrgCommunity {
  repoUrl: string | null;
  chats: OrgChat[];
  /** Where the chat details were taken from. */
  source: string | null;
}

const CNCF_JOIN = "https://slack.cncf.io";
const K8S_JOIN = "https://slack.k8s.io";
const LANDSCAPE = "https://github.com/cncf/landscape/blob/master/landscape.yml";

const gh = (repo: string) => `https://github.com/${repo}`;
const readme = (repo: string) => `${gh(repo)}#readme`;
const file = (repo: string, path: string) => `${gh(repo)}/blob/HEAD/${path}`;

const cncf = (channels?: string[], channelUrl?: string): OrgChat => ({
  platform: "slack",
  workspace: "CNCF Slack",
  joinUrl: CNCF_JOIN,
  channels,
  channelUrl,
});
const k8s = (channels?: string[], channelUrl?: string): OrgChat => ({
  platform: "slack",
  workspace: "Kubernetes Slack",
  joinUrl: K8S_JOIN,
  channels,
  channelUrl,
});
const slack = (
  workspace: string,
  joinUrl: string,
  channels?: string[],
  channelUrl?: string,
): OrgChat => ({
  platform: "slack",
  workspace,
  joinUrl,
  channels,
  channelUrl,
});
const discord = (workspace: string, joinUrl: string): OrgChat => ({
  platform: "discord",
  workspace,
  joinUrl,
});

const C = (repo: string, chats: OrgChat[], source = readme(repo)): OrgCommunity => ({
  repoUrl: gh(repo),
  chats,
  source,
});

export const ORG_COMMUNITY: Record<string, OrgCommunity> = {
  antrea: C("antrea-io/antrea", [
    k8s(["#antrea"], "https://kubernetes.slack.com/messages/CR2J23M0X"),
  ]),
  "apicurio-registry": C("Apicurio/apicurio-registry", [
    cncf(["#apicurio-registry"], "https://cloud-native.slack.com/archives/C0BDWTC1DTM"),
  ]),
  argo: C(
    "argoproj/argo-cd",
    [
      slack(
        "CNCF Slack",
        "https://argoproj.github.io/community/join-slack",
        ["#argo-contributors"],
        "https://cloud-native.slack.com/archives/C020XM04CUW",
      ),
    ],
    readme("argoproj/argoproj"),
  ),
  armada: C("armadaproject/armada", [
    cncf(["#armada"], "https://cloud-native.slack.com/archives/C03T9CBCEMC"),
  ]),
  cartography: C("cartography-cncf/cartography", [
    slack("CNCF Slack", "https://communityinviter.com/apps/cloud-native/cncf", ["#cartography"]),
  ]),
  carvel: C("carvel-dev/ytt", [
    slack("Kubernetes Slack", "https://slack.kubernetes.io/", ["#carvel"]),
  ]),
  "chaos-mesh": C("chaos-mesh/chaos-mesh", [cncf(["#project-chaos-mesh"])]),
  cilium: C("cilium/cilium", [slack("Cilium Slack", "https://slack.cilium.io")]),
  "cloud-native-buildpacks": C(
    "buildpacks/pack",
    [cncf(["#buildpacks-maintainers"])],
    readme("buildpacks/docs"),
  ),
  cloudnativepg: C(
    "cloudnative-pg/cloudnative-pg",
    [cncf(undefined, "https://cloud-native.slack.com/archives/C08MAUJ7NPM")],
    "https://cloudnative-pg.io/",
  ),
  "cluster-api-provider-gcp": C("kubernetes-sigs/cluster-api-provider-gcp", [
    k8s(["#cluster-api-gcp"]),
  ]),
  "cncf-landscape": C("cncf/landscape", []),
  "cncf-tag-contributor-strategy": C("cncf/tag-contributor-strategy", [
    cncf(["#tag-contributor-strategy"], "https://cloud-native.slack.com/archives/CT6CWS1JN"),
  ]),
  "cncf-tag-network": C("cncf/tag-network", [
    cncf(["#tag-network"], "https://app.slack.com/client/T08PSQ7BQ/CMG237Z5Z"),
  ]),
  copacetic: C("project-copacetic/copacetic", [
    cncf(["#copacetic"], "https://cloud-native.slack.com/archives/C071UU5QDKJ"),
  ]),
  coredns: C("coredns/coredns", [cncf(["#coredns"])]),
  cortex: C("cortexproject/cortex", [
    cncf(["#cortex"], "https://cloud-native.slack.com/messages/cortex/"),
  ]),
  "cri-o": C("cri-o/cri-o", [k8s(["#crio"], "https://kubernetes.slack.com/archives/crio")]),
  crossplane: C("crossplane/crossplane", [
    slack("Crossplane Slack", "https://slack.crossplane.io"),
  ]),
  devfile: C(
    "devfile/api",
    [k8s(["#devfile"], "https://kubernetes.slack.com/archives/C02SX9E5B55")],
    file("devfile/api", "CONTRIBUTING.md"),
  ),
  drasi: C(
    "drasi-project/drasi-platform",
    [discord("Drasi Discord", "https://aka.ms/drasidiscord")],
    file("drasi-project/.github", "profile/README.md"),
  ),
  "elekto-and-kubernetes-sig-contribex": C("elekto-io/elekto", [cncf(["#elekto"])]),
  envoy: C("envoyproxy/envoy", [slack("Envoy Slack", "https://www.envoyproxy.io/slack")]),
  "envoy-gateway": C("envoyproxy/gateway", [
    slack(
      "Envoy Slack",
      "https://www.envoyproxy.io/slack",
      undefined,
      "https://envoyproxy.slack.com/archives/C03E6NHLESV",
    ),
  ]),
  etcd: C("etcd-io/etcd", [
    slack(
      "Kubernetes Slack",
      "https://slack.kubernetes.io/",
      ["#sig-etcd"],
      "https://kubernetes.slack.com/archives/C3HD8ARJ5",
    ),
  ]),
  "flatcar-container-linux": C("flatcar/Flatcar", [
    discord("Flatcar Discord", "https://discord.gg/PMYjFUsJyq"),
    cncf(["#flatcar"], "https://cloud-native.slack.com/archives/C07LW8GQ4F9"),
    k8s(["#flatcar"], "https://kubernetes.slack.com/archives/C03GQ8B5XNJ"),
  ]),
  fluentd: C("fluent/fluentd", [slack("Fluentd Slack", "https://slack.fluentd.org")]),
  fluid: C("fluid-cloudnative/fluid", [cncf(["#fluid"])]),
  flux: C("fluxcd/flux2", [cncf(["#flux"])]),
  hami: C("Project-HAMi/HAMi", [
    discord("HAMi Discord", "https://discord.gg/Amhy7XmbNq"),
    cncf(["#hami-dev"], "https://cloud-native.slack.com/archives/C07T10BU4R2"),
  ]),
  harbor: C("goharbor/harbor", [
    cncf(["#harbor", "#harbor-dev"], "https://cloud-native.slack.com/messages/harbor/"),
  ]),
  headlamp: C("kubernetes-sigs/headlamp", [
    k8s(["#headlamp"], "https://kubernetes.slack.com/messages/headlamp"),
  ]),
  "in-toto": C(
    "in-toto/in-toto",
    [cncf(["#in-toto"], "https://cloud-native.slack.com/messages/in-toto")],
    LANDSCAPE,
  ),
  "inspektor-gadget": C("inspektor-gadget/inspektor-gadget", [
    k8s(["#inspektor-gadget"], "https://kubernetes.slack.com/messages/inspektor-gadget/"),
  ]),
  istio: C(
    "istio/istio",
    [slack("Istio Slack", "https://slack.istio.io/", ["#contributors"])],
    readme("istio/community"),
  ),
  jaeger: C("jaegertracing/jaeger", [
    cncf(["#jaeger"], "https://cloud-native.slack.com/archives/CGG7NFUJ3"),
  ]),
  k8sgpt: C("k8sgpt-ai/k8sgpt", [
    slack(
      "K8sGPT Slack",
      "https://join.slack.com/t/k8sgpt/shared_invite/zt-332vhyaxv-bfjJwHZLXWVCB3QaXafEYQ",
    ),
  ]),
  kagent: C("kagent-dev/kagent", [
    discord("kagent Discord", "https://discord.gg/Fu3k65f2k3"),
    cncf(["#kagent"], "https://cloud-native.slack.com/archives/C08ETST0076"),
  ]),
  karmada: C("karmada-io/karmada", [
    cncf(undefined, "https://cloud-native.slack.com/archives/C02MUF8QXUN"),
  ]),
  kcl: C(
    "kcl-lang/kcl",
    [cncf(undefined, "https://cloud-native.slack.com/archives/C05TC96NWN8")],
    readme("kcl-lang/community"),
  ),
  keptn: C("keptn/lifecycle-toolkit", [
    cncf(["#keptn"], "https://cloud-native.slack.com/messages/keptn/"),
  ]),
  kgateway: C(
    "kgateway-dev/kgateway",
    [
      cncf(
        ["#kgateway", "#kgateway-contributors"],
        "https://cloud-native.slack.com/archives/C080D3PJMS4",
      ),
    ],
    readme("kgateway-dev/community"),
  ),
  kmesh: C("kmesh-net/kmesh", [
    cncf(undefined, "https://cloud-native.slack.com/archives/C06BU2GB8NL"),
  ]),
  knative: C("knative/serving", [
    cncf(undefined, "https://cloud-native.slack.com/archives/C04LGHDR9K7"),
  ]),
  konveyor: C(
    "konveyor/operator",
    [k8s(["#konveyor"], "https://kubernetes.slack.com/archives/CR85S82A2")],
    readme("konveyor/community"),
  ),
  "konveyor-ai": C(
    "konveyor/kai",
    [k8s(["#konveyor"], "https://kubernetes.slack.com/archives/CR85S82A2")],
    readme("konveyor/community"),
  ),
  koordinator: C("koordinator-sh/koordinator", [
    slack(
      "Koordinator Slack",
      "https://join.slack.com/t/koordinator-sh/shared_invite/zt-1756qoub4-Cn4~esfdlfAPsD7cwO2NzA",
    ),
    k8s(["#koordinator"], "https://kubernetes.slack.com/channels/koordinator"),
  ]),
  krkn: C("krkn-chaos/krkn", [k8s(["#krkn"], "https://kubernetes.slack.com/messages/C05SFMHRWK1")]),
  kuadrant: C("kuadrant/kuadrant-operator", [
    k8s(["#kuadrant"], "https://kubernetes.slack.com/archives/C05J0D0V525"),
  ]),
  "kube-burner": C(
    "kube-burner/kube-burner",
    [k8s(["#kube-burner"], "https://kubernetes.slack.com/messages/kube-burner")],
    LANDSCAPE,
  ),
  "kube-state-metrics": C("kubernetes/kube-state-metrics", [
    k8s(["#kube-state-metrics"], "https://kubernetes.slack.com/archives/CJJ529RUY"),
  ]),
  kubearmor: C("kubearmor/kubearmor", [
    cncf(undefined, "https://cloud-native.slack.com/archives/C02R319HVL3"),
  ]),
  kubeedge: C(
    "kubeedge/kubeedge",
    [
      slack(
        "KubeEdge Slack",
        "https://kubeedge.io/docs/community/slack/",
        undefined,
        "https://kubeedge.slack.com/",
      ),
    ],
    file("kubeedge/kubeedge", "CONTRIBUTING.md"),
  ),
  kubeflow: C(
    "kubeflow/kubeflow",
    [cncf(undefined, "https://www.kubeflow.org/docs/about/community/#kubeflow-slack-channels")],
    LANDSCAPE,
  ),
  kubernetes: C(
    "kubernetes/kubernetes",
    [k8s(["#kubernetes-contributors"])],
    file("kubernetes/community", "communication/README.md"),
  ),
  kubescape: C("kubescape/kubescape", [
    cncf(undefined, "https://cloud-native.slack.com/archives/C04EY3ZF9GE"),
  ]),
  kubeslice: C("kubeslice/kubeslice", [k8s(["#kubeslice"])], LANDSCAPE),
  kubespray: C("kubernetes-sigs/kubespray", [k8s(["#kubespray"])]),
  kubestellar: C("kubestellar/kubestellar", [
    cncf(["#kubestellar-dev"], "https://cloud-native.slack.com/archives/C097094RZ3M"),
  ]),
  kubevela: C(
    "kubevela/kubevela",
    [cncf(undefined, "https://cloud-native.slack.com/archives/C01BLQ3HTJA")],
    readme("kubevela/community"),
  ),
  kubevirt: C("kubevirt/kubevirt", [k8s(["#virtualization"])]),
  kubewarden: C(
    "kubewarden/kubewarden-controller",
    [k8s(["#kubewarden", "#kubewarden-dev"], "https://kubernetes.slack.com/archives/kubewarden")],
    readme("kubewarden/community"),
  ),
  kuma: C("kumahq/kuma", [cncf(["#kuma"])]),
  kwok: C("kubernetes-sigs/kwok", [
    k8s(["#kwok", "#kwok-dev"], "https://kubernetes.slack.com/messages/kwok/"),
  ]),
  kyverno: C("kyverno/kyverno", [k8s(["#kyverno"])]),
  lima: C("lima-vm/lima", [cncf(["#lima"])]),
  linkerd: C("linkerd/linkerd2", [slack("Linkerd Slack", "https://slack.linkerd.io")]),
  litmuschaos: C("litmuschaos/litmus", [k8s(["#litmus"])]),
  meshery: C("meshery/meshery", [slack("Meshery Slack", "https://slack.meshery.io")]),
  microcks: C(
    "microcks/microcks",
    [discord("Microcks Discord", "https://microcks.io/discord-invite")],
    file("microcks/microcks", "CONTRIBUTING.md"),
  ),
  nats: C("nats-io/nats-server", [slack("NATS Slack", "https://slack.nats.io")]),
  notary: C("notaryproject/notation", [cncf(["#notary-project"])]),
  opa: C("open-policy-agent/opa", [
    slack("OPA Slack", "https://slack.openpolicyagent.org", ["#contributors", "#help"]),
  ]),
  "open-service-mesh": C("openservicemesh/osm", [
    cncf(["#openservicemesh"], "https://cloud-native.slack.com/archives/C018794NV1C"),
  ]),
  "open-service-mesh-kuma-and-service-mesh-interface": C("openservicemesh/osm", [
    cncf(["#openservicemesh"], "https://cloud-native.slack.com/archives/C018794NV1C"),
  ]),
  opencost: C("opencost/opencost", [
    cncf(["#opencost"], "https://cloud-native.slack.com/archives/C03D56FPD4G"),
  ]),
  openebs: C("openebs/openebs", [
    k8s(["#openebs", "#openebs-dev"], "https://kubernetes.slack.com/messages/openebs"),
  ]),
  openelb: C("openelb/openelb", [
    slack(
      "KubeSphere Slack",
      "https://join.slack.com/t/kubesphere/shared_invite/enQtNTE3MDIxNzUxNzQ0LTZkNTdkYWNiYTVkMTM5ZThhODY1MjAyZmVlYWEwZmQ3ODQ1NmM1MGVkNWEzZTRhNzk0MzM5MmY4NDc3ZWVhMjE",
    ),
  ]),
  openeverest: C("openeverest/openeverest", [
    cncf(undefined, "https://cloud-native.slack.com/archives/C09RRGZL2UX"),
  ]),
  openfunction: C("OpenFunction/OpenFunction", [
    cncf(undefined, "https://cloud-native.slack.com/archives/C03ETDMD3LZ"),
  ]),
  openkruise: C("openkruise/kruise", [
    k8s(["#openkruise"], "https://kubernetes.slack.com/channels/openkruise"),
  ]),
  opentelemetry: C("open-telemetry/community", [cncf()]),
  openyurt: C("openyurtio/openyurt", [
    slack(
      "OpenYurt Slack",
      "https://join.slack.com/t/openyurt/shared_invite/zt-2ajsy47br-jl~zjumRsCAE~BlPRRsIvg",
    ),
  ]),
  oras: C(
    "oras-project/oras",
    [cncf(["#oras"], "https://cloud-native.slack.com/archives/CJ1KHJM5Z")],
    readme("oras-project/community"),
  ),
  pipecd: C("pipe-cd/pipecd", [
    cncf(["#pipecd"], "https://cloud-native.slack.com/archives/C01B27F9T0X"),
  ]),
  pixie: C("pixie-io/pixie", [
    cncf(["#pixie"], "https://slack.cncf.io/app_redirect?channel=pixie"),
  ]),
  "podman-container-tools": C(
    "containers/podman",
    [
      {
        platform: "matrix",
        workspace: "Podman on Matrix",
        joinUrl: "https://podman.io/community/#slack-irc-matrix-and-discord",
        channels: ["#podman-dev:matrix.org"],
        channelUrl: "https://matrix.to/#/#podman-dev:matrix.org",
      },
    ],
    file("containers/podman", "CONTRIBUTING.md"),
  ),
  prometheus: C(
    "prometheus/prometheus",
    [
      {
        platform: "irc",
        workspace: "Libera.Chat IRC",
        joinUrl: "https://web.libera.chat/?channels=#prometheus-dev",
        channels: ["#prometheus-dev"],
      },
    ],
    file("prometheus/prometheus", "CONTRIBUTING.md"),
  ),
  racklet: C("racklet/racklet", [
    slack(
      "OSFW Slack",
      "https://slack.osfw.dev/",
      ["#racklet"],
      "https://osfw.slack.com/messages/racklet/",
    ),
  ]),
  rekor: C(
    "sigstore/rekor",
    [
      slack(
        "Sigstore Slack",
        "https://join.slack.com/t/sigstore/shared_invite/zt-47srvpyn6-j8Ek5hGBwKN32IjLw8BvYA",
      ),
    ],
    readme("sigstore/community"),
  ),
  "service-mesh-interface": C("servicemeshinterface/smi-spec", [
    cncf(["#smi"], "https://cloud-native.slack.com/messages/smi"),
  ]),
  "service-mesh-performance": C("service-mesh-performance/service-mesh-performance", [
    slack("Meshery Slack", "https://slack.meshery.io"),
  ]),
  "spiffe-spire": C("spiffe/spire", [slack("SPIFFE Slack", "https://slack.spiffe.io/")]),
  strimzi: C("strimzi/strimzi-kafka-operator", [
    cncf(["#strimzi", "#strimzi-dev"], "https://cloud-native.slack.com/archives/CMH3Q3SNP"),
  ]),
  testgrid: C("GoogleCloudPlatform/testgrid", []),
  thanos: C("thanos-io/thanos", [cncf(["#thanos"])]),
  tikv: C("tikv/tikv", [
    slack("TiKV Slack", "https://slack.tidb.io/invite?team=tikv-wg&channel=general"),
  ]),
  tremor: C(
    "tremor-rs/tremor-runtime",
    [discord("Tremor Discord", "https://discord.com/invite/Wjqu5H9rhQ")],
    readme("tremor-rs/tremor-www"),
  ),
  tuf: C("theupdateframework/python-tuf", [
    cncf(["#tuf"], "https://cloud-native.slack.com/archives/C8NMD3QJ3"),
  ]),
  urunc: C("urunc-dev/urunc", [
    cncf(undefined, "https://cloud-native.slack.com/archives/C08V201G35J"),
  ]),
  velero: C("velero-io/velero", [
    k8s(["#velero-users", "#velero-dev"], "https://kubernetes.slack.com/messages/velero-users"),
  ]),
  vitess: C("vitessio/vitess", [slack("Vitess Slack", "https://vitess.io/slack")]),
  volcano: C("volcano-sh/volcano", [
    cncf(["#volcano"], "https://cloud-native.slack.com/archives/C011GJDQS0N"),
  ]),
  wasmedge: C("WasmEdge/WasmEdge", [
    discord("WasmEdge Discord", "https://discord.gg/h4KDyB8XTt"),
    cncf(["#WasmEdge"]),
  ]),
};

export function orgCommunity(slug: string): OrgCommunity | null {
  return ORG_COMMUNITY[slug] ?? null;
}
