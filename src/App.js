import React, { useState } from 'react';

function App() {
  const [inputData, setInputData] = useState('');
  const [desiredProfit, setDesiredProfit] = useState(0);
  const [confidenceInterval, setConfidenceInterval] = useState(null);
  const [probability, setProbability] = useState(null);

  function erf(x) {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x >= 0 ? 1 : -1;
    const t = 1 / (1 + p * Math.abs(x));
    const y =
      1 -
      (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
    return sign * y;
  }

  const handleSubmit = (event) => {
    event.preventDefault(); // prevent default form submission behavior

    // parse the input data into an array of objects with "pnl" and "maxLoss" properties
    const trades = JSON.parse(inputData).map((trade) => ({
      pnl: Number(trade.pnl),
      maxLoss: Number(trade.draw)
    }));

    // calculate the sample average and standard deviation of the trade data
    const n = trades.length;
    const sampleAverage = trades.reduce((sum, trade) => sum + trade.pnl, 0) / n;
    const sampleStdDev = Math.sqrt(
      trades.reduce((sum, trade) => sum + Math.pow(trade.pnl - sampleAverage, 2), 0) /
      (n - 1)
    );

    // calculate the confidence interval using the bootstrap method
    const bootstrapAverages = [];
    const numBootstrapSamples = 1000000; // number of bootstrap samples to generate
    for (let i = 0; i < numBootstrapSamples; i++) {
      const sample = [];
      for (let j = 0; j < trades.length; j++) {
        let index = Math.floor(Math.random() * trades.length);
        // keep resampling if the trade results in a loss greater than the maximum potential loss
        console.log(trades[index].pnl,-trades[index].maxLoss)
        while (sample.length < trades.length && trades[index].pnl < -trades[index].maxLoss) {
          console.log(trades[index].pnl,-trades[index].maxLoss)
          index = Math.floor(Math.random() * trades.length);
        }
        sample.push(trades[index]);
      }
      const bootstrapAverage = sample.reduce((sum, trade) => sum + trade.pnl, 0) / sample.length;
      bootstrapAverages.push(bootstrapAverage);
    }
    const sortedBootstrapAverages = bootstrapAverages.sort((a, b) => a - b);
    const lowerBoundIndex = Math.floor((0.05 * numBootstrapSamples) / 2);
    const upperBoundIndex = numBootstrapSamples - 1 - lowerBoundIndex;
    const lowerBound = sampleAverage - sortedBootstrapAverages[lowerBoundIndex];
    const upperBound = sampleAverage - sortedBootstrapAverages[upperBoundIndex];

    // calculate the probability of achieving the desired profit per trade
    const zScore = (desiredProfit - sampleAverage) / sampleStdDev;
    const probability = 1 - Math.max(0, Math.min(1, 0.5 * (1 + erf(zScore / Math.sqrt(2))))); // using the erf function to approximate the cumulative distribution function of the standard normal distribution

    // set the confidence interval and probability state variables
    setConfidenceInterval([lowerBound, upperBound]);
    setProbability(probability);
  };

  return (
    <div className="App">
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="inputData">Trade Data:</label>
          <textarea
            id="inputData"
            name="inputData"
            rows="10"
            cols="50"
            value={inputData}
            onChange={(event) => setInputData(event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="desiredProfit">Desired Profit per Trade ($):</label>
          <input
            id="desiredProfit"
            name="desiredProfit"
            type="number"
            min="0"
            step="0.01"
            value={desiredProfit}
            onChange={(event) => setDesiredProfit(event.target.valueAsNumber)}
            required
          />
        </div>
        <button type="submit">Calculate</button>
      </form>
      {confidenceInterval && (
        <p>
          The 95% confidence interval for the average profit per trade is from {confidenceInterval[0].toFixed(2)} to {confidenceInterval[1].toFixed(2)}, indicating that we can be 95% confident that the true average profit per trade falls within this range."
        </p>
      )}
      {confidenceInterval && (
        <p>
          The probability of achieving a profit of at least {desiredProfit.toFixed(2)} per trade is {probability.toFixed(2)*100 + "%"}.
        </p>
      )}
    </div>
  );
}

export default App;
