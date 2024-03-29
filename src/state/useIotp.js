import React, { createContext, useContext, useState } from "react";

import Client from "ibmiotf";

const Ctx = createContext();

// Provider...
export function IotpProvider({ children }) {
  const [status, setStatus] = useState("DISCONNECTED");
  const [client, setClient] = useState();
  const [error, setError] = useState();

  async function connect({ org, type, id, authToken }) {
    return new Promise((resolve) => {
      setStatus("CONNECTING");

      const _client = new Client.IotfDevice({
        org,
        type,
        id,
        "auth-method": "token",
        "auth-token": authToken
      });

      setClient(_client); // first connection

      _client.on("connect", () => {
        setStatus("CONNECTED");
        setClient(_client); // first connection
        if (!client) {
          resolve(_client);
        }
      });

      _client.on("disconnect", () => {
        setStatus("DISCONNECTED");
      });

      _client.on("error", err => {
        setError(err);
        console.error(`IOTP: ${err.message} (${err.code})`);
        if (!client) {
          setStatus("NOT-AUTHORIZED");
          resolve(false); // we have failed to connect;
        }
      });

      _client.connect(); // attempt to connect!
    });
  }

  function disconnect() {
    client.disconnect();
    setClient();
    setStatus("DISCONNECTED");
  }

  function publish(data, eventName = "status") {
    client.publish(eventName, "json", JSON.stringify({ d: { ...data } }));
  }

  return (
    <Ctx.Provider
      value={{
        client,
        status,
        error,
        connect,
        disconnect,
        publish
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

// Consumer...
export default () => useContext(Ctx);
