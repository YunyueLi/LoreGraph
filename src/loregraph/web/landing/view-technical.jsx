// LoreGraph — Technical view
// Embeds Technical.html as iframe for in-app technical reference.

function ViewTechnical() {
  return (
    <div className="tech-wrap">
      {/* ?embed=1 drops the document's own masthead, wordmark and sign-off —
          inside the app shell they are a second set of the same things.
          Provenance and the full-page link live in the app's bar (see Topbar). */}
      <iframe src="Technical.html?embed=1" title="LoreGraph Technical Reference" />
    </div>
  );
}

window.ViewTechnical = ViewTechnical;
