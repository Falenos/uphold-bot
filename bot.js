require('dotenv').config();
const { readFileSync, writeFileSync } = require('fs');
const path = require('path');
const axios = require('axios');

const fetchPrices = async (base) => {
  let response;
  try {
    response = await axios.get(`${process.env.BASE_URL}/${base}`); // TODO optimize with path.join
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
  return response?.data;
}

const updateLogs = async (pairString) => {
  const logsFilePath = path.join(process.cwd(), 'local-bucket', `${pairString}.json`);
  const coins = pairString.split("-");
  const asset = coins[0];
  const base = coins[1];
  // Fetching current market prices
  const data = await fetchPrices(base);

  // TODO: check inconsistency between returned values
  const possiblePairStrings = [`${asset}-${base}`, `${asset}${base}`];

  // Finding and modifying our data entry
  const priceObj = (data || []).find((p) => possiblePairStrings.includes(p.pair)) || {};
  priceObj.dateTime = new Date().toUTCString();

  const logsBuffer = readFileSync(logsFilePath);
  const logs = JSON.parse(logsBuffer);
  logs.push(priceObj);
  writeFileSync(logsFilePath, JSON.stringify(logs, null, 2));

  return {
    pair: pairString,
    logs,
  };
}

const tick = ({ pairs, oscillation }) => {
  // TODO: spawn child process if needed
  Promise.allSettled(pairs.map(pairString => updateLogs(pairString))).then((results) => {
    console.clear();
    results.forEach(res => {
      console.table(res.value?.logs?.slice(-10).map((entry) => ({
        'Pair': res.value?.pair,
        'Ask Price': entry.ask,
        'Bid Price': entry.bid,
        'Date / Time': entry.dateTime,
      })));
    })
  })
};

const run = () => {
  const pairsArray = process.env.PAIRS ? process.env.PAIRS.split(",") : ['BTC-USD'];

  const config = {
    pairs: pairsArray,
    oscillation: process.env.OSCILLATION_MODIFIER || 0.0001,
  };

  // create/reset log files
  pairsArray.forEach((pairString) => {
    const logsFilePath = path.join(process.cwd(), 'local-bucket', `${pairString}.json`);
    writeFileSync(logsFilePath, JSON.stringify([], null, 2));
  })

  tick(config);
  const id = setInterval(tick, process.env.INTERVAL, config);

  // Stopping the process after 2 days
  setTimeout(() => {
    clearInterval(id);
    process.exit(1);
  }, 172800000)
};

run();