import React, { useState, useEffect } from 'react';
import './App.scss';
import useIotp from './state/useIotp';
import useThingy, {
    SPEAKER_SIREN,
    ONESHOT_PURPLE,
    SOLID_PURPLE,
    SOLID_RED,
    UOM,
} from './state/useThingy';
import useInterval from './state/useInterval';

import NavBar from './components/NavBar';
import Button from 'carbon-components-react/lib/components/Button';

import DeviceIcon from '@carbon/icons-react/lib/devices/20';
import DisconnectedIcon from '@carbon/icons-react/lib/circle-dash/20';
import ConnectedIcon from '@carbon/icons-react/lib/checkmark--filled/20';
import LostConnectionIcon from '@carbon/icons-react/lib/bluetooth--off/20';

//const knownVersions = process.env.REACT_APP_KNOWN_NRF_VERSIONS.split('|');

const tileStyle = {
    height: 250,
    marginBottom: 16,
};

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
        dispatchSensorReading,
    } = useThingy();

    useEffect(() => {
        if (
            iotpStatus === 'DISCONNECTED' &&
            thingyStatus === 'CONNECTED' &&
            info.name &&
            info.token
        ) {
            const [authToken, type, org] = info.token.split(':');
            const iotpOpts = {
                org: org || process.env.REACT_APP_DEFAULT_IOTP_ORG,
                type: type || process.env.REACT_APP_DEFAULT_IOTP_TYPE,
                id: info.name,
                authToken: authToken,
            };
            connectIotp(iotpOpts);
        }
    }, [thingyStatus, iotpStatus, info, connectIotp]);

    useEffect(() => {
        // only runs when orientation changes, but happens immediately
        if (sensors.orientation === 5) {
            setError('maintenance required');
            writeLed(SOLID_RED);
        }
    }, [sensors.orientation, writeLed]);

    useInterval(() => {
        if (thingyStatus === 'CONNECTED' && iotpStatus === 'CONNECTED') {
            publish(sensors);
            const newPublishCount = publishCount + 1;
            setPublishCount(newPublishCount);
            if (
                newPublishCount % process.env.REACT_APP_IOTP_RESET_AFTER ===
                0
            ) {
                dispatchSensorReading({ type: 'RESET' }); // reset vibrations
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
            writeLed({ mode: 'off' });
        }
    }

    if (sensors.heading) {
        sensors.heading = parseFloat(sensors.heading.toFixed(1));
    }

    sensors.err = error ? 1 : 0;

    const btnText =
        thingyStatus === 'DISCONNECTED' && iotpStatus === 'DISCONNECTED'
            ? 'Connect'
            : thingyStatus === 'CONNECTED' && iotpStatus === 'CONNECTED'
            ? 'Disconnect'
            : thingyStatus === 'LOST-CONNECTION'
            ? 'Reconnect'
            : 'Connecting';

    const btnDisabled =
        ['CONNECTED', 'DISCONNECTED', 'LOST-CONNECTION'].includes(
            thingyStatus
        ) && ['CONNECTED', 'DISCONNECTED'].includes(iotpStatus)
            ? false
            : true;

    return (
        <div className="App">
            <NavBar
                iotpConnected={iotpStatus === 'CONNECTED'}
                thingyConnected={thingyStatus === 'CONNECTED'}
                onConnect={() => connectThingy(onThingyButton)}
                onDisconnect={() => window.location.reload()}
            />
            <div style={{ marginTop: 64, marginRight: 32 }}>
                <div style={{ float: 'right' }}>
                    <Button
                        onClick={
                            thingyStatus === 'DISCONNECTED' ||
                            iotpStatus === 'DISCONNECTED'
                                ? () => connectThingy(onThingyButton)
                                : () => window.location.reload()
                        }
                        iconDescription={btnText}
                        renderIcon={DeviceIcon}
                        disabled={btnDisabled}
                    >
                        {btnText}
                    </Button>
                </div>
            </div>
            <div className="bx--grid">
                <div className="bx--row">
                    <div className="bx--col-sm-1">Sensor:</div>
                    <div className="bx--col-sm-1" style={{ marginLeft: 16 }}>
                        {thingyStatus === 'CONNECTED' ? (
                            <ConnectedIcon style={{ fill: 'green' }} />
                        ) : thingyStatus === 'LOST-CONNECTION' ? (
                            <LostConnectionIcon style={{ fill: 'red' }} />
                        ) : (
                            <DisconnectedIcon />
                        )}
                    </div>
                </div>
                <div className="bx--row">
                    <div className="bx--col-sm-1">IoTP:</div>
                    <div className="bx--col-sm-1" style={{ marginLeft: 16 }}>
                        {iotpStatus === 'CONNECTED' ? (
                            <ConnectedIcon style={{ fill: 'green' }} />
                        ) : (
                            <DisconnectedIcon />
                        )}
                    </div>
                </div>
            </div>

            {window.location.search === '?edit' &&
                typeof info.name === 'string' && (
                    <div style={{ marginTop: 32 }}>
                        Name:{' '}
                        <input
                            value={info.name}
                            onChange={ev => setName(ev.target.value)}
                        />{' '}
                        <button onClick={writeName} disabled={!info.name}>
                            Write
                        </button>
                    </div>
                )}

            {window.location.search === '?edit' &&
                typeof info.token === 'string' && (
                    <div>
                        Token:{' '}
                        <input
                            value={info.token}
                            onChange={ev => setToken(ev.target.value)}
                        />{' '}
                        <button onClick={writeToken}>Write</button>
                    </div>
                )}

            {thingyStatus === 'CONNECTED' && (
                <div className="bx--grid" style={{ marginTop: 32 }}>
                    <div className="bx--row">
                        <div className="bx--col-sm-2">
                            <div className="bx--tile" style={tileStyle}>
                                <h3 style={{ fontWeight: 'bold' }}>
                                    Device Info
                                </h3>
                                <br />
                                <p>Device ID: {info.name}</p>
                                <br />
                                <p>Firmware: {info.firmware}</p>
                            </div>
                        </div>

                        <div className="bx--col-sm-2">
                            <div className="bx--tile" style={tileStyle}>
                                <h3 style={{ fontWeight: 'bold' }}>
                                    Environment
                                </h3>
                                <br />
                                <p>
                                    Temperature: {sensors.temperature}{' '}
                                    {UOM.temperature}
                                </p>
                                <br />
                                <p>
                                    Humidity: {sensors.humidity} {UOM.humidity}
                                </p>
                                <br />
                                <p>
                                    Pressure: {sensors.pressure} {UOM.pressure}
                                </p>
                                <br />
                                <p>
                                    CO2:{' '}
                                    {typeof sensors.co2 === 'number'
                                        ? `${sensors.co2} ${UOM.co2}`
                                        : 'calibrating'}
                                </p>
                                <br />
                                <p>
                                    VOC:{' '}
                                    {typeof sensors.voc === 'number'
                                        ? `${sensors.voc} ${UOM.voc}`
                                        : 'calibrating'}
                                </p>
                            </div>
                        </div>

                        <div className="bx--col-sm-2">
                            <div className="bx--tile" style={{...tileStyle, backgroundColor: sensors.vibration > 4 ? "red" : "green"}}>
                                <h3 style={{ fontWeight: 'bold' }}>
                                    Vibration
                                </h3>
                            </div>
                        </div>
                        {/* end of cards */}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;

/*

                    <div>
                        <h3 style={{ color: 'red' }}>{error}</h3>

                        <h3>Sensors</h3>
                        <pre>{JSON.stringify(sensors, null, 4)}</pre>
                    </div>

                            <pre>{JSON.stringify(info, null, 4)}</pre>
                            {info.firmware &&
                                !knownVersions.includes(info.firmware) && (
                                    <h4 style={{ color: 'red' }}>
                                        Unexpected NRFT Firmware (
                                        {info.firmware}), please upgrade your
                                        device to {knownVersions[0]}
                                    </h4>
                                )}

*/
