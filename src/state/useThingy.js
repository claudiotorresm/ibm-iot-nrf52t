import React, { createContext, useContext, useState, useReducer } from "react";
import Thingy from "thingy52_web_bluetooth";
import useInterval from "./useInterval";

export const [
  ONESHOT_RED,
  ONESHOT_GREEN,
  ONESHOT_LIME,
  ONESHOT_BLUE,
  ONESHOT_PURPLE,
  ONESHOT_CYAN,
  ONESHOT_WHITE
] = [1, 2, 3, 4, 5, 6, 7];

export const SPEAKER_DING = { mode: 3, sample: 0 };
export const SPEAKER_BEEP = { mode: 3, sample: 1 };
export const SPEAKER_SIREN = { mode: 3, sample: 6 };

export const UOM = {
  temperature: "°C",
  humidity: "%",
  pressure: "hPa",
  battery: "%",
  co2: "ppm",
  voc: "ppb",
  heading: "°",
  orientation: "side (facing down)"
};

const hbPulses = [
  { mode: "oneshot", color: ONESHOT_PURPLE, intensity: 10 },
  //{ mode: "oneshot", color: ONESHOT_CYAN, intensity: 10 },
  { mode: "off" }
];

const hbErrorPulse = { mode: "oneshot", color: ONESHOT_RED, intensity: 50 };

const disconnectPulse = {
  mode: "breathe",
  color: "blue",
  intensity: 30,
  delay: 1000
};

const Ctx = createContext();

