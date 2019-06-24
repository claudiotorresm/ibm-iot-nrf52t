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
            Your browsers doesn't support WebBLE
            <br />
            <br />
            Please use a recent version of{' '}
            <a href="https://www.google.com/chrome/">Chrome</a> on MacOS.
        </div>
    ),
    document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
