// An example logic block that emits the action in a format which is ready to re-invoke the rule-engine again

// usage examples: aggregate/process the result(s) from the current script output in a different rule which is invoked after the current rule

function consume(event) {
  const temperature = event.inputs['temperature'];
  const humidity = event.inputs['humidity'];

  // do something with the data

  emit('action', {
    data: {
      temperature,
      humidity
    },
    // NOTE: the topic defined here will overwrite the one specified in the output-connector. this is optional
    topic: 'custom-topic'
  });
}
