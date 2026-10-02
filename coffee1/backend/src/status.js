const FLOWS = {
  pickup: ["new", "preparing", "ready", "completed"],
  ship: ["new", "preparing", "shipped"],
};
const TERMINAL = new Set(["completed", "shipped", "cancelled"]);

function nextStatuses(fulfilment, status) {
  if (TERMINAL.has(status)) return [];
  const flow = FLOWS[fulfilment];
  const i = flow.indexOf(status);
  const next = [];
  if (i >= 0 && i < flow.length - 1) next.push(flow[i + 1]);
  next.push("cancelled");
  return next;
}

const canTransition = (fulfilment, from, to) => nextStatuses(fulfilment, from).includes(to);

module.exports = { FLOWS, TERMINAL, nextStatuses, canTransition };
