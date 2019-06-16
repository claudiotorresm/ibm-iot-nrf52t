import React from 'react';

import {
    Header,
    HeaderMenuButton,
    // HeaderMenuItem,
    HeaderName,
    HeaderNavigation,
    HeaderGlobalBar,
    HeaderGlobalAction,
} from 'carbon-components-react/lib/components/UIShell';

//import UserIcon from '@carbon/icons-react/lib/user/16';
//import NotificationsIcon from '@carbon/icons-react/lib/notification--filled/20';
import DeviceIcon from '@carbon/icons-react/lib/devices/20';

const PLATFORM_PREFIX = process.env.REACT_APP_PLATFORM_PREFIX;
const PLATFORM_NAME = process.env.REACT_APP_PLATFORM_NAME;

const NavBar = ({
    thingyConnected,
    iotpConnected,
    onConnect,
    onDisconnect,
}) => {
    return (
        <Header aria-label="Navigation">
            <HeaderMenuButton aria-label="Open Main Menu" href="#" />
            <HeaderName href="#" prefix={PLATFORM_PREFIX}>
                {PLATFORM_NAME}
            </HeaderName>

            <HeaderNavigation
                aria-label={`${PLATFORM_PREFIX} ${PLATFORM_NAME}`}
            />

            <HeaderGlobalBar>
                {thingyConnected ? (
                    iotpConnected ? (
                        <HeaderGlobalAction
                            aria-label="Connect Your Device"
                            onClick={onDisconnect}
                        >
                            <DeviceIcon style={{ fill: 'green' }} />
                        </HeaderGlobalAction>
                    ) : (
                        <HeaderGlobalAction
                            aria-label="Connect Your Device"
                            onClick={onDisconnect}
                        >
                            <DeviceIcon style={{ fill: 'red' }} />
                        </HeaderGlobalAction>
                    )
                ) : (
                    <HeaderGlobalAction
                        aria-label="Connect Your Device"
                        onClick={onConnect}
                    >
                        <DeviceIcon />
                    </HeaderGlobalAction>
                )}
            </HeaderGlobalBar>
        </Header>
    );
};

export default NavBar;
