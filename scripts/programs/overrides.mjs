// Hand-checked links for organizations the automatic matching cannot resolve.
// Keyed by program, then org slug. Each GitHub account below was checked on 2026-10-15:
// the account's own display name and website field name the organization.
//   github: "<owner>" or "<owner>/<repo>" that the organization itself publishes
//   fields: values to set directly (website, repoUrl)
//   noGithubSearch: true when the organization has no GitHub presence

// Summer of Bitcoin's feed has no links, so each project is matched by hand to the repository
// whose own description is the project described on summerofbitcoin.org (checked 2026-10-15).
const sob = (repoUrl, website) => ({ noGithubSearch: true, fields: { repoUrl, ...(website ? { website } : {}) } });

export const OVERRIDES = {
  // Season of Docs organizations whose own sites give no usable logo (checked 2026-10-15)
  "season-of-docs": {
    // pymc-devs: "PyMC", https://www.pymc.io (pymc.io itself is rendered only by JavaScript)
    pymc3: { github: "pymc-devs" },
    // c3g: "C3G", https://www.computationalgenomics.ca/ — the centre that develops GenPipes
    genpipes: { github: "c3g", fields: { website: "https://computationalgenomics.ca/genpipes/" } },
    // ros2: "ROS 2", https://docs.ros.org
    ros2: { github: "ros2" },
    // folio-org: "FOLIO", https://dev.folio.org/
    folio: { github: "folio-org" },
    // wireshark: "Wireshark Foundation", https://wiresharkfoundation.org/
    wireshark: { github: "wireshark" },
    // 4ian/GDevelop's homepage field is https://gdevelop.io; its README opens with the "GDevelop logo" image
    gdevelop: { fields: { website: "https://gdevelop.io" } },
  },
  // MLH lists partner logos only. Accounts checked by their own display name and website.
  "mlh-fellowship": {
    // aws: "Amazon Web Services", https://amazon.com/aws (not the 2-repo "amazonwebservices")
    "amazon-web-services": { github: "aws", noGithubSearch: true, fields: { website: "https://aws.amazon.com/" } },
    // facebook: "Meta", https://opensource.fb.com
    meta: { github: "facebook", noGithubSearch: true, fields: { website: "https://opensource.fb.com" } },
    // mskcc: "Memorial Sloan Kettering", http://www.mskcc.org (the partner page's alt text is cut off)
    "memorial-sloan-ketterin": {
      github: "mskcc",
      noGithubSearch: true,
      fields: { slug: "memorial-sloan-kettering", name: "Memorial Sloan Kettering", website: "https://www.mskcc.org" },
    },
    // RBC: "Royal Bank of Canada", https://rbc.com
    "royal-bank-of-canada": { github: "RBC", noGithubSearch: true, fields: { website: "https://www.rbc.com" } },
    // solana-labs: "Solana Labs", https://solanalabs.com
    "solana-labs": { github: "solana-labs", noGithubSearch: true, fields: { name: "Solana Labs" } },
    // github: "GitHub", https://github.com/about
    github: { github: "github", noGithubSearch: true },
    // google: "Google", https://opensource.google/
    google: { github: "google", noGithubSearch: true },
    // G-Research: "G-Research", https://www.gresearch.com
    "g-research": { github: "G-Research", noGithubSearch: true },
  },
  // C4GT tickets name the organization; these accounts were checked by display name and website.
  c4gt: {
    egov: { github: "egovernments", fields: { name: "eGov Foundation", website: "https://egov.org.in" } },
    "if-me": { github: "ifmeorg/ifme", fields: { website: "https://www.if-me.org/" } },
    // MedPlat's DMP tickets are filed in ArgusoftOpen/medplat
    medplat: { github: "ArgusoftOpen/medplat" },
    "the-apprentice-project": { github: "theapprenticeproject", fields: { website: "https://theapprenticeproject.org" } },
    // Official sites (checked 2026-10-15). Logos are the ones each site declares for itself.
    armman: {
      noGithubSearch: true,
      fields: {
        website: "https://armman.org",
        // armman.org's declared apple-touch-icon (the site refuses non-browser requests)
        logoUrl: "https://armman.org/wp-content/uploads/2025/05/cropped-logo-1-180x180.png",
      },
    },
    haqdarshak: { noGithubSearch: true, fields: { website: "https://www.haqdarshak.com" } },
    protean: { noGithubSearch: true, fields: { name: "Protean", website: "https://www.proteantech.in" } },
    meity: { noGithubSearch: true, fields: { website: "https://www.meity.gov.in" } },
    // NHA-ABDM: display name "National Health Authority", website field https://nha.gov.in/
    // (nha.gov.in is drawn by JavaScript and declares no usable icon)
    "national-health-authority": {
      noGithubSearch: true,
      fields: { website: "https://nha.gov.in", logoUrl: "https://avatars.githubusercontent.com/NHA-ABDM?s=240" },
    },
    "iiit-delhi": {
      noGithubSearch: true,
      // the site icon iiitd.ac.in declares (its TLS chain fails Node's check)
      fields: { website: "https://www.iiitd.ac.in", logoUrl: "https://www.iiitd.ac.in/sites/default/files/style1coloricon_0.png" },
    },
    "nsut-in-collaboration-with-c4gt-seeta-and-aic": {
      noGithubSearch: true,
      fields: { website: "https://www.nsut.ac.in", logoUrl: "https://www.nsut.ac.in/sites/default/files/logo_nsut_0_0_0.png" },
    },
    // Haryana district administrations: their official sites carry the Government of Haryana emblem
    "adc-karnal": {
      noGithubSearch: true,
      fields: {
        website: "https://karnal.gov.in",
        logoUrl: "https://cdn.s3waas.gov.in/s3a01a0380ca3c61428c26a231f0e49a09/uploads/2026/10/17911857819948-e1791185909647.jpg",
      },
    },
    "adc-rohtak": {
      noGithubSearch: true,
      fields: {
        website: "https://rohtak.gov.in",
        logoUrl: "https://cdn.s3waas.gov.in/s37fe1f8abaad094e0b5cb1b01d712f708/uploads/2018/03/2018031997.jpg",
      },
    },
    "adc-mahendragarh": {
      noGithubSearch: true,
      fields: {
        website: "https://mahendragarh.gov.in",
        logoUrl: "https://cdn.s3waas.gov.in/s338913e1d6a7b94cb0f55994f679f5956/uploads/2018/05/2018052332.jpg",
      },
    },
    // CMC Ambala: an Ambala civic body in Haryana; ambala.gov.in carries the Government of Haryana emblem
    "cmc-ambala": {
      noGithubSearch: true,
      fields: { logoUrl: "https://cdn.s3waas.gov.in/s315d4e891d784977cacbfcbb00c48f133/uploads/2018/03/cropped-2018032778-180x180.png" },
    },
    // IDinsight: "IDinsight", https://idinsight.org
    idinsight: { github: "IDinsight", fields: { website: "https://idinsight.org" } },
    // OpenNyAI: "OpenNyAI", https://opennyai.org/
    opennyai: { github: "OpenNyAI", fields: { website: "https://opennyai.org/" } },
  },
  "summer-of-bitcoin": {
    asmap: sob("https://github.com/asmap", "https://asmap.org"),
    bdk: sob("https://github.com/bitcoindevkit/bdk", "https://bitcoindevkit.org"),
    "bitcoin-core": sob("https://github.com/bitcoin/bitcoin", "https://bitcoincore.org"),
    "bitcoin-design": sob("https://github.com/BitcoinDesign/Guide", "https://bitcoin.design"),
    "bitcoin-fuzz": sob("https://github.com/bitcoinfuzz/bitcoinfuzz"),
    braidpool: sob("https://github.com/braidpool/braidpool"),
    coinswap: sob("https://github.com/citadel-foss/openswap", "https://openswap.live/"),
    contextvm: sob("https://github.com/ContextVM", "https://docs.contextvm.org"),
    cove: sob("https://github.com/bitcoinppl/cove", "https://covebitcoin.com"),
    demand: sob("https://github.com/dmnd-pool"),
    fedimint: sob("https://github.com/fedimint/fedimint", "https://fedimint.org/"),
    floresta: sob("https://github.com/getfloresta/Floresta", "https://getfloresta.org"),
    flotilla: sob("https://github.com/coracle-social/flotilla", "https://flotilla.social"),
    formstr: sob("https://github.com/formstr-hq/nostr-forms", "https://formstr.app"),
    jam: sob("https://github.com/joinmarket-webui/jam", "https://joinmarket-webui.github.io/jamdocs"),
    kern: sob("https://github.com/odudex/Kern"),
    krux: sob("https://github.com/selfcustody/krux", "https://selfcustody.github.io/krux/"),
    "nostr-components": sob("https://github.com/saiy2k/nostr-components"),
    nostream: sob("https://github.com/cameri/nostream"),
    seedsigner: sob("https://github.com/SeedSigner/seedsigner", "https://seedsigner.com"),
    shopstr: sob("https://github.com/shopstr-eng/shopstr", "https://shopstr.market"),
    smite: sob("https://github.com/lnfuzz/smite"),
    "stable-channels": sob("https://github.com/toneloc/stable-channels"),
    strfry: sob("https://github.com/hoytech/strfry"),
    // VLS is developed on GitLab; the GitHub copy is a mirror
    vls: sob("https://gitlab.com/lightning-signer/validating-lightning-signer", "https://vls.tech"),
  },
  outreachy: {
    // apache: "The Apache Software Foundation", https://www.apache.org/
    asf: { github: "apache", fields: { website: "https://www.apache.org/" } },
    // FNNDSC: "FNNDSC / BCH", https://fnndsc.org (home of ChRIS)
    "chris-project": { github: "FNNDSC", fields: { website: "https://chrisproject.org/" } },
    // open-telemetry: "OpenTelemetry - CNCF", https://opentelemetry.io
    "cncf-opentelemetry": { github: "open-telemetry", fields: { website: "https://opentelemetry.io" } },
    // confidential-computing: "Confidential Computing Consortium", https://confidentialcomputing.io/
    "confidential-computing-consortium": {
      github: "confidential-computing",
      fields: { website: "https://confidentialcomputing.io/" },
    },
    // adoptium: "Eclipse Adoptium", https://adoptium.net
    "eclipse-adoptium": { github: "adoptium", fields: { website: "https://adoptium.net" } },
    // ersilia-os: "Ersilia Open Source Initiative", https://ersilia.io
    "ersilia-open-source-initiative": { github: "ersilia-os", fields: { website: "https://ersilia.io" } },
    // mozilla: "Mozilla", https://www.mozilla.org/
    firefox: { github: "mozilla", fields: { website: "https://www.mozilla.org/firefox/" } },
    // galaxyproject: "Galaxy Project", http://galaxyproject.org/
    "galaxy-community": { github: "galaxyproject", fields: { website: "https://galaxyproject.org/" } },
    // hotosm: "Humanitarian OpenStreetMap Team", http://www.hotosm.org
    "humanitarian-openstreetmap-team": { github: "hotosm", fields: { website: "https://www.hotosm.org" } },
    // The kernel's canonical tree is on git.kernel.org; GitHub only has a personal mirror.
    "linux-kernel": {
      noGithubSearch: true,
      fields: {
        website: "https://www.kernel.org/",
        repoUrl: "https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git",
      },
    },
    // metal3-io: "Metal³", https://metal3.io (not metal3-community, which has no website)
    metal3: { github: "metal3-io", fields: { website: "https://metal3.io" } },
    // OISF: "Open Information Security Foundation", https://www.oisf.net
    "open-information-security-foundation": { github: "OISF", fields: { website: "https://www.oisf.net" } },
    // Perl: "The Perl Programming Language", https://www.perl.org
    "perl-raku": { github: "Perl/perl5", fields: { website: "https://www.perl.org" } },
    // unicef: website https://unicef.github.io/
    "unicef-innovation": { github: "unicef", fields: { website: "https://www.unicef.org/innovation/" } },
    // pydata/xarray is the project's repository; https://xarray.dev links to it
    xarray: { github: "pydata/xarray", fields: { website: "https://xarray.dev" } },
    // yoctoproject: "The Yocto Project", https://www.yoctoproject.org/
    "yocto-project": { github: "yoctoproject", fields: { website: "https://www.yoctoproject.org/" } },
    // zarr-developers: "Zarr Developers", https://zarr.dev
    zarr: { github: "zarr-developers", fields: { website: "https://zarr.dev" } },
    // The accounts below were checked 2026-10-15: display name and website field name the community.
    bioconductor: { github: "Bioconductor", fields: { website: "https://bioconductor.org" } },
    bokeh: { github: "bokeh", fields: { website: "https://bokeh.org" } },
    "common-workflow-language": { github: "common-workflow-language", fields: { website: "https://www.commonwl.org" } },
    "conda-forge": { github: "conda-forge", fields: { website: "https://conda-forge.org" } },
    // eclipse-vertx: "Eclipse Vert.x" (no website field; vertx.io is the project site)
    "eclipse-vert-x": { github: "eclipse-vertx", fields: { website: "https://vertx.io" } },
    irdest: { github: "irdest", fields: { website: "https://irde.st" } },
    jupyterhub: { github: "jupyterhub", fields: { website: "https://jupyter.org/hub" } },
    kernelci: { github: "kernelci", fields: { website: "https://kernelci.org" } },
    "les-fruits-defendus": { github: "LesFruitsDefendus", fields: { website: "http://www.lesfruitsdefendus.org/" } },
    llvm: { github: "llvm", fields: { website: "https://llvm.org" } },
    mboalab: { github: "Mboalab", fields: { website: "https://www.mboalab.africa/" } },
    modeci: { github: "ModECI", fields: { website: "http://www.modeci.org" } },
    networkx: { github: "networkx", fields: { website: "https://networkx.org/" } },
    ocaml: { github: "ocaml", fields: { website: "https://ocaml.org" } },
    "odk-x": { github: "odk-x", fields: { website: "https://odk-x.org/" } },
    "open-life-science": { github: "open-life-science", fields: { website: "https://we-are-ols.org" } },
    // openstack: "Mirrors of opendev.org/openstack"; the code itself lives on opendev.org
    openstack: { github: "openstack", fields: { website: "https://www.openstack.org", repoUrl: "https://opendev.org/openstack" } },
    parsl: { github: "Parsl", fields: { website: "https://parsl-project.org" } },
    "scikit-image": { github: "scikit-image", fields: { website: "https://scikit-image.org" } },
    servo: { github: "servo", fields: { website: "https://servo.org" } },
    systemd: { github: "systemd", fields: { website: "https://systemd.io" } },
    "unstructured-studio": { github: "unstructuredstudio", fields: { website: "https://unstructured.studio" } },
    ushahidi: { github: "ushahidi", fields: { website: "https://www.ushahidi.com" } },
  },
};
