import React from "react";
import "./assets/styles.css";
import { hydrate } from "react-dom";
import { renderToString } from "react-dom/server";

const App = () => (
  <div>
    <h3>Hello world!</h3>
    <hr />
    <p>The background should be light blue.</p>
    <p className="bold">This text should be styled in bold.</p>
  </div>
);

if (typeof document !== "undefined") {
  hydrate(<App />, document.getElementById("root"));
}

export default () => renderToString(<App />);
