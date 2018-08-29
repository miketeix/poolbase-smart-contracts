const BigNumber = web3.BigNumber;
const leftPad = require("left-pad");

const should = require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

function isException(error) {
  let strError = error.toString();
  return (
    strError.includes("invalid opcode") ||
    strError.includes("invalid JUMP") ||
    strError.includes("revert")
  );
}

function ensuresException(error) {
  assert(isException(error), error.toString());
}

function ether(n) {
  return new web3.BigNumber(web3.toWei(n, "ether"));
}

function keccak256(...args) {
  args = args.map(arg => {
    if (typeof arg === "string") {
      if (arg.substring(0, 2) === "0x") {
        return arg.slice(2);
      } else {
        return web3.toHex(arg).slice(2);
      }
    }

    if (typeof arg === "number") {
      return leftPad(arg.toString(16), 64, 0);
    } else {
      return "";
    }
  });

  args = args.join("");

  return web3.sha3(args, { encoding: "hex" });
}

function getMethodId(methodName, ...paramTypes) {
  // methodId is a sha3 of the first 4 bytes after 0x of 'method(paramType1,...)'
  return web3.sha3(`${methodName}(${paramTypes.join(",")})`).substr(2, 8);
}

module.exports = {
  should,
  ensuresException,
  ether,
  keccak256,
  getMethodId
};
