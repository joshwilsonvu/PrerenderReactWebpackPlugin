import React from "react";
import styled, {ServerStyleSheet} from "styled-components";
import {hydrate} from "react-dom";
import {renderToString} from "react-dom/server";

const Center = styled.div`
  text-align: center;
`;

const BoldAndBlue = styled.p`
  font-weight: bold;
  color: blue;
`;

const App = () => (
  <Center>
    <h3>Hello world!</h3>
    <hr/>
    <p>All of this should be centered.</p>
    <BoldAndBlue>This text should be bold and blue.</BoldAndBlue>
  </Center>
);


if (typeof window !== "undefined") {
  hydrate(<App/>, document.getElementById("root"));
}

export default () => {
  let sheet = new ServerStyleSheet();
  try {
    const content = renderToString(sheet.collectStyles(<App/>));
    const css = sheet.getStyleTags();
    return { content, css };
  } finally {
    sheet.seal();
  }
}