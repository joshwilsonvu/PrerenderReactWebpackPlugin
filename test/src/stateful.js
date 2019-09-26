import React, {useState, useCallback} from 'react';
import { hydrate } from "react-dom";
import { renderToString } from "react-dom/server";

const Counter = props => {
  const [count, setCount] = useState(0);
  const increment = useCallback(() => setCount(c => c + 1), []);

  return <button onClick={increment}>You have clicked me {count} {count === 1 ? "time" : "times" }.</button>
};

const App = () => (
  <div>
    <h3>Hello world!</h3>
    <Counter/>
  </div>
);

if (typeof document !== "undefined") {
  hydrate(<App />, document.getElementById("root"));
}

export default () => renderToString(<App />);
