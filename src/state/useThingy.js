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
  { mode: "off" },
];

const hbErrorPulse = { mode: "oneshot", color: ONESHOT_RED, intensity: 50 };

const Ctx = createContext();

export const ThingyProvider = ({ children }) => {
  const [thingy, setThingy] = useState();
  const [status, setStatus] = useState("DISCONNECTED");
  const [sensors, handleSensorEvent] = useReducer(sensorReducer, { hb: 0 });
  const [heartBeat, setHeartBeat] = useState(0);
  const [ticks, setTicks] = useState(0);
  const [error, setError] = useState();
  const [buttonPressed, setButtonPressed] = useState();

  useInterval(() => {
    if (thingy) {
      if (heartBeat && heartBeat === sensors.hb) {
        console.warn("NRF52T has disconnected or moved out of range");
        return disconnect();
      }

      if (sensors.orientation === 1) {
        setError("maintenance required");
        thingy.speakerdata.write(SPEAKER_SIREN);
      }

      if (!buttonPressed) {
        thingy.led.write(
          error ? hbErrorPulse : hbPulses[ticks % hbPulses.length]
        );
      }
      setTicks(ticks + 1);
      setHeartBeat(sensors.hb);
    }
  }, 1000);

  async function connect() {
    // create a new thingy
    const thingy = new Thingy({ logEnabled: true });

    setStatus("CONNECTING");
    if (await thingy.connect()) {
      // we have a thingy! set it up for use

      [
        "temperature",
        "humidity",
        "pressure",
        "gas",
        "heading",
        "gravityvector"
      ].forEach(serviceName => {
        thingy.addEventListener(serviceName, handleSensorEvent);
        thingy[serviceName].start();
      });

      thingy.addEventListener(
        "gravityvector",
        ({
          detail: {
            value: { x, y, z }
          }
        }) => {
          // do something here...
        }
      );

      thingy.addEventListener("tap", ({ detail }) => {
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
    await thingy.disconnect();
    setThingy();
    handleSensorEvent({ type: "RESET" });
    setHeartBeat(0);
    setTicks(0);
    setStatus("DISCONNECTED");
  }

  const value = {
    thingy,
    status,
    connect,
    disconnect,
    sensors
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

function sensorReducer(state, { type, detail }) {
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
        heading: detail.status
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
