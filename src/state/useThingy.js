import React, { createContext, useContext, useState, useReducer } from 'react';

import Thingy from 'thingy52_web_bluetooth';

import useInterval from './useInterval';

const DEBUG = !!parseInt(process.env.REACT_APP_DEBUG_NRF_CONNECTION);

export const nrfVersions = process.env.REACT_APP_KNOWN_NRF_VERSIONS.split('|');

const thingy = new Thingy({ logEnabled: DEBUG });

window.thingy = thingy;

const sensorServices = [
    'battery',
    'temperature',
    'humidity',
    'pressure',
    'gas',
    'heading',
    'gravityvector',
    'tap',
];

const defaultSensorValues = {
    // default sensor values... if any
};

const Ctx = createContext();

export const ThingyProvider = ({ children }) => {
    const [status, setStatus] = useState('DISCONNECTED');
    const [info, setInfo] = useReducer(
        (state, value) => ({ ...state, ...value }),
        {}
    );
    const [lastReading, setLastReading] = useState();
    const [sensors, dispatchSensorReading] = useReducer(sensorReducer, {
        ...defaultSensorValues,
    });

    async function connect(buttonListener) {
        setStatus('CONNECTING');
        if (await thingy.connect()) {
            // we have a thingy! set it up for use
            setStatus('INTEROGATION');

            ['name', 'firmware', 'cloudtoken'].forEach(serviceName => {
                thingy[serviceName].read().then(setInfo);
            });

            sensorServices.forEach(serviceName => {
                thingy.addEventListener(serviceName, dispatchSensorReading);
                thingy[serviceName].start();
            });

            thingy.addEventListener('button', buttonListener);
            thingy.button.start();

            // set up the speaker
            await thingy.soundconfiguration.write({ speakerMode: 3 });

            setStatus('CONNECTED');
        } else {
            setStatus('DISCONNECTED');
        }
    }

    async function setName(name) {
        setInfo({ name });
    }

    async function setToken(token) {
        setInfo({ token });
    }

    function sensorReducer(state, { type, detail }) {
        setLastReading(Date.now());
        switch (type) {
            case 'temperature':
            case 'humidity':
            case 'pressure':
                return {
                    ...state,
                    [type]: detail.value,
                };

            case 'gas':
                return {
                    ...state,
                    co2: detail.eCO2.value,
                    voc: detail.TVOC.value,
                };

            case 'battery':
                return {
                    ...state,
                    battery: detail.status,
                };

            case 'heading':
                return {
                    ...state,
                    heading: detail.heading,
                };

            case 'gravityvector':
                const { x, y, z } = detail.value;
                let orientation;
                if (z >= 9.7 && z <= 9.9) orientation = 0; // "BOTTOM";
                if (z >= -9.9 && z <= -9.7) orientation = 5; // "TOP";

                if (x >= 9.7 && x <= 9.9) orientation = 1; // "FRONT";
                if (x >= -9.9 && x <= -9.7) orientation = 2; //"BACK";

                if (y >= 9.7 && y <= 9.9) orientation = 3; // "RIGHT";
                if (y >= -9.9 && y <= -9.7) orientation = 4; //"LEFT";

                return {
                    ...state,
                    orientation,
                };

            case 'tap':
                return {
                    ...state,
                    vibration: (state.vibration || 0) + detail.count,
                };

            // Reset any readings that need to be reset after every IoT "Publish"
            case 'RESET':
                return { ...state, vibration: 0 };

            default:
                console.error(
                    `unhandled sensor event ${type}: ${JSON.stringify(detail)}`
                );
                return { ...state };
        }
    }

    function writeName() {
        return info.name && thingy.name.write(info.name);
    }
    function writeToken() {
        return thingy.cloudtoken.write(info.token);
    }
    function writeLed(led) {
        return thingy.led.write(led);
    }
    function writeSpeaker(sample) {
        return thingy.speakerdata.write(sample);
    }

    // check for a disconnected thingy...
    const heartbeatTimeout = parseInt(
        process.env.REACT_APP_NRF_HEARTBEAT_INTERVAL
    );

    useInterval(() => {
        if (lastReading && Date.now() - lastReading > heartbeatTimeout) {
            setStatus('LOST-CONNECTION');
            setLastReading();
        }
    }, parseInt(process.env.REACT_APP_NRF_HEARTBEAT_INTERVAL));

    return (
        <Ctx.Provider
            value={{
                thingy,
                status,
                connect,
                info,
                lastReading,
                sensors,
                setName,
                setToken,
                dispatchSensorReading,
                writeName,
                writeToken,
                writeLed,
                writeSpeaker,
            }}
        >
            {children}
        </Ctx.Provider>
    );
};

// consumer...
export default () => useContext(Ctx);

export const [
    ONESHOT_RED,
    ONESHOT_GREEN,
    ONESHOT_LIME,
    ONESHOT_BLUE,
    ONESHOT_PURPLE,
    ONESHOT_CYAN,
    ONESHOT_WHITE,
] = [1, 2, 3, 4, 5, 6, 7].map(color => ({
    mode: 'oneshot',
    color,
    intensity: 50,
}));

export const SOLID_RED = { mode: 'constant', red: 255, green: 0, blue: 0 };
export const SOLID_PURPLE = { mode: 'constant', red: 255, green: 0, blue: 255 };

export const [SPEAKER_DING, SPEAKER_BEEP, SPEAKER_SIREN] = [0, 1, 6].map(
    sample => ({ mode: 3, sample })
);

export const UOM = {
    temperature: '°C',
    humidity: '%',
    pressure: 'hPa',
    battery: '%',
    co2: 'ppm',
    voc: 'ppb',
    heading: '°',
    vibration: 'times',
    orientation: 'side (facing down)',
};
