import React from "react";
import "./App.css";
import useIotp from "./state/useIotp";
import useThingy from "./state/useThingy";

function App() {
  const { status: iotpStatus } = useIotp();

  const {
    connect,
    disconnect,
    status,
    sensors,
    info,
    setName,
    setToken,
    writeName,
    writeToken,
    error,
    warning,
  } = useThingy();

  const { hb, ..._sensors } = sensors;

  return (
    <div className="App" style={{marginLeft:50, marginTop: 50 }}>
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
        {error && <div style={{ color: "red" }}>{error}</div>}
        {warning && <div style={{ color: "brown" }}>Warning: {warning}</div>}
      </header>
      {typeof info.name === "string" && (
        <div>
          <input value={info.name} onChange={ev => setName(ev.target.value)} />
          <button onClick={writeName} disabled={!info.name}>
            Write
          </button>
        </div>
      )}
      {typeof info.token === "string" && (
        <div>
          <input value={info.token} onChange={ev => setToken(ev.target.value)} />
          <button onClick={writeToken}>
            Write
          </button>
        </div>
      )}
      <h3>Device Info</h3>
      <pre>{JSON.stringify(info, null, 4)}</pre>
      <h3>Sensors</h3>
      <pre>{JSON.stringify(_sensors, null, 4)}</pre>
      <br/>
      {iotpStatus}
    </div>
  );
}

//const fixed = (n, p = 1) => (typeof n === 'number' ? n.toFixed(p) : "");

export default App;
