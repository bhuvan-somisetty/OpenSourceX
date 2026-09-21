export default function Loading() {
  return (
    <div
      className="wrap"
      style={{ paddingTop: 40 }}
      aria-busy="true"
      aria-live="polite"
      data-testid="loading"
    >
      <div className="skel" style={{ width: 120 }} />
      <div className="skel" style={{ width: "60%", height: 34 }} />
      <div className="skel" style={{ width: "80%" }} />
      <div className="grid g3" style={{ marginTop: 24 }}>
        {[0, 1, 2].map((i) => (
          <div className="card" key={i}>
            <div className="skel" style={{ width: "70%" }} />
            <div className="skel" />
            <div className="skel" style={{ width: "85%" }} />
          </div>
        ))}
      </div>
      <span className="skip" style={{ position: "static", left: 0 }}>
        Loading…
      </span>
    </div>
  );
}
