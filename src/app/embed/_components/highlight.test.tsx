import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Highlight } from "./highlight";

describe("Highlight", () => {
  it("marks the match and keeps other text escaped", () => {
    const html = renderToStaticMarkup(<Highlight text="<script>yoga" words={["yoga"]} />);
    expect(html).toContain("&lt;script&gt;");
    expect(html).toMatch(/<mark[^>]*>yoga<\/mark>/);
  });
});
