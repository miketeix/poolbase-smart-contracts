/* **** Truffle exec script run using the command:
    truffle exec ./scripts/addTokenBatch.js
**** */

const Web3 = require("web3");
// var fs = require("fs");
// var path = require("path");

//poolbase
const tokenArtifact = require("../build/contracts/GustavoCoin.json");

module.exports = async function(callback) {
  const web3 = new Web3("http://localhost:8545");
  const [coinbaseAccount] = await web3.eth.getAccounts();

  const gustavoCoinAddress = "0xFF6049B87215476aBf744eaA3a476cBAd46fB1cA";
  const gustavoCoinInstance = new web3.eth.Contract(
    tokenArtifact.abi,
    gustavoCoinAddress,
    {
      from: coinbaseAccount, // default from address
      gasPrice: "20000000000", // default gas price in wei, 20 gwei in this case
      gas: "4712388"
    }
  );

  console.log("Gustavo Coin Address: ", gustavoCoinInstance._address);

  const poolContractAddress = "0x771f9B190eFddC9Be7347d35f986A2DD25454Fe7"; // Insert pool contractAddress here
  const receipt = await gustavoCoinInstance.methods
    .mint(poolContractAddress, web3.utils.toWei("400"))
    .send();
  console.log("Minting receipt txHash: ", receipt.transactionHash);

  callback();
};
