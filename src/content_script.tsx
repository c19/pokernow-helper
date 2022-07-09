var callback = function (mutationsList: any, observer: any) {
  for (var mutation of mutationsList) {

    // Skip non-element nodes
    if (
      !mutation.target.getAttribute
      || !mutation.target.getAttribute('class')
    ) { continue }

    var c = mutation.target.getAttribute('class');

    if (c.match(/decision\-current|flipped/)) {
      update();
    }
  }
}

let readyStateCheckInterval = setInterval(function () {
  if (document.readyState === "complete" && document.querySelector(".table")) {
    clearInterval(readyStateCheckInterval);

    let config = {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true
    };

    let observer = new MutationObserver(callback);

    let node = document.querySelector(".table")!;
    observer.observe(node, config);

    // setTimeout(function () { setup(); }, 1000);
  }
}, 10);

function setup() {
  var targetNode = document.querySelector(".table")!;
  const config = { characterData: true, attributes: true, childList: true, subtree: true };
  var callback = function (mutationsList: any, observer: any) {
    for (var mutation of mutationsList) {

      // Skip non-element nodes
      if (
        !mutation.target.getAttribute
        || !mutation.target.getAttribute('class')
      ) { continue }

      var c = mutation.target.getAttribute('class');

      if (c.match(/decision\-current|flipped/)) {
        update();
      }
    }
  }

  let observer = new MutationObserver(callback);
  // Start observing the target node for configured mutations
  observer.observe(targetNode, config);
  // window.observer: any = observer;

  get_wasm();
}

let board_length = -1;
let dealer_index = -1;

let [winrate, tierate] = [0, 0];

function inplay(player: HTMLElement) {
  let status = (player.querySelector(".table-player-status-icon") as HTMLElement)?.innerText;
  let message = (player.querySelector(".player-hand-message") as HTMLElement)?.innerText;
  return !(status?.includes("QUITTING") || status?.includes("AWAY") || message?.includes("AWAY"));
}

const SYMBOLS = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
} as Record<string, number>;
const SUITS = {
  'd': 0, 'c': 1, 'h': 2, 's': 3,
} as Record<string, number>;

let wasm_calc: Function;

function get_wasm() {
  if (wasm_calc) {
    return wasm_calc;
  }
  var importObject = {
    env: {
      now: function () {
        return new Date().getTime();
      },
    }
  };
  var wasmPath = chrome.runtime.getURL("poker-calc-wasm/poker_calc_wasm_bg.wasm");
  fetch(wasmPath).then(response =>
    response.arrayBuffer()
  ).then(bytes =>
    WebAssembly.instantiate(bytes, importObject)
  ).then(results => {
    const calc = results.instance.exports.calc as Function;
    wasm_calc = calc;
  });
  return wasm_calc;
}

function calc_winrate(hand: [string, string], board: string[], players: number) {
  let calc = get_wasm();
  const [c1, s1, c2, s2] = [SYMBOLS[hand[0][0]], SUITS[hand[0][1]], SYMBOLS[hand[1][0]], SUITS[hand[1][1]]];
  let [c3, s3, c4, s4, c5, s5, c6, s6, c7, s7] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (board.length >= 6) {
    c3 = SYMBOLS[board[0][0]];
    s3 = SUITS[board[0][1]];
    c4 = SYMBOLS[board[1][0]];
    s4 = SUITS[board[1][1]];
    c5 = SYMBOLS[board[2][0]];
    s5 = SUITS[board[2][1]];
  }
  if (board.length >= 8) {
    c6 = SYMBOLS[board[3][0]];
    s6 = SUITS[board[3][1]];
  }
  if (board.length == 10) {
    c7 = SYMBOLS[board[4][0]];
    s7 = SUITS[board[4][1]];
  }
  const result = calc(c1, s1, c2, s2, c3, s3, c4, s4, c5, s5, c6, s6, c7, s7, players, 1000000);
  console.log(result);
  return result;
}

function update() {
  // my current bet
  let my_current_bet = (document.querySelector(".you-player .table-player-bet-value .normal-value") as HTMLElement)?.innerText;
  let my_name = (document.querySelector(".you-player .table-player-name") as HTMLElement)?.innerText;

  let players = (Array.from(document.querySelectorAll(".table-player")) as HTMLElement[]).map(player => ({
    name: (player.querySelector(".table-player-name") as HTMLElement).innerText,
    chips: parseInt((player.querySelector(".table-player-stack") as HTMLElement).innerText),
    hand: (Array.from(player.querySelectorAll(".card-container")) as HTMLElement[])
      .map(card => `${(card.innerText || '').replace(/\n/g, "").slice(0, -1).replace("10", "T")}`),
    self: player.classList.contains("you-player"),
    inplay: inplay(player),
  })).filter(player => player.inplay);

  let self = players.filter(player => player.self)[0];
  let hand = self?.hand as [string, string];

  let board = (Array.from(document.querySelectorAll(".table-cards .card-container")) as HTMLElement[])
    .map(card => card.innerText.replace(/\n/g, "").replace("10", "T"));

  let pot = parseInt((document.querySelector(".table-pot-size .add-on .normal-value") as HTMLElement)?.innerText)

  let dealer_ = parseInt(((document.querySelector(".dealer-button-ctn") as HTMLElement)?.className?.match(/dealer-position-(\d+)/) || [])[1]);
  if (hand && (board_length != board.length || dealer_index != dealer_)) {
    board_length = board.length;
    dealer_index = dealer_;
    console.log(players, board);
    winrate = calc_winrate(hand, board, players.length);
    console.log(`${hand} on ${board} winrate ${winrate.toFixed(4)}`);
    let bet = winrate * pot / (1 - winrate)
    console.log(`suggested bet ${bet}`);
    // ev = winrate * (pot + bet) - bet
    // let ev = 0
    // bet = winrate * pot + winrate * bet
    // bet * (1 - winrate) = winrate * pot
    // bet = (winrate * pot) / (1 - winrate)
  }
  let bet = winrate * pot / (1 - winrate)
  console.log(`suggested bet ${bet}`);
}