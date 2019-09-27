import React from "react";
import { hydrate } from "react-dom";
import { renderToString } from "react-dom/server";

const App = () => (
  <div>Hello world!</div>
);

if (typeof window !== "undefined") {
  hydrate(<App />, document.getElementById("root"));
}

export default () => renderToString(<App />);
