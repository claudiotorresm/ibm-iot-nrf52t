import React, { useState, useEffect } from "react";
import "./App.css";
import useIotp from "./state/useIotp";
import useThingy, {
  SPEAKER_SIREN,
  ONESHOT_PURPLE,
  SOLID_PURPLE,
  SOLID_RED
} from "./state/useThingy";
import useInterval from "./state/useInterval";

const knownVersions = process.env.REACT_APP_KNOWN_NRF_VERSIONS.split("|");

function App() {
  const [error, setError] = useState();
  const { status: iotpStatus, connect: connectIotp, publish } = useIotp();
  const [publishCount, setPublishCount] = useState(0);
  const {
    status: thingyStatus,
    connect: connectThingy,
    sensors,
    info,
    setName,
    setToken,
    writeName,
    writeToken,
    writeLed,
    writeSpeaker,
    dispatchSensorReading
  } = useThingy();

  useEffect(() => {
    if (
      iotpStatus === "DISCONNECTED" &&
      thingyStatus === "CONNECTED" &&
      info.name &&
      info.token
    ) {
      const [authToken, type, org] = info.token.split(":");
      const iotpOpts = {
        org: org || process.env.REACT_APP_DEFAULT_IOTP_ORG,
        type: type || process.env.REACT_APP_DEFAULT_IOTP_TYPE,
        id: info.name,
        authToken: authToken
      };
      connectIotp(iotpOpts);
    }
  }, [thingyStatus, iotpStatus, info, connectIotp]);

  useEffect(() => {
    // only runs when orientation changes, but happens immediately
    if (sensors.orientation === 5) {
      setError("maintenance required");
      writeLed(SOLID_RED);
    }
  }, [sensors.orientation, writeLed]);

  useInterval(() => {
    if (thingyStatus === "CONNECTED" && iotpStatus === "CONNECTED") {
      publish(sensors);
      const newPublishCount = publishCount + 1;
      setPublishCount(newPublishCount);
      if (newPublishCount % process.env.REACT_APP_IOTP_RESET_AFTER === 0) {
        dispatchSensorReading({ type: "RESET" }); // reset vibrations
      }
      if (sensors.orientation === 5) {
        writeSpeaker(SPEAKER_SIREN);
      }
      if (!error) {
        writeLed(ONESHOT_PURPLE);
      }
    }
  }, process.env.REACT_APP_IOTP_PUBLISH_INTERVAL);

  function onThingyButton({ detail: { value } }) {
    if (value) {
      // On Button Press
      writeLed(SOLID_PURPLE);
    } else {
      // On Button Release
      setError(); // clear the error
      writeLed({ mode: "off" });
    }
  }

  if (sensors.heading) {
    sensors.heading = parseFloat(sensors.heading.toFixed(1));
  }

  sensors.err = error ? 1 : 0;

  return (
    <div className="App" style={{ marginLeft: 50, marginTop: 50 }}>
      <header className="App-header">
        {thingyStatus === "DISCONNECTED" && (
          <button onClick={() => connectThingy(onThingyButton)}>Connect</button>
        )}

        {thingyStatus === "CONNECTED" && (
          <button onClick={() => window.location.reload()}>Disconnect</button>
        )}

        {thingyStatus === "LOST-CONNECTION" && (
          <button onClick={() => window.location.reload()}>Reconnect</button>
        )}
        <br />
        <br />
        <span>NRF52T: {thingyStatus}</span>
        <br />
        <span>IoTP: {iotpStatus}</span>
      </header>

      {window.location.search === "?edit" && typeof info.name === "string" && (
        <div>
          Name:{" "}
          <input value={info.name} onChange={ev => setName(ev.target.value)} />{" "}
          <button onClick={writeName} disabled={!info.name}>
            Write
          </button>
        </div>
      )}

      {window.location.search === "?edit" && typeof info.token === "string" && (
        <div>
          Token:{" "}
          <input
            value={info.token}
            onChange={ev => setToken(ev.target.value)}
          />{" "}
          <button onClick={writeToken}>Write</button>
        </div>
      )}

      {thingyStatus === "CONNECTED" && (
        <div>
          <h3>Device Info</h3>
          <pre>{JSON.stringify(info, null, 4)}</pre>
          {info.firmware && !knownVersions.includes(info.firmware) && (
            <h4 style={{ color: "red" }}>
              Unexpected NRFT Firmware ({info.firmware}), please upgrade your
              device to {knownVersions[0]}
            </h4>
          )}
        </div>
      )}

      {thingyStatus === "CONNECTED" && (
        <div>
          <h3 style={{ color: "red" }}>{error}</h3>

          <h3>Sensors</h3>
          <pre>{JSON.stringify(sensors, null, 4)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;

/*
  useInterval(() => {
    if (status === "CONNECTED") {
      // Health Check - Did we loose the thingy?
      if (heartBeat && heartBeat === sensors.hb) {
        console.warn("NRF52T has disconnected or moved out of range");
        return setStatus("DISCONNECTED");
      }

      // force an error if the thingy is upsidedown
      if (sensors.orientation === 5) {
        setError("maintenance required");
        thingy.speakerdata.write(SPEAKER_SIREN);
      }

      // only update the LED if the user isn't pressing a button
      if (!buttonPressed) {
        thingy.led.write(
          error ? hbErrorPulse : hbPulses[ticks % hbPulses.length]
        );
      }

      if (client) {
        const { hb, ...data } = sensors;
        data.err = error ? 1 : 0;
        publish(data);
        dispatchSensorReading({ type: "RESET-TICK" });
      }

      // maintain connection state
      setTicks(ticks + 1);
      setHeartBeat(sensors.hb);
    }
  }, publishInterval);


*/
