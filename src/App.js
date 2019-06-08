import React from "react";
import "./App.css";
import useThingy from "./state/useThingy";

function App() {
  const { connect, disconnect, status, sensors } = useThingy();

  return (
    <div className="App">
      <header className="App-header">
        <button onClick={connect} disabled={status !== "DISCONNECTED"}>
          Connect
        </button>
        <br />
        <button onClick={disconnect} disabled={status !== "CONNECTED"}>
          Disconnect
        </button>
        <br />
        <br />
        <br />
        {status}
      </header>
      <pre>{JSON.stringify(sensors,null,4)}</pre>
    </div>
  );
}

//const fixed = (n, p = 1) => (typeof n === 'number' ? n.toFixed(p) : "");

export default App;