export const ThingyProvider = ({ children }) => {
  const [thingy, setThingy] = useState();
  const [status, setStatus] = useState("DISCONNECTED");
  const [info, dispatchInfo] = useReducer(infoReducer, {});
  const [sensors, dispatchSensorReading] = useReducer(sensorReducer, { hb: 0 });
  const [heartBeat, setHeartBeat] = useState(0);
  const [ticks, setTicks] = useState(0);
  const [buttonPressed, setButtonPressed] = useState();
  const [error, setError] = useState();
  const [warning, setWarning] = useState();

  async function connect() {
    // create a new thingy
    const thingy = new Thingy({ logEnabled: true });

    setStatus("CONNECTING");
    if (await thingy.connect()) {
      // we have a thingy! set it up for use

      setStatus("INTEROGATION");

      dispatchInfo({ type: "serial", detail: { serial: thingy.device.id } });

      thingy.firmware.read().then(({ firmware }) => {
        const VERSIONS = process.env.REACT_APP_KNOWN_NRF_VERSIONS;
        const knownVersions = VERSIONS.split("|");
        if (!knownVersions.includes(firmware))
          setError(`Old NRFT Firmware, Please Upgrade to ${knownVersions[0]}`);

        dispatchInfo({
          type: "firmware",
          detail: { firmware }
        });
      });

      thingy.name.read().then(({ name }) =>
        dispatchInfo({
          type: "name",
          detail: { name }
        })
      );

      thingy.cloudtoken.read().then(({ token }) =>
        dispatchInfo({
          type: "token",
          detail: { token }
        })
      );

      [
        "battery",
        "temperature",
        "humidity",
        "pressure",
        "gas",
        "heading",
        "gravityvector"
      ].forEach(serviceName => {
        thingy.addEventListener(serviceName, dispatchSensorReading);
        thingy[serviceName].start();
      });

      thingy.addEventListener("tap", ({ detail }) => {
        // do something here!
        console.log(`Tap Detected: ${detail.direction} ${detail.count}`);
      });
      thingy.tap.start();

      thingy.addEventListener("button", ({ detail: { value } }) => {
        if (value) {
          // On Button Press
          setButtonPressed(true);
          setError();
          thingy.led.write({ mode: "constant", red: 255, green: 0, blue: 255 });
        } else {
          // On Button Release
          setButtonPressed();
          thingy.led.write({ mode: "off" });
        }
      });
      thingy.button.start();

      // set up the speaker
      await thingy.soundconfiguration.write({ speakerMode: 3 });
      setTimeout(() => {
        thingy.speakerdata.write(SPEAKER_DING);
      }, 100);

      setStatus("CONNECTED");
      setThingy(thingy);
    } else {
      setStatus("DISCONNECTED");
    }
  }

  async function disconnect() {
    setStatus("DISCONNECTING");
    await thingy.led.write(disconnectPulse); // restore LED state...
    await thingy.disconnect();
    setThingy();
    dispatchInfo({ type: "RESET" });
    dispatchSensorReading({ type: "RESET" });
    setHeartBeat(0);
    setTicks(0);
    setError();
    setWarning();
    setStatus("DISCONNECTED");
  }

  useInterval(() => {
    if (thingy) {
      // Health Check - Did we loose the thingy?
      if (heartBeat && heartBeat === sensors.hb) {
        console.warn("NRF52T has disconnected or moved out of range");
        return disconnect();
      }

      // force an error if the thingy is upsidedown
      if (sensors.orientation === 1) {
        setError("maintenance required");
        thingy.speakerdata.write(SPEAKER_SIREN);
      }

      // only update the LED if the user isn't pressing a button
      if (!buttonPressed) {
        thingy.led.write(
          error ? hbErrorPulse : hbPulses[ticks % hbPulses.length]
        );
      }

      // maintain connection state
      setTicks(ticks + 1);
      setHeartBeat(sensors.hb);
    }
  }, 1000);

  async function setName(name) {
    dispatchInfo({ type: "name", detail: { name } });
  }

  // writeName() - only write a non-empty name back to the thingy
  async function writeName() {
    return await (info.name && thingy.name.write(info.name));
  }

  async function setToken(token) {
    dispatchInfo({ type: "token", detail: { token } });
  }

  async function writeToken() {
    return await thingy.cloudtoken.write(info.token);
  }

  const value = {
    thingy,
    status,
    connect,
    disconnect,
    info,
    sensors,
    error,
    warning,
    setName,
    writeName,
    setToken,
    writeToken
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

function infoReducer(state, { type, detail }) {
  switch (type) {
    case "serial":
    case "name":
    case "firmware":
    case "token":
      // console.log(`"${type}": ${JSON.stringify(detail[type])}`);
      return { ...state, [type]: detail[type] };

    case "RESET":
      return {};

    default:
      console.error(`unhandled info "${type}": ${JSON.stringify(detail)}`);
      return { ...state };
  }
}

function sensorReducer(state, { type, detail }) {

  // console.warn(`${type}: ${JSON.stringify(detail)}`);

  const hb = state.hb + 1;
  switch (type) {
    case "temperature":
    case "humidity":
    case "pressure":
      return {
        ...state,
        hb,
        [type]: detail.value
      };

    case "gas":
      return {
        ...state,
        hb,
        co2: detail.eCO2.value,
        voc: detail.TVOC.value
      };

    case "battery":
      return {
        ...state,
        hb,
        battery: detail.status
      };

    case "heading":
      return {
        ...state,
        hb,
        heading: detail.heading
      };

    case "gravityvector":
      const { x, y, z } = detail.value;
      let orientation;
      if (z >= 9.7 && z <= 9.9) orientation = 0; // "BOTTOM";
      if (z >= -9.9 && z <= -9.7) orientation = 1; // "TOP";

      if (x >= 9.7 && x <= 9.9) orientation = 2; // "FRONT";
      if (x >= -9.9 && x <= -9.7) orientation = 3; //"BACK";

      if (y >= 9.7 && y <= 9.9) orientation = 4; // "RIGHT";
      if (y >= -9.9 && y <= -9.7) orientation = 5; //"LEFT";

      return {
        ...state,
        hb,
        orientation
      };

    case "RESET":
      return { hb: 0 };

    default:
      console.error(
        `unhandled sensor event ${type}: ${JSON.stringify(detail)}`
      );
      return { ...state };
  }
}

// consumer...
export default () => useContext(Ctx);
