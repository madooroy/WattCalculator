# Watt Calculator

A mobile-friendly cycling calculator. Enter any two of **average watts**, **time**, and **kilojoules**, and it works out the third. It also shows estimated calories, your power zone, Intensity Factor (IF) and Training Stress Score (TSS).

**Try it:** https://madooroy.github.io/WattCalculator/

## Features

- **Find Watts / Find kJ / Find Time**: solve for any one value from the other two
- **Calories**: estimated kcal burned (≈ 1 kcal per kJ of work)
- **Zone badges**: shows which power zone an effort falls in, with IF and TSS
- **FTP comparison**: optionally enter a second FTP to see how the same effort rates at a new fitness level
- **Power zones**: Coggan 7-zone model plus a Sweet Spot band, or your own custom zones; W/kg from your weight
- **Heart rate zones**: based on Max HR or Lactate Threshold HR, default or custom
- **Print or save zone tables as images**
- **Works offline**: once opened with a connection, it opens and runs with no signal
- Remembers your inputs on your device; works in light and dark mode

## Notes

IF and TSS are calculated from average power rather than Normalized Power, so they're most accurate for steady efforts such as trainer sessions or time trials.

## Files

- `index.html`: page structure
- `styles.css`: styling
- `app.js`: calculations and interactivity
- `sw.js`: offline support (saves the app's files on the device)
- `vendor/html2canvas.min.js`: image library for Save Image (MIT license), bundled so it works offline

## Releasing an update

After changing any file, change `VERSION` at the top of `sw.js` (for example to today's date). Phones then download the new version in the background and show an "Update available" note; it also takes effect the next time the app is opened.

## Why I built it

I simply had a question. Seeing a recent post about Remco Evenepoel's threshold power of 425 watts, I was curious as to what the output would be for a 60 minute ride. (Answer: 1,530 kJ.) One thing led to another and I decided to create the Watt Calculator.

Here's the post: https://www.bikeradar.com/news/remco-evenepoel-reveals-his-threshold-power
