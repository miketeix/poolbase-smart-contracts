/* **** Truffle exec script run using the command:
    truffle exec ./test/scripts/createToken.js
**** */

const Web3 = require("../../node_modules/web3");

//poolbase
const tokenArtifact = require("../../build/contracts/GustavoCoin.json");

module.exports = async function(callback) {
  const web3 = new Web3("http://localhost:8545");
  const [coinbaseAccount] = await web3.eth.getAccounts();

  const gustavoCoin = new web3.eth.Contract(tokenArtifact.abi, {
    from: coinbaseAccount, // default from address
    gasPrice: "20000000000", // default gas price in wei, 20 gwei in this case
    gas: "4712388"
  });

  let gustavoCoinInstance;
  try {
    gustavoCoinInstance = await gustavoCoin
      .deploy({
        data: tokenArtifact.bytecode
      })
      .send();
  } catch (err) {
    console.log("err", err);
  }

  console.log("Gustavo Coin Address: ", gustavoCoinInstance._address);

  const poolContractAddress = "0xf01d7f9cda7A8de96Cb07b9cC71A32eBB941e089"; // Insert pool contractAddress here
  const receipt = await gustavoCoinInstance.methods
    .mint(poolContractAddress, web3.utils.toWei("400"))
    .send();
  console.log("Minting receipt txHash: ", receipt.transactionHash);

  callback();
};
