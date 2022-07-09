const fs = require('fs');

async function main() {
  // Read the wasm file.
  const buf = fs.readFileSync('./poker-calc-wasm/poker_calc_wasm_bg.wasm')

  var importObject = {
    env: {
      now: function () {
        return new Date().getTime();
      },
    }
  };

  // Create a WebAssembly instance from the wasm.
  const res = await WebAssembly.instantiate(buf, importObject)

  // Get the function to call.
  const { calc } = res.instance.exports

  // Call the function.
  const [c1, s1, c2, s2] = [10, 0, 14, 2];
  const [c3, s3, c4, s4, c5, s5, c6, s6, c7, s7] = [9, 1, 12, 1, 10, 1, 0, 0, 0, 0];
  const result = calc(c1, s1, c2, s2, c3, s3, c4, s4, c5, s5, c6, s6, c7, s7, 6, 100000);
  console.log(result);
}

main().then(() => console.log('Done'))