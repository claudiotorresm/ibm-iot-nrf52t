import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { IotpProvider } from './state/useIotp';
import { ThingyProvider } from './state/useThingy';

import { detect } from 'detect-browser';

import './index.scss';

const { name: browserName, version: browserVersion, os: browserOS } = detect();

function allowedBrowser() {
    // chrome on Mac OS
    if (
        browserOS === 'Mac OS' &&
        browserName === 'chrome' &&
        parseFloat(browserVersion) > 74
    )
        return true;

    // chrome on Linux
    if (
        browserOS === 'Linux' &&
        browserName === 'chrome' &&
        parseFloat(browserVersion) > 74
    )
        return true;

    // chrome on Windows 10
    if (
        browserOS === 'Windows 10' &&
        browserName === 'chrome' &&
        parseFloat(browserVersion) > 74
    )
        return true;

    // chrome on Android
    if (browserOS === 'Android OS' && browserName === 'chrome') return true;

    // no matching browser found...
    return false;
}

ReactDOM.render(
    allowedBrowser() ? (
        <IotpProvider>
            <ThingyProvider>
                <App />
            </ThingyProvider>
        </IotpProvider>
    ) : (
        <div style={{ marginTop: 50, marginLeft: 50 }}>
            Sorry, "{browserName}" (${browserVersion}) on "{browserOS}" is an
            unsupported browser.
            <br />
            Your browsers doesn't appear to support{' '}
            <a href="https://github.com/WebBluetoothCG/web-bluetooth/blob/master/implementation-status.md">
                WebBlooth
            </a>
            .
            <br />
            <br />
            Please use a recent version of{' '}
            <a href="https://www.google.com/chrome/">Chrome</a> on MacOS /
            Windows10 / Linux / Android.
        </div>
    ),
    document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
