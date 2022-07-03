chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  console.log(msg);
});

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
}

let board_length = -1;
let dealer_index = -1;

let [winrate, tierate] = [0, 0];

function update() {
  // my current bet
  let my_current_bet = (document.querySelector(".you-player .table-player-bet-value .normal-value") as HTMLElement)?.innerText;
  let my_name = (document.querySelector(".you-player .table-player-name") as HTMLElement)?.innerText;

  let players = Array.from(document.querySelectorAll(".table-player")).map(player => ({
    name: (player.querySelector(".table-player-name") as HTMLElement).innerText,
    chips: parseInt((player.querySelector(".table-player-stack") as HTMLElement).innerText),
    hand: (Array.from(player.querySelectorAll(".card-container")) as HTMLElement[])
      .map(card => `${(card.innerText || '').replace(/\n/g, "").slice(0, -1).replace("10", "T")}`),
    self: player.classList.contains("you-player"),
  }));

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
    chrome.runtime.sendMessage({ action: "calc_winrate", args: { hand, board, seats: players.length, limit: 500 } }, (res) => {
      console.log(res);
      [winrate, tierate] = res;
      console.log(`${hand} on ${board} winrate ${winrate.toFixed(4)} tierate ${tierate.toFixed(4)}`);
      let bet = winrate * pot / (1 - winrate)
      console.log(`suggested bet ${bet}`);
    })
    // const [winrate, tierate] = calc_winrate(hand, board, players.length);
    // ev = winrate * (pot + bet) - bet
    // let ev = 0
    // bet = winrate * pot + winrate * bet
    // bet * (1 - winrate) = winrate * pot
    // bet = (winrate * pot)/(1 - winrate)
  }
  let bet = winrate * pot / (1 - winrate)
  console.log(`suggested bet ${bet}`);
}