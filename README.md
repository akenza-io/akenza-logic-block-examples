# akenza-logic-block-examples

Example scripts for [custom logic blocks](https://docs.akenza.io/device-management/rule-engine/logic-blocks/custom-logic/logic-block-scripting) in the akenza Rule Engine.

Custom logic blocks let you write your own rule logic in JavaScript, e.g. adaptive thresholds, hysteresis or aggregations over multiple devices.
Refer to the [akenza documentation](https://docs.akenza.io/) for more details.

## Examples

```
logic-blocks/
└── alerts/
    ├── simple-aggregation.js              Moving average of all numeric data points per device.
    ├── smart-temperature-alert.js         Temperature alert with an adaptive threshold.
    └── temperature-hysteresis-alert.js    Temperature alert with hysteresis.
```

### Simple aggregation

[`simple-aggregation.js`](logic-blocks/alerts/simple-aggregation.js) keeps an exponential moving average (EMA) of every numeric data point per device in the rule state and emits the averages of the device that sent the uplink. Data of different devices is never mixed.

| Type        | Name                | Description                                                                                       |
| ----------- | ------------------- | ------------------------------------------------------------------------------------------------- |
| Data source | any                 | One or more data sources (devices or tags). All numeric values of the triggering uplink are used. |
| Property    | `alpha`             | Optional, default `0.2`. Smoothing factor in `(0, 1]`, higher values follow new values faster.     |
| Property    | `maxDeviceAgeHours` | Optional, default `24`. Devices without an uplink for this time are removed and their averages reset. |
| Output      | topic `aggregation` | Averages of the current device per data point, e.g. `{ "temperature": 21.5, "co2": 400 }`.        |

### Smart temperature alert

[`smart-temperature-alert.js`](logic-blocks/alerts/smart-temperature-alert.js) computes a moving average of the temperature and triggers an alert if the temperature exceeds the average by 20%. The threshold starts at an initial value and converges to the moving average using exponential smoothing.

| Type     | Name               | Description                                            |
| -------- | ------------------ | ------------------------------------------------------ |
| Input    | `temperature`      | Temperature in °C.                                     |
| Property | `initialThreshold` | Optional, default `20`. Threshold before data arrives. |
| Output   | `message`          | Alert message with the temperature and threshold.      |

### Temperature hysteresis alert

[`temperature-hysteresis-alert.js`](logic-blocks/alerts/temperature-hysteresis-alert.js) triggers an alert if the temperature rises above a threshold. The alert is only triggered again once the temperature has dropped below `threshold - hysteresis`, which avoids repeated alerts when the value oscillates around the threshold (e.g. for a smart heating system).

| Type     | Name          | Description                                       |
| -------- | ------------- | ------------------------------------------------- |
| Input    | `temperature` | Temperature in °C.                                |
| Property | `threshold`   | Optional, default `20`. Alert threshold in °C.    |
| Property | `hysteresis`  | Optional, default `2`. Hysteresis in °C.          |
| Output   | `message`     | Alert message with the temperature and threshold. |

## Usage

1. Create a new custom logic block in your akenza organization.
2. Copy the script of an example into the editor.
3. Add the inputs and properties listed for the example.
4. Use the logic block in a rule, link the devices or tags as data sources and configure the actions.

## Writing a logic block

Every script implements a `consume(event)` function that is invoked on every uplink of a linked data source (or by a timer) and communicates with the Rule Engine via `emit`:

```js
function consume(event) {
  const temperature = event.inputs.temperature;
  const state = event.state || {};

  if (temperature > 30) {
    // trigger the actions of the rule
    emit("action", { message: `temperature is ${temperature} °C` });
  }

  // persist the state for the next invocation
  emit("state", state);
}
```

The most important fields of `event`:

| Field                 | Description                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| `type`                | `uplink` or `timer`.                                                         |
| `inputs`              | Values of the linked input variables.                                        |
| `properties`          | User-defined properties of the logic block.                                  |
| `state`               | Rule state persisted with `emit("state", ...)`.                              |
| `device`              | The device that sent the uplink.                                             |
| `dataSources`         | Data sources by number (`"1"`, `"2"`, ...), incl. `data` and `trigger` flag. |
| `numberOfInvocations` | Greater than `0` if the rule was re-invoked by its own action.               |

See the [logic block scripting documentation](https://docs.akenza.io/device-management/rule-engine/logic-blocks/custom-logic/logic-block-scripting) for all fields and emit types (e.g. `timer`).

## Development

```sh
npm install
npm run lint
```

The scripts are linted with [ESLint](https://eslint.org/) (see [`eslint.config.mjs`](eslint.config.mjs)).
