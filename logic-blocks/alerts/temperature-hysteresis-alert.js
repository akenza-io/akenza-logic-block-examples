// A hysteresis block that emits an action if the temperature is above a threshold
// it will only emit the action consecutively if the temperature falls below (threshold - hysteresis)

// usage examples: smart heating system
// For learning more about hysteresis refer to: https://www.youtube.com/watch?v=GYd6gmAnNn4&ab_channel=TexasInstruments

function consume(event) {
  const hysteresis = Number(event.properties.hysteresis) || 2;
  const threshold = Number(event.properties.threshold) || 20;
  const currentTemperature = Number(event.inputs.temperature);

  //initialize the state
  let state = event.state;
  if (state === undefined || state.thresholdActive === undefined) {
    state = { thresholdActive: true };
  }

  // check if the threshold is active and the temperature is above the threshold
  if (state.thresholdActive && currentTemperature > threshold) {
    state.thresholdActive = false;
    emit("action", {
      message: `temperature (${currentTemperature} °C) is above threshold (${threshold} °C)`,
    });
  } else if (currentTemperature < threshold - hysteresis) {
    // reactivate the threshold if the temperature falls below threshold - hysteresis
    state.thresholdActive = true;
  }

  emit("state", state);
}
