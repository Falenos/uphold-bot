# Uphold Bot, script version

## Installation
Clone the repo and run

```bash
npm install
```

## Usage

### As node script
```bash
node bot
```

### With npm
```bash
npm run start
```

## Current Status
The script is handling by default two pairs `BTC/USD` & `ETH/USD` with oscillation `0.01%` with a `5sec` frequency of calls.
If the environment variables in .env file are removed, the only difference is that the code defaults only to `BTC/USD`.

### How it works
The script is requesting the latest prices for any pair supported by `uphold` api, in a period set in `.env` file. Default is 5sec.
Currently, in case any of these api calls fail, the whole process will fail and `exit`.
All the incoming values are `stored` in files automatically created (a rough file db approach).
All incoming values are compared to the `first value` we got when we started the process.
In case the difference is larger that the ocillation limit an alert will be displayed.
The relevant `equation` is the following:
```bash
calcPercentageDiff = (current, base) => 100 * ((current - base) / base);
```

### Output
### Pair price table
In your terminal you can see `1 table per pair` set in the `.env `file with the latest `10` values.

### Oscillation alert
In your terminal you can see `1 alert per pair` set in the `.env `file as long as the current price is up or down more than the ocillation threshhold, set also in the `.env `file.

## Limitations
we are limited to the pairs that uphold api supports of course.
Also the calculation equation is `very` specific.

## Features to come
* Unit tests
* More metrics
* Depending on the needs of users, each pair could be handled by a separate `child node process` that can crush while leaving the others running.
* Depending on the needs of users, some kind of `log files` size restrain is necessary since the files are `cleared when you restart the process` but keep getting larger (`memory leak alert`) as long as the process keeps running.

## License
[ISC](https://en.wikipedia.org/wiki/ISC_license)

## Support
Installator is supported on Node 14 / npm 3 and above.