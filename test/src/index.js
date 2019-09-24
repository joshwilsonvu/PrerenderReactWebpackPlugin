import React from "react";
import { render, hydrate } from "react-dom";
import { renderToString } from "react-dom/server";
import App from "./app";

if (typeof document !== "undefined") {
  hydrate(<App />, document.getElementById("root"));
} else {
  module.exports = () => renderToString(<App />);
}