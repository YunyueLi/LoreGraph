// LoreGraph — Technical view
// Embeds Technical.html as iframe for in-app technical reference.

function ViewTechnical({ ctx }) {
  const { tt } = ctx;
  return (
    <div className="tech-wrap">
      <div className="tech-overlay">
        <span>{tt("tech.overlay")}</span>
        <a href="Technical.html" target="_blank" rel="noopener">{tt("tech.openFull")}</a>
      </div>
      <iframe src="Technical.html" title="LoreGraph Technical Reference" />
    </div>
  );
}

window.ViewTechnical = ViewTechnical;
