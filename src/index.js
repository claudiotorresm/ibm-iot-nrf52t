import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { IotpProvider } from './state/useIotp';
import { ThingyProvider } from './state/useThingy';

import { detect } from 'detect-browser';

import './index.scss';

const { name, version, os } = detect();

ReactDOM.render(
    name === 'chrome' && os === 'Mac OS' ? (
        <IotpProvider>
            <ThingyProvider>
                <App />
            </ThingyProvider>
        </IotpProvider>
    ) : (
        <div style={{marginTop: 50, marginLeft: 50 }}>
            Sorry, "{name}" on "{os}" is an unsupported browser.
            <br />
            <br />
            <br />
            Please use a recent version of{' '}
            <a href="https://www.google.com/chrome/">Chrome</a>{' '} on MacOS.
        </div>
    ),
    document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
