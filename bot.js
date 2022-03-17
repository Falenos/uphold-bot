require('dotenv').config();
const { readFileSync, writeFileSync } = require('fs');
const path = require('path');
const axios = require('axios');

const calcPercentageDiffwithBase = (current, base) => 100 * ((current - base) / base);

const fetchPrices = async (base) => {
  let response;
  try {
    response = await axios.get(`${process.env.BASE_URL}/${base}`);
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

  // TODO: check format inconsistency of response's [pair] property.
  const possiblePairStrings = [`${asset}-${base}`, `${asset}${base}`];

  // Finding and modifying our data entry
  const priceObj = (data || []).find((p) => possiblePairStrings.includes(p.pair)) || {};
  priceObj.dateTime = new Date().toUTCString();

  // Updating log file
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
      const logs = res.value?.logs || [];
      console.log(res.value?.pair, 'TABLE::')

      console.table(logs.slice(-10).map((entry) => ({
        'Pair': res.value?.pair,
        'Ask Price': entry.ask,
        'Bid Price': entry.bid,
        'Date / Time': entry.dateTime,
      })));

      // This logic assumes that we need to compare each [new value], with the [first value] that we got when we started the process.
      const current = logs[logs.length -1]?.ask || 0;
      const base = logs[0]?.ask || 0;
      const diff = calcPercentageDiffwithBase(current, base); // this calc is extracted since it'a a utility function and can be reused. The rest are module related.
      const isDiffWorthMentioning = Math.abs(diff) > oscillation;
      const isDecraseWorthMentioning = isDiffWorthMentioning && (diff < 0);
      const isIncreaseWorthMentioning = isDiffWorthMentioning && (diff > 0);

      if (isDecraseWorthMentioning) {
        console.log();
        console.log('Price is down by', diff, '%. ', 'Current price is', current, '. Base price was ', base);
      } else if (isIncreaseWorthMentioning) {
        console.log();
        console.log('Price is up by', diff, '%. ', 'Current price is', current, '. Base price was ', base);
      }
      console.log("===============================================================================================================");
      console.log();
    })
  })
};

const run = () => {
  // setting defaults
  const pairsArray = process.env.PAIRS ? process.env.PAIRS.split(",") : ['BTC-USD'];
  const config = {
    pairs: pairsArray,
    oscillation: process.env.OSCILLATION_MODIFIER || 0.01,
  };

  // create/reset log files
  pairsArray.forEach((pairString) => {
    const logsFilePath = path.join(process.cwd(), 'local-bucket', `${pairString}.json`);
    writeFileSync(logsFilePath, JSON.stringify([], null, 2));
  })

  // init
  tick(config);
  const id = setInterval(tick, process.env.INTERVAL, config);

  // Stopping the process after 2 days (Memory leak if left alone)
  setTimeout(() => {
    clearInterval(id);
    process.exit(1);
  }, 172800000)
};

run();