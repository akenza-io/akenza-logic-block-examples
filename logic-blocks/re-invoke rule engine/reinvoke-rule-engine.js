// An example logic block that emits the action in a format which is ready to re-invoke the rule-engine again

// usage examples: aggregate/process the result(s) from the current script output in a different rule which is invoked after the current rule

function consume(event) {
    const temperature = event.inputs['temperature'];
    const humidity = event.inputs['humidity'];

    // do something with the data, i.e. calculate the dew-point which can then be used in another rule to trigger an action
    const constA = 17.625;
    const constB = 243.04;
    // calculate numerator of Td equation
    const dewNumerator = constB * (Math.log(humidity / 100.0) + ((constA * temperature) / (temperature + constB)));
    // calculate denominator of Td equation
    const dewDenominator = constA - Math.log(humidity / 100.0) - ((constA * temperature) / (temperature + constB));
    // calculate the dew point
    let dewPoint = dewNumerator / dewDenominator;
    // round dew
    dewPoint = Math.round(dewPoint);

    emit('action', {
        // NOTE: the emitted action is expected to contain the data object which is used to re-invoke the rule-engine again
        // other properties can be added, but will not be present in the subsequent re-invocation
        data: {
            dewPoint
        },
        // NOTE: the topic defined here will overwrite the one specified in the output-connector. this is optional
        topic: 'custom_topic'
    });
}
