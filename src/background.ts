import { calc_winrate } from "poker-odds-calc";

chrome.runtime.onMessage.addListener(function (msg: any, sender, sendResponse) {
  console.log(msg);
  let action = msg.action;
  let args = msg.args as { hand: [string, string], board: string[], seats: number, limit?: number };

  const [winrate, tierate] = calc_winrate(args);
  sendResponse([winrate, tierate]);
});