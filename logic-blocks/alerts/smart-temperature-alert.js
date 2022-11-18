// A smart temperature monitoring rule that uses an adaptive threshold based
// on the moving average of the temperature.
// An alert is triggered if the temperature exceeds the adaptive threshold by 20%
//
// The threshold starts with an initial threshold and
// slowly converges (exponential smoothing) to the moving average as data arrives
// the convergence rate can be controlled by alpha (0 - 1)

function consume(event) {
  const alpha = 0.2;
  const initialThreshold = Number(event.properties.initialThreshold) || 20;
  const currentTemperature = Number(event.inputs.temperature);

  let state = event.state || {};
  let movingAverage = state.movingAverage || 0;
  let threshold = state.threshold || initialThreshold;

  let numberOfSamples = state.numberOfSamples || 0;

  //compute a moving average
  movingAverage =
    (currentTemperature + numberOfSamples * movingAverage) /
    (numberOfSamples + 1);

  // let's define the threshold by 20% above the average
  const currentThreshold = movingAverage * 1.2;

  // exponentially smooth the threshold in order to account
  // for the phase where not much data is present
  threshold = alpha * currentThreshold + (1 - alpha) * threshold;
  if (currentTemperature > threshold) {
    emit("action", {
      message: `temperature (${currentTemperature} °C) is above threshold (${threshold} °C)`,
    });
  }

  numberOfSamples += 1;
  state = { threshold, numberOfSamples, movingAverage };
  emit("state", state);
}
