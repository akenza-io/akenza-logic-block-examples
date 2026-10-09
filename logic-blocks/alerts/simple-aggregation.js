// Computes the exponential moving average (EMA) of each numeric data point per device.
//
// How it works:
// - On every uplink, the numeric values of the triggering data source(s) update the
//   EMA of the device that sent the uplink (ruleState.devices[deviceId].data[dataPoint]):
//     average = alpha * value + (1 - alpha) * previousAverage
//   The first value of a data point initializes its average.
// - alpha (0 - 1] controls how fast the average follows new values: a higher alpha
//   reacts faster, a lower alpha smooths more. With alpha = 0.2, a value's weight
//   drops below 10% after about 10 uplinks.
// - Non-numeric values (strings, booleans, objects, null, NaN) are ignored.
// - The averages of the current device are emitted as an action with the topic
//   "aggregation", e.g. { temperature: 21.5, co2: 400 }.
//   Data of other devices is never mixed into the averages of a device.
//
// How long are devices kept?
// - A device is removed from the state if it did not send an uplink for
//   `maxDeviceAgeHours` (logic block property, default 24 hours).
//   Its averages are then reset and start over with the next uplink.
// - The cleanup runs on every uplink, so stale devices are removed the next time
//   any device sends data.
//
// Properties:
// - alpha (optional, default 0.2): smoothing factor of the EMA, between 0 (exclusive) and 1
// - maxDeviceAgeHours (optional, default 24): retention time of a device in the state
//
// Example state:
// {
//   "devices": {
//     "<akenzaDeviceId>": {
//       "lastMessageTimestamp": "2026-10-09T12:00:00.000Z",
//       "data": { "temperature": 21.34, "humidity": 45.1 }
//     }
//   }
// }

const DEFAULT_ALPHA = 0.2;
const DEFAULT_MAX_DEVICE_AGE_HOURS = 24;
const DECIMALS = 2;

function consume(event) {
  const ruleState =
    event.state && event.state.devices ? event.state : { devices: {} };

  // only handle uplinks; numberOfInvocations > 0 means the rule was re-invoked
  // by its own action, which would otherwise count the same data twice
  if (event.type !== "uplink" || event.numberOfInvocations > 0) {
    emit("state", ruleState);
    return;
  }

  const now = Date.now();
  const properties = event.properties || {};
  const alpha = parseAlpha(properties.alpha);
  const maxDeviceAgeHours =
    Number(properties.maxDeviceAgeHours) || DEFAULT_MAX_DEVICE_AGE_HOURS;

  // remove inactive devices before updating the current one, so a device that
  // was inactive for too long starts with fresh averages
  removeStaleDevices(ruleState.devices, now, maxDeviceAgeHours * 3600 * 1000);

  // update the state of the device that sent the uplink
  const { id } = event.device;
  const device = ruleState.devices[id] || { data: {} };
  device.lastMessageTimestamp = new Date(now).toISOString();
  device.data = device.data || {};

  // only the data source(s) with trigger=true contain the data of this uplink,
  // the others contain the last stored sample of (possibly) another device
  let triggered = false;
  for (const dataSource of Object.values(event.dataSources || {})) {
    if (!dataSource.trigger) {
      continue;
    }
    triggered = true;
    for (const [key, value] of Object.entries(dataSource.data || {})) {
      if (isNumeric(value)) {
        const previous = device.data[key];
        // the averages are stored unrounded to avoid accumulating rounding errors
        device.data[key] = isNumeric(previous)
          ? alpha * value + (1 - alpha) * previous
          : value;
      }
    }
  }
  ruleState.devices[id] = device;

  if (triggered) {
    const data = round(device.data);
    if (Object.keys(data).length > 0) {
      emit("action", { topic: "aggregation", data });
    }
  }

  emit("state", ruleState);
}

// falls back to the default if alpha is missing or outside of (0, 1]
function parseAlpha(value) {
  const alpha = Number(value);
  return alpha > 0 && alpha <= 1 ? alpha : DEFAULT_ALPHA;
}

// removes devices whose last uplink is older than maxAgeMs (or has an invalid timestamp)
// to keep the state small and reset the averages of inactive devices
function removeStaleDevices(devices, now, maxAgeMs) {
  for (const [id, device] of Object.entries(devices)) {
    const lastMessageTimestamp = new Date(device.lastMessageTimestamp).getTime();
    if (isNaN(lastMessageTimestamp) || now - lastMessageTimestamp > maxAgeMs) {
      delete devices[id];
    }
  }
}

// rounds each numeric data point to DECIMALS decimal places
function round(data) {
  const factor = Math.pow(10, DECIMALS);
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (isNumeric(value)) {
      result[key] = Math.round(value * factor) / factor;
    }
  }
  return result;
}

function isNumeric(value) {
  return typeof value === "number" && Number.isFinite(value);
}
